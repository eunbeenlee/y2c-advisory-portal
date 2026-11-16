/* Estimates mirror the existing server's item tax codes and per-line cent rounding.
 * Stored orders are always recalculated from live server prices and tax settings. */
(function(root){
 'use strict';
 const rates=Object.freeze({ON:.13,BC:.12,AB:.05,SK:.11,MB:.12,QC:.14975});
 // Calculate in integer cents. Binary floating point can round an exact
 // half-cent down (for example CAD 80.30 at 5% or CAD 260 at 14.975%).
 const rateUnits=Object.freeze({ON:13000n,BC:12000n,AB:5000n,SK:11000n,MB:12000n,QC:14975n});
 const maxCents=BigInt(Number.MAX_SAFE_INTEGER),amount=c=>Number(c)/100;
 function quote(cart,items,region){
  if(!Object.prototype.hasOwnProperty.call(rates,region))throw Error('발주 지역을 확인해 주세요.');
  const index=new Map(items.map(i=>[i.code,i])),lines=[];let subtotalCents=0n,taxCents=0n;
  for(const code of Object.keys(cart)){
   const qty=cart[code];if(qty===0)continue;
   if(!Number.isSafeInteger(qty)||qty<0)throw Error('박스 수량을 확인해 주세요.');
   const item=index.get(code);if(!item)throw Error('상품 목록을 새로고침해 주세요: '+code);
   if(item.priceAvailable===false||item.price===null||item.price===undefined||String(item.price).trim()==='')throw Error('단가 미등록: '+code);
   const price=Number(item.price);if(!Number.isFinite(price)||price<0||Math.abs(price*100-Math.round(price*100))>1e-6)throw Error('단가를 확인해 주세요: '+code);
   const unitCents=Math.round(price*100);
   if(!Number.isSafeInteger(unitCents))throw Error('주문 금액 범위 오류.');
   const taxType=String(item.taxType||'TAXABLE').trim().toUpperCase(),exempt=['ZERO_RATED','EXEMPT','0%'].includes(taxType),rate=exempt?0:rates[region];
   const lineCents=BigInt(qty)*BigInt(unitCents);
   const lineTaxCents=exempt?0n:(lineCents*rateUnits[region]+50000n)/100000n;
   subtotalCents+=lineCents;taxCents+=lineTaxCents;
   if(subtotalCents+taxCents>maxCents)throw Error('주문 합계 범위 오류.');
   lines.push({code,name:String(item.name||code),qty,price,rate,subtotal:amount(lineCents),tax:amount(lineTaxCents),total:amount(lineCents+lineTaxCents)});
  }
  return {region,lines,subtotal:amount(subtotalCents),tax:amount(taxCents),total:amount(subtotalCents+taxCents)};
 }
 const api=Object.freeze({quote,rates});root.Y2C_OrderMath=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
