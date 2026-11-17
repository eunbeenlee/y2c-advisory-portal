/* V88_33_0 · Dedicated offline invoice PDF renderer.
 * Reads an immutable, already-reconciled invoice snapshot. Never calls an API,
 * recomputes fees, interprets HTML strings or writes to the invoice register.
 * A4 pages are drawn separately on Canvas (2x) and packaged as JPEG PDF pages.
 * No third-party JS / CDN / server renderer. Native Print remains available.
 * Raster PDFs preserve glyphs but are not selectable-text / tagged PDFs.
 */
(function (root, factory) {
    'use strict';
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.Y2C_InvoicePDF = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';
    const WIDTH = 794, HEIGHT = 1123, M = 46, RIGHT = WIDTH - M, BOTTOM = 1040;
    const C = {ink:'#17263a', muted:'#526276', rule:'#dce3eb', soft:'#f4f6f9', red:'#c90016', white:'#ffffff'};
    function error(code, message) {
        const ko = {EXPORT_CONTENT:'문서 내용이 출력 한도를 초과했습니다. 내용을 줄이거나 인쇄를 이용해 주세요.',
            EXPORT_LAYOUT:'문서의 일부 내용이 너무 길어 안전하게 배치할 수 없습니다. 내용을 줄이거나 인쇄를 이용해 주세요.',
            EXPORT_DOCUMENT:'인보이스 필수 항목을 확인할 수 없습니다. 최신 자료로 다시 생성해 주세요.',
            EXPORT_PAGES:'문서 페이지 수가 출력 한도를 초과했습니다. 기간을 나누거나 인쇄를 이용해 주세요.',
            EXPORT_IMAGE:'PDF 페이지 이미지를 준비하지 못했습니다. 다시 시도하거나 인쇄를 이용해 주세요.',
            EXPORT_CANVAS:'이 브라우저에서 PDF 페이지를 만들지 못했습니다. 인쇄를 이용해 주세요.'};
        try { if(root.localStorage?.getItem('y2c_lang')==='ko') message=ko[code] || message; } catch (_) {}
        const e = new Error(message); e.code = code; return e;
    }
    function clean(value, max = 2400) {
        const s = String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
        if (s.length > max) throw error('EXPORT_CONTENT', 'Invoice text exceeds the safe export limit. Use Print or shorten the text.');
        return s;
    }
    function filename(value) {
        let s = String(value || 'invoice.pdf').normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '_').replace(/[. ]+$/g, '');
        s = s.replace(/\.pdf$/i, '').replace(/[. ]+$/g, '') || 'invoice';
        const enc = new TextEncoder(); let safe = '';
        for (const char of Array.from(s)) { if (enc.encode(safe + char).length > 180) break; safe += char; }
        safe = safe.replace(/[. ]+$/g, '') || 'invoice';
        if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = 'invoice_' + safe;
        return safe + '.pdf';
    }
    function snapshot(element) {
        if (!element || !element.querySelector) throw error('EXPORT_DOCUMENT', 'No invoice snapshot.');
        const text = (id, required = false) => {
            const el = element.querySelector('#' + id);
            // textContent does not preserve BR-separated addresses; innerText does on the attached snapshot.
            const value = clean(el ? (el.innerText || el.textContent) : '');
            if (required && !value) throw error('EXPORT_DOCUMENT', 'Missing invoice field: ' + id);
            return value;
        };
        const keys = ['docHqName','docHqRep','docHqAddress','docHqContact','docHqRegNo','docHqRepName',
            'docClientName','docClientAddress','docClientAttn','docClientBiz','docInvoiceNo','docIssueDate',
            'docBillingPeriod','docDueDate','valSubtotal','lblTaxType','valTaxAmount','valGrandTotal',
            'bankName','bankAccount','bankAccName','bankSwift','bankAddress','sigName','docPaymentTerms'];
        const data = Object.fromEntries(keys.map(k => [k, text(k, true)]));
        const visible = id => { const n = element.querySelector('#'+id); return n && !n.hidden ? text(id) : ''; };
        data.scope = visible('docScopeNote');
        data.memo = element.querySelector('#docMemoBlock')?.hidden === false ? text('docMemo') : '';
        data.rows = Array.from(element.querySelectorAll('#valInvoiceLines tr')).map(row => {
            const cells = Array.from(row.querySelectorAll('td')).map(cell => clean(cell.innerText || cell.textContent, 1200));
            if (cells.length !== 1 && cells.length !== 4) throw error('EXPORT_DOCUMENT', 'Invoice line is incomplete.');
            return cells;
        });
        if (!data.rows.length || data.rows.length > 100) throw error('EXPORT_DOCUMENT', 'Invalid invoice line count.');
        return data;
    }
    function wrap(ctx, text, width) {
        if (!Number.isFinite(width) || width <= 0) throw error('EXPORT_LAYOUT', 'Invalid text width.');
        const lines = [];
        for (const paragraph of String(text).split('\n')) {
            // Word wrapping with a code-point fallback for long IDs and CJK text; never truncate.
            if (!paragraph) { lines.push(''); continue; }
            let line = '';
            for (const word of paragraph.match(/\S+\s*|\s+/gu) || []) {
                if (ctx.measureText(line + word).width <= width) { line += word; continue; }
                if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
                for (const char of Array.from(word)) {
                    if (line && ctx.measureText(line + char).width > width) { lines.push(line.trimEnd()); line = ''; }
                    line += char;
                }
            }
            if (line || !lines.length) lines.push(line.trimEnd());
        }
        return lines;
    }
    // Minimal PDF 1.4 serialization. All offsets/stream lengths are byte counts.
    // Only fixed PDF syntax and JPEG bytes enter the output, never interpolated user text.
    function encodePDF(pages) {
        if (!Array.isArray(pages) || pages.length < 1 || pages.length > 32) throw error('EXPORT_PAGES', 'Invalid PDF page count.');
        const enc = new TextEncoder(), chunks = [], offsets = [0]; let size = 0;
        const put = bytes => { const b = typeof bytes === 'string' ? enc.encode(bytes) : bytes; chunks.push(b); size += b.length; };
        const obj = (id, body) => { offsets[id] = size; put(id+' 0 obj\n'); put(body); put('\nendobj\n'); };
        const stream = (id, dict, bytes) => { offsets[id] = size; put(id+' 0 obj\n<< '+dict+' /Length '+bytes.length+' >>\nstream\n'); put(bytes); put('\nendstream\nendobj\n'); };
        put('%PDF-1.4\n%'); put(new Uint8Array([0xe2,0xe3,0xcf,0xd3])); put('\n');
        obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
        obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
        pages.forEach((page,i) => {
            if (!(page.bytes instanceof Uint8Array) || page.bytes.length < 4 || page.bytes[0] !== 255 || page.bytes[1] !== 216 || page.bytes[page.bytes.length-2] !== 255 || page.bytes[page.bytes.length-1] !== 217 || !Number.isInteger(page.width) || !Number.isInteger(page.height) || page.width < 1 || page.height < 1 || page.width > 4096 || page.height > 4096) throw error('EXPORT_IMAGE', 'Invalid page image.');
            const id = 3+i*3;
            obj(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /PageImage '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
            stream(id+1,'/Type /XObject /Subtype /Image /Width '+page.width+' /Height '+page.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',page.bytes);
            stream(id+2,'',enc.encode('q\n595.276 0 0 841.89 0 0 cm\n/PageImage Do\nQ'));
        });
        const xref = size, count = 3+pages.length*3;
        put('xref\n0 '+count+'\n0000000000 65535 f \n');
        for (let i=1;i<count;i++) put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
        put('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
        const output = new Uint8Array(size); let at = 0;
        for (const b of chunks) { output.set(b,at); at += b.length; }
        return output;
    }
    async function render(element, options = {}) {
        const data = snapshot(element), current = options.check || (()=>{}), pages = [];
        let canvas, ctx, y;
        const font = (size=12, weight=400) => { ctx.font = weight+' '+size+'px Pretendard, Arial, sans-serif'; };
        function text(value, x, top, width, size=12, weight=400, color=C.ink, align='left') {
            font(size,weight); const lines = wrap(ctx,value,width), lineHeight=size*1.42;
            ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';
            for(let i=0;i<lines.length;i++) ctx.fillText(lines[i],align==='right'?x+width:x,top+i*lineHeight);
            return lines.length*lineHeight;
        }
        function rule(top) { ctx.strokeStyle=C.rule;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(M,top);ctx.lineTo(RIGHT,top);ctx.stroke(); }
        function page() {
            if(pages.length>=32)throw error('EXPORT_PAGES','Invoice is too long. Use Print.');
            canvas=root.document.createElement('canvas');canvas.width=WIDTH*2;canvas.height=HEIGHT*2;
            ctx=canvas.getContext('2d');if(!ctx)throw error('EXPORT_CANVAS','Canvas is unavailable. Use Print.');
            ctx.scale(2,2);ctx.fillStyle=C.white;ctx.fillRect(0,0,WIDTH,HEIGHT);pages.push(canvas);y=M;
            if(pages.length>1){
                y+=text('INVOICE · '+data.docInvoiceNo,M,y,RIGHT-M,14,700);
                y+=text(data.docClientName+' · '+data.docBillingPeriod,M,y+5,RIGHT-M,11,400,C.muted)+20;rule(y);y+=14;
            }
        }
        const height = (value,width,size=12,weight=400) => {font(size,weight);return wrap(ctx,value,width).length*size*1.42;};
        function room(h) { if(h>BOTTOM-155)throw error('EXPORT_LAYOUT','A text block is too long to fit safely. Shorten it or use Print.'); if(y+h>BOTTOM)page(); }
        function tableHead() { ctx.fillStyle=C.soft;ctx.fillRect(M,y,RIGHT-M,30); text('DESCRIPTION',M+10,y+8,340,10,700,C.muted);text('BASIS (CAD)',410,y+8,100,10,700,C.muted,'right');text('RATE',520,y+8,65,10,700,C.muted,'right');text('FEE (CAD)',600,y+8,RIGHT-610,10,700,C.muted,'right');y+=30; }
        function pair(label,value,x,top,width) { const h1=text(label,x,top,width,9,700,C.muted);return h1+5+text(value,x,top+h1+5,width,12,600); }
        const yieldUI = () => new Promise(resolve=>setTimeout(resolve,0));
        try {
            current();page();
            const logo=element.querySelector('.y2c-logo-container img');
            if(logo && logo.complete && logo.naturalWidth && !logo.hidden && (!root.getComputedStyle || root.getComputedStyle(logo).display!=='none')){
                const ratio=Math.min(76/logo.naturalWidth,55/logo.naturalHeight);ctx.drawImage(logo,M,y,logo.naturalWidth*ratio,logo.naturalHeight*ratio);
            }
            const titleH=text(data.docHqName.replace(/\n/g,' '),M+90,y,325,18,750);
            const docH=text('COMMERCIAL INVOICE',490,y,RIGHT-490,20,750,C.ink,'right');
            text('Global Franchise Operations',M+90,y+titleH+7,325,10,400,C.muted);
            const refH=text('No. '+data.docInvoiceNo,490,y+docH+8,RIGHT-490,11,650,C.red,'right');
            y+=Math.max(73,docH+refH+20,titleH+35);ctx.fillStyle=C.red;ctx.fillRect(M,y,RIGHT-M,3);y+=24;
            let left=y,right=y;
            left+=pair('ISSUER / FROM',data.docHqRep,M,left,315)+8;
            left+=text(data.docHqAddress,M,left,315,11)+9;
            left+=text('Contact: '+data.docHqContact+'\nReg No: '+data.docHqRegNo+'\nRep: '+data.docHqRepName,M,left,315,10,400,C.muted);
            right+=pair('BILL TO',data.docClientName,423,right,RIGHT-423)+8;
            right+=text(data.docClientAddress,423,right,RIGHT-423,11)+9;
            right+=text('Attn: '+data.docClientAttn+'\nTax ID / Biz No: '+data.docClientBiz,423,right,RIGHT-423,10,400,C.muted);
            y=Math.max(left,right)+22;
            // Never let overlong address data silently overpaint the footer.
            if(y>BOTTOM-120)throw error('EXPORT_LAYOUT','Issuer or client address is too long for a safe first page. Use Print.');
            const metaH=Math.max(...[['DATE OF ISSUE',data.docIssueDate],['BILLING PERIOD',data.docBillingPeriod],['PAYMENT DUE',data.docDueDate]].map(([label,v])=>height(v,200,12,600)))+44;
            room(metaH+38);ctx.fillStyle=C.soft;ctx.fillRect(M,y,RIGHT-M,metaH);
            pair('DATE OF ISSUE',data.docIssueDate,M+14,y+12,200);pair('BILLING PERIOD',data.docBillingPeriod,287,y+12,200);pair('PAYMENT DUE',data.docDueDate,522,y+12,210);y+=metaH+20;tableHead();
            for(const cells of data.rows){
                current();await yieldUI();current();
                const rowH=cells.length===1?height(cells[0],RIGHT-M-20,11)+20:Math.max(height(cells[0],344,11,500),height(cells[1],100,11),height(cells[2],65,11),height(cells[3],RIGHT-610,11,650))+18;
                if(rowH>BOTTOM-200)throw error('EXPORT_LAYOUT','An invoice line is too long. Use Print.');
                if(y+rowH>BOTTOM){page();tableHead();}
                if(cells.length===1)text(cells[0],M+10,y+9,RIGHT-M-20,11,400,C.muted);
                else {text(cells[0],M+10,y+9,344,11,500);text(cells[1],410,y+9,100,11,400,C.muted,'right');text(cells[2],520,y+9,65,11,400,C.muted,'right');text(cells[3],600,y+9,RIGHT-610,11,650,C.ink,'right');}
                y+=rowH;rule(y);
            }
            y+=20;
            const subtotalH=Math.max(26,height(data.valSubtotal,RIGHT-570,12,600)+10);
            const taxH=Math.max(27,height(data.valTaxAmount,RIGHT-570,12,600)+10);
            const totalY=12+subtotalH+taxH,totalH=totalY+Math.max(60,height(data.valGrandTotal,RIGHT-564,22,750)+26);room(totalH);
            ctx.fillStyle=C.soft;ctx.fillRect(420,y,RIGHT-420,totalH);
            text('Subtotal',434,y+12,115,11,500,C.muted);text(data.valSubtotal,555,y+12,RIGHT-570,12,600,C.ink,'right');
            text(data.lblTaxType,434,y+12+subtotalH,115,11,500,C.muted);text(data.valTaxAmount,555,y+12+subtotalH,RIGHT-570,12,600,C.ink,'right');
            ctx.fillStyle=C.ink;ctx.fillRect(420,y+totalY,RIGHT-420,totalH-totalY);
            text('TOTAL DUE · CAD',434,y+totalY+13,115,10,650,C.white);text(data.valGrandTotal,550,y+totalY+12,RIGHT-564,22,750,C.white,'right');y+=totalH+24;
            const bank='Bank: '+data.bankName+'\nAccount: '+data.bankAccount+'\nBeneficiary: '+data.bankAccName+'\nSWIFT: '+data.bankSwift+'\nAddress: '+data.bankAddress;
            const signerH=height(data.sigName,RIGHT-530,12,650);
            const bankH=Math.max(height(bank,415,11)+32,signerH+66);room(bankH);
            text('REMITTANCE DETAILS',M,y,415,10,750,C.muted);text(bank,M,y+23,415,11);
            text('ISSUED BY',530,y,RIGHT-530,10,750,C.muted);text(data.sigName,530,y+23,RIGHT-530,12,650);text('Y2C Holdings Partner Portal',530,y+signerH+35,RIGHT-530,10,400,C.muted);y+=bankH+20;
            for(const [label,value] of [['SOURCE SCOPE',data.scope],['NOTE',data.memo],['PAYMENT TERMS',data.docPaymentTerms+'. Please include the invoice number with your transfer.']]){
                if(!value)continue; const h=height(value,RIGHT-M,11)+31;room(h);
                text(label,M,y,RIGHT-M,9,700,C.muted);text(value,M,y+17,RIGHT-M,11);y+=h+10;
            }
            const images=[];
            for(let i=0;i<pages.length;i++){
                current();await yieldUI();current();canvas=pages[i];ctx=canvas.getContext('2d');
                // The context retains its 2x transform from page creation.
                rule(1065);text('Y2C Holdings Partner Portal · All amounts in CAD',M,1078,550,9,400,C.muted);
                text((i+1)+' / '+pages.length,650,1078,RIGHT-650,9,600,C.muted,'right');
                const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(error('EXPORT_CANVAS','Unable to encode a PDF page.')),'image/jpeg',0.94));
                current();images.push({width:canvas.width,height:canvas.height,bytes:new Uint8Array(await blob.arrayBuffer())});
                canvas.width=1;canvas.height=1;
            }
            current();const bytes=encodePDF(images), blob=new Blob([bytes],{type:'application/pdf'});
            return {pageCount:images.length,byteLength:bytes.length,save(name){
                current();const url=URL.createObjectURL(blob),a=root.document.createElement('a');
                a.href=url;a.download=filename(name);a.hidden=true;root.document.body.appendChild(a);
                try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
            }};
        } finally {for(const c of pages){c.width=1;c.height=1;}}
    }
    return Object.freeze({render,snapshot,encodePDF,filename,wrap,clean,version:'V88_33_0'});
});
