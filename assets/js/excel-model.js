/* Current preview is the single source of stock mutations. */
(function(root){
'use strict';
function build(rows,catalog,hub){
 const products=new Map(catalog.map(c=>[String(c.code),c])), updates=new Map(), prices=new Map(), batches=new Map();let errors=0;const issues=rows.map(()=>[]);
 for(let index=0;index<rows.length;index++){
  const r=rows[index];if(r.ignored)continue;
  const list=issues[index];
  if(!hub)list.push('업로드 당시 허브와 현재 선택이 다릅니다. 원래 허브로 돌아가거나 파일을 다시 업로드하십시오.');
  if(!Number.isSafeInteger(r.qty)||r.qty<=0)list.push('수량은 1 이상의 안전한 정수여야 합니다. 원본 파일을 수정하고 다시 업로드하십시오.');
  if(r.exp!=='-'&&!validDate(r.exp))list.push('날짜는 YYYY-MM-DD 또는 YYYY/M/D 형식의 실제 날짜여야 합니다.');
  if(r.price!==null&&(!Number.isFinite(r.price)||r.price<0||!Number.isSafeInteger(Math.round(r.price*100))))list.push('단가는 처리 가능한 범위의 0 이상 숫자여야 합니다.');
  if(r.inputError)list.push('원본의 품번·수량·날짜·단가를 확인하십시오. 품목 매핑만으로 입력 오류는 해제되지 않습니다.');
  if(r.status==='ERROR')list.push('품목 확인이 필요합니다. 아래에서 마스터 품목을 직접 선택하십시오.');
  const c=products.get(String(r.hqCode));if(!c)list.push('등록된 마스터 품목이 없습니다. 품목을 선택하거나 행을 제외하십시오.');
  if(c&&r.exp==='-'&&Object.prototype.hasOwnProperty.call(c.expBreakdown||{},hub))list.push('선택한 허브는 유통기한 관리 대상입니다. 원본에 유통기한을 입력하십시오.');
  if(list.length){errors++;continue;}
  const code=String(c.code);
  if(r.price!==null){if(prices.has(code)&&prices.get(code)!==r.price){errors++;list.push('동일 품목의 단가가 다른 행과 충돌합니다. 원본을 수정하거나 해당 행을 제외하십시오.');continue;}prices.set(code,r.price);}
  let u=updates.get(code);if(!u){u={code,stockBreakdown:{[hub]:0},expBreakdown:{}};updates.set(code,u);}
  u.stockBreakdown[hub]+=r.qty;if(!Number.isSafeInteger(u.stockBreakdown[hub])){errors++;list.push('합산 수량이 안전한 정수 범위를 초과합니다.');}
  if(r.exp!=='-'){
   if(!batches.has(code))batches.set(code,new Map());
   const dates=batches.get(code);dates.set(r.exp,(dates.get(r.exp)||0)+r.qty);
  }
 }
 for(const [code,dates] of batches)updates.get(code).expBreakdown[hub]=Array.from(dates).sort(([a],[b])=>a.localeCompare(b)).map(([date,qty])=>date+':'+qty).join(' | ');
 // The catalog price may belong to another hub. Every explicit import price,
 // including zero and one-cent changes, is authoritative for the chosen hub.
 for(const [code,price] of prices){const u=updates.get(code);if(u)u.newPrice=price;}
 return {errors,issues,updates:errors?[]:Array.from(updates.values())};
}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
function findKey(row,keywords){
 const keys=Object.keys(row),norm=k=>k.replace(/[^a-zA-Z0-9가-힣]/g,'').toUpperCase();
 const aliases={ITEM:['ITEMCODE','PRODUCTCODE','ITEMNUMBER','CODE','품번','SKU','BARCODE'],PRODUCT:['PRODUCTNAME','ITEMNAME','NAME','품명','제품명'],QTY:['QTY','QUANTITY','수량','STOCK'],EXP:['EXPIRYDATE','EXPIRATIONDATE','EXP','유통기한','DATE'],PRICE:['UNITPRICE','PRICE','단가','가격','COST']};
 for(const word of aliases[keywords[0]]||keywords){const k=keys.find(k=>norm(k)===word);if(k)return k;}
 const matches=keys.filter(k=>keywords.some(w=>norm(k).includes(w))&&!(keywords[0]==='ITEM'&&/NAME|명/.test(norm(k)))&&!(keywords[0]==='PRODUCT'&&/CODE|번호/.test(norm(k))));
 return matches.length===1?matches[0]:null;
}
function parseWorkbook(workbook,XLSX){
 const worksheet=workbook.Sheets[workbook.SheetNames[0]];
 if(!worksheet)throw new Error('첫 번째 워크시트를 찾을 수 없습니다.');
 const formatted=XLSX.utils.sheet_to_json(worksheet,{raw:false}),raw=XLSX.utils.sheet_to_json(worksheet,{raw:true});
 if(formatted.length!==raw.length)throw new Error('워크시트 행 위치를 확인할 수 없습니다.');
 const date1904=!!(workbook.Workbook&&workbook.Workbook.WBProps&&workbook.Workbook.WBProps.date1904);
 return formatted.map((display,index)=>{
  // Keep formatted codes (including leading zeroes), but never infer a numeric
  // quantity, amount, or date from a rounded or locale-specific display string.
  const source=raw[index],row=Object.assign({},display);
  for(const keywords of [['QTY','QUANTITY','수량','STOCK'],['PRICE','UNITPRICE','단가','가격','COST'],['EXP','유통기한','DATE']]){
   const key=findKey(row,keywords);if(!key||typeof source[key]!=='number')continue;
   row[key]=source[key];
   if(keywords[0]==='EXP'){
    const d=XLSX.SSF.parse_date_code(source[key],{date1904});
    row[key]=d?String(d.y).padStart(4,'0')+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0'):String(source[key]);
   }
  }
  return row;
 });
}
root.Y2C_ExcelModel=Object.freeze({build,validDate,findKey,parseWorkbook});
})(typeof self!=='undefined'?self:globalThis);
