'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pdf=require('../assets/js/invoice-pdf.js');
const page=()=>({width:1588,height:2246,bytes:new Uint8Array([255,216,1,2,3,255,217])});
test('PDF writer uses byte-accurate object offsets and xref',()=>{
 const b=pdf.encodePDF([page(),page()]);const s=Buffer.from(b).toString('latin1');
 assert.ok(s.startsWith('%PDF-1.4\n%'));assert.ok(s.endsWith('%%EOF\n'));
 const start=Number(s.match(/startxref\n(\d+)/)[1]);assert.equal(s.slice(start,start+4),'xref');
 const entries=s.slice(start).split('\n');assert.equal(entries[1],'0 9');
 for(let id=1;id<=8;id++){const offset=Number(entries[2+id].slice(0,10));assert.ok(s.slice(offset).startsWith(id+' 0 obj\n'));}
 assert.match(s,/\/Count 2/);assert.equal((s.match(/\/Type \/Page\b/g)||[]).length,2);
});
test('PDF writer rejects missing, excessive or non-JPEG page input',()=>{
 for(const pages of [[],null,Array(33).fill(page()),[{...page(),bytes:new Uint8Array([1,2,3,4])}],[{...page(),width:5000}],[{...page(),height:NaN}]])assert.throws(()=>pdf.encodePDF(pages));
});
test('PDF stream length counts JPEG binary bytes exactly',()=>{
 const p=page(),s=Buffer.from(pdf.encodePDF([p])).toString('latin1');const at=s.indexOf('/Filter /DCTDecode');
 assert.ok(s.slice(at,at+50).includes('/Length 7'));assert.equal(s.indexOf('endstream',at)-s.indexOf('stream\n',at)-7,8);
});
test('download filename removes path, control and bidi characters and keeps Korean',()=>{
 assert.equal(pdf.filename('../계산서\u202e:a?.PDF'),'.._계산서__a_.pdf');
 assert.equal(pdf.filename(''), 'invoice.pdf');assert.equal(pdf.filename('a'.repeat(500)).length,184);
 assert.ok(!/[\\/:*?"<>|\x00-\x1f\u202a-\u202e]/.test(pdf.filename('a\0b\\c.pdf')));
});
test('wrapping preserves Korean and long unbroken strings without clipping',()=>{
 const ctx={measureText:s=>({width:Array.from(s).length*10})};
 for(const s of ['가나다라마바사아자차카타파하','A'.repeat(80),'Hello international partners']){
  const lines=pdf.wrap(ctx,s,60);assert.ok(lines.every(s=>ctx.measureText(s).width<=60));assert.equal(lines.join('').replace(/\s/g,''),s.replace(/\s/g,''));
 }
 assert.deepEqual(pdf.wrap(ctx,'a\n\nb',60),['a','','b']);assert.throws(()=>pdf.wrap(ctx,'a',0));
});
test('input text strips control characters but preserves literal markup',()=>{
 assert.equal(pdf.clean(' <script>alert(1)</script>\x00 '),'<script>alert(1)</script>');
 assert.equal(pdf.clean('a\r\nb'),'a\nb');assert.throws(()=>pdf.clean('a'.repeat(2401)));
});
test('snapshot rejects missing identities and malformed row shape',()=>{
 assert.throws(()=>pdf.snapshot(null));assert.throws(()=>pdf.snapshot({querySelector:()=>null}));
 const doc={querySelector:id=>({innerText:'fixture',hidden:false}),querySelectorAll:()=>[{querySelectorAll:()=>[{innerText:'a'},{innerText:'b'}]}]};
 assert.throws(()=>pdf.snapshot(doc),e=>e.code==='EXPORT_DOCUMENT');
});
test('snapshot keeps scope and memo as text and accepts explicit zero row',()=>{
 const fields={'#valGrandTotal':{innerText:'$0.00'},'#docScopeNote':{innerText:'source note',hidden:false},'#docMemoBlock':{hidden:false},'#docMemo':{innerText:'<b>문자 그대로</b>'}};
 const doc={querySelector:id=>fields[id]||{innerText:'fixture',hidden:false},querySelectorAll:()=>[{querySelectorAll:()=>[{innerText:'Zero sales'}]}]};
 const d=pdf.snapshot(doc);assert.equal(d.valGrandTotal,'$0.00');assert.equal(d.scope,'source note');assert.equal(d.memo,'<b>문자 그대로</b>');assert.equal(d.rows[0].length,1);
});

test('download filenames stay below UTF-8 filesystem limits and avoid reserved device names',()=>{
 assert.ok(Buffer.byteLength(pdf.filename('가나다'.repeat(100)))<=184);
 assert.equal(pdf.filename('CON.pdf'),'invoice_CON.pdf');assert.equal(pdf.filename('...'),'invoice.pdf');
 assert.ok(!/\ud800$/.test(pdf.filename('😀'.repeat(80)).replace(/\.pdf$/,'')));
});
