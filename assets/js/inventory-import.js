/* Inventory import: deterministic suggestions; unresolved rows never become mutations. */
(function(root){
'use strict';
const text=v=>v==null?'':String(v).trim();
function normalize(v){return text(v).normalize('NFKC').toLowerCase().replace(/신전떡볶이|신전|sinjeon|shinjeon|냉동|frozen/g,'').replace(/[^a-z0-9가-힣]/g,'');}
const keywords=[['mild','순한'],['spicy','매운'],['rose','로제'],['wheatflourcake','밀떡'],['wheatricecake','밀떡'],['seaweedroll','김말이'],['fishcake','어묵'],['flatdumpling','납작만두'],['mozzarella','모짜'],['cheese','치즈'],['potato','감자'],['squid','오징어'],['shrimp','새우'],['dumpling','만두']];
function canonical(v){let n=normalize(v);for(const [a,b]of keywords)n=n.split(a).join(b);return n;}
function conflict(a,b){const flavor=['순한','매운','로제'];return flavor.some(k=>a.includes(k)&&flavor.some(j=>j!==k&&b.includes(j)))||['통살','납작','감자','새우'].some(k=>a.includes(k)!==b.includes(k));}
function eligible(c,hub){return !c.stockBreakdown||Object.prototype.hasOwnProperty.call(c.stockBreakdown,hub);}
function match(code,name,catalog,mappings,hub){
 const products=catalog.filter(c=>eligible(c,hub)),byCode=new Map(products.map(c=>[text(c.code).toUpperCase(),c]));
 const raw=text(code).toUpperCase(),n=canonical(name),maps=(mappings||[]).filter(m=>!m.region||m.region==='ALL'||m.region===hub);
 const result=(codes,method,auto)=>({code:codes.length===1?codes[0]:null,candidates:codes.slice(0,5),method,auto:!!auto&&codes.length===1});
 // Never strip letters from identifiers: FD-002 and DR-002 are different products.
 const exact=raw?[...new Set([...(byCode.has(raw)?[byCode.get(raw).code]:[]),...maps.filter(m=>text(m.vendorCode).toUpperCase()===raw).map(m=>m.hqCode)])]:[];
 if(exact.length){const valid=exact.filter(c=>byCode.has(text(c).toUpperCase())),nameConflict=valid.length===1&&n&&conflict(n,canonical(byCode.get(text(valid[0]).toUpperCase()).name));return result(valid,nameConflict?'품번과 상품명 특성 불일치':exact.length===1&&valid.length===1?'품번 일치':'품번 매핑 충돌',!nameConflict&&exact.length===1&&valid.length===1);}
 if(!n)return result([],'품목 선택 필요',false);
 const names=products.map(c=>({c,names:[c.name,...maps.filter(m=>m.hqCode===c.code).map(m=>m.itemName)].filter(Boolean).map(canonical)}));
 const full=names.filter(x=>x.names.includes(n)).map(x=>x.c.code);
 if(full.length)return result(full,'상품명·등록 별칭 일치',full.length===1);
 const terms=['밀떡','김말이','잡채말이','어묵','납작만두','만두','통살','오징어','치즈핫도그','모짜','감자','멘보샤','꽈배기','순한','매운','로제','새우'];
 const scores=names.map(({c,names})=>({code:c.code,score:Math.max(0,...names.map(other=>{
  if(!other||conflict(n,other))return 0;
  const shared=terms.filter(k=>n.includes(k)&&other.includes(k));
  // Distinctive keywords work across Korean/English naming and vendor descriptions.
  const containment=n.length>=4&&other.length>=4&&(n.includes(other)||other.includes(n));
  return (containment?80:0)+shared.reduce((s,k)=>s+(['만두','모짜','감자','새우'].includes(k)?20:50),0);
 }))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.code).localeCompare(String(b.code)));
 const top=scores[0],unique=top&&top.score>=50&&(!scores[1]||top.score-scores[1].score>=30);
 return {code:unique?top.code:null,candidates:scores.slice(0,5).map(x=>x.code),method:unique?'고유 키워드 일치':'키워드 후보 확인 필요',auto:!!unique};
}
function date(v){
 const s=text(v);if(!s||s==='-')return '-';
 // Only unambiguous year-first dates are normalized. 10/11/26 stays unresolved.
 const m=s.match(/^(\d{4})\s*[-/.년]\s*(\d{1,2})\s*[-/.월]\s*(\d{1,2})\s*(?:일)?\s*$/);
 if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 if(typeof v==='number'&&Number.isFinite(v)&&v>20000&&v<100000)return new Date((Math.floor(v)-25569)*86400000).toISOString().slice(0,10);
 return s;
}
function quantity(v){let s=text(v).replace(/\s*(?:박스|boxes|box|ctns|ctn|cases|case)\s*$/i,'').trim();if(/^\d{1,3}(,\d{3})+$/.test(s))s=s.replace(/,/g,'');return /^\d+$/.test(s)&&Number.isSafeInteger(Number(s))?Number(s):NaN;}
function money(v){let s=text(v).replace(/^(?:CAD\s*)?\$?\s*/i,'');if(!s)return null;if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s))s=s.replace(/,/g,'');return /^\d+(\.\d{1,2})?$/.test(s)&&Number.isSafeInteger(Math.round(Number(s)*100))?Number(s):NaN;}
function process(rows,catalog,mappings,hub){
 if(rows.length>10000)throw Error('한 번에 최대 10,000행을 처리합니다. 파일을 나눠 주세요.');
 const M=root.Y2C_ExcelModel;
 return rows.map((r,i)=>{
  const get=keys=>{const key=M.findKey(r,keys);return key?r[key]:'';};
  const rawCode=text(get(['ITEM','CODE','품번','SKU','BARCODE'])).toUpperCase(),rawName=text(get(['PRODUCT','NAME','품명','제품']));
  const qtyInput=text(get(['QTY','QUANTITY','수량','STOCK'])),expInput=text(get(['EXP','유통기한','DATE'])),priceInput=text(get(['PRICE','UNITPRICE','단가','가격','COST']));
  const found=match(rawCode,rawName,catalog,mappings,hub),exp=date(expInput),qty=quantity(qtyInput),price=money(priceInput);
  return {rawCode,rawName,qty,exp,price,qtyInput,expInput:exp,priceInput,hqCode:found.code,candidates:found.candidates,matchMethod:found.method,status:found.auto?'OK':'ERROR',ignored:false,inputError:false,sourceLine:r.__sourceLine||i+2,sourceText:r.__sourceText||'',needsReview:r.__ocr===true,reviewed:false};
 });
}
function ocrRows(value){
 const lines=text(value).split(/\r?\n/),rows=[];
 lines.forEach((raw,i)=>{
  const line=raw.trim();if(!line)return;
  // Keep nonempty lines for review, including lines the OCR could not structure.
  // Never silently drop a potential inventory item.
  const dates=[...line.matchAll(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g)];
  let without=line;for(const d of dates)without=without.replace(d[0],' ');
  const codes=without.match(/\b[A-Z]{1,5}-\d{2,8}\b|\b\d{4,14}[A-Z]{1,5}\b|\b\d{8,14}\b/i);
  if(codes)without=without.replace(codes[0],' ');
  const labeled=without.match(/(?:QTY|QUANTITY|수량)\s*[:=]?\s*(\d[\d,]*)\b/i)||without.match(/\b(\d[\d,]*)\s*(?:BOXES|BOX|CTNS|CTN|CASES|CASE|박스)(?:\b|\s|$)/i);
  let qty=labeled?labeled[1]:'';
  // A lone remaining integer is merely a proposal; OCR rows always require confirmation.
  if(!qty){const nums=without.match(/\b\d+(?:[.,]\d+)?\b/g)||[];if(nums.length===1&&/^\d+$/.test(nums[0]))qty=nums[0];}
  const name=without.replace(labeled?labeled[0]:/\b\d+\b/g,' ').trim();
  rows.push({'Item Code':codes?codes[0]:'','Product Name':name,'QTY':qty,'EXP':dates.length===1?date(dates[0][0]):dates.length>1?'날짜 여러 개 — 행 분리 필요':'-',__ocr:true,__sourceLine:i+1,__sourceText:line});
 });
 return rows;
}
root.Y2C_InventoryImport=Object.freeze({normalize,match,date,quantity,money,process,ocrRows,eligible});
})(typeof self!=='undefined'?self:globalThis);
