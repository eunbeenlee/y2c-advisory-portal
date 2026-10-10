/* Estimates mirror the existing server's item tax codes and per-line cent rounding.
 * Stored orders are always recalculated from live server prices and tax settings. */
(function(root){
 'use strict';
 const rates=Object.freeze({ON:.13,BC:.12,AB:.05,SK:.11,MB:.12,QC:.14975});
 const cents=x=>Math.round((x+Number.EPSILON)*100)/100;
 function quote(cart,items,region){
  if(!Object.prototype.hasOwnProperty.call(rates,region))throw Error('발주 지역을 확인해 주세요.');
  const index=new Map(items.map(i=>[i.code,i])),lines=[];let subtotal=0,tax=0;
  for(const code of Object.keys(cart)){
   const qty=cart[code];if(qty===0)continue;
   if(!Number.isSafeInteger(qty)||qty<0)throw Error('박스 수량을 확인해 주세요.');
   const item=index.get(code);if(!item)throw Error('상품 목록을 새로고침해 주세요: '+code);
   if(item.priceAvailable===false||item.price===null||item.price===undefined||String(item.price).trim()==='')throw Error('단가 미등록: '+code);
   const price=Number(item.price);if(!Number.isFinite(price)||price<0||Math.abs(price*100-Math.round(price*100))>1e-6)throw Error('단가를 확인해 주세요: '+code);
   if(!Number.isSafeInteger(Math.round(qty*price*100)))throw Error('주문 금액 범위 오류.');
   const taxType=String(item.taxType||'TAXABLE').trim().toUpperCase(),rate=['ZERO_RATED','EXEMPT','0%'].includes(taxType)?0:rates[region];
   const lineTotal=cents(qty*price),lineTax=cents(lineTotal*rate);
   if(!Number.isSafeInteger(Math.round((subtotal+lineTotal+lineTax)*100)))throw Error('주문 합계 범위 오류.');
   subtotal=cents(subtotal+lineTotal);tax=cents(tax+lineTax);
   lines.push({code,name:String(item.name||code),qty,price,rate,subtotal:lineTotal,tax:lineTax,total:cents(lineTotal+lineTax)});
  }
  const total=cents(subtotal+tax);if(!Number.isSafeInteger(Math.round(total*100)))throw Error('주문 합계 범위 오류.');
  return {region,lines,subtotal,tax,total};
 }
 const api=Object.freeze({quote,rates});root.Y2C_OrderMath=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
