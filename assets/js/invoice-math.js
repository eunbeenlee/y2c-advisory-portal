/* Monetary reconciliation; totals and fees are accumulated in integer cents. */
(function(global){
 'use strict';
 function cents(value){
  const n=Number(value==null||value===''?0:String(value).replace(/,/g,''));
  const c=Math.round(n*100+1e-8);
  if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(c))throw new Error('매출 금액이 유효하지 않습니다. 원본 데이터를 확인하십시오.');
  return c;
 }
 global.Y2C_InvoiceMath={summarize:function(data,records,params,advRate,adfRate){
  if(!data||!Array.isArray(records)||!/^\d{4}$/.test(String(params.targetYear))||!Number.isInteger(params.startMonth)||!Number.isInteger(params.endMonth)||params.startMonth<1||params.endMonth>12||params.startMonth>params.endMonth)throw new Error('인보이스 조회 조건이 유효하지 않습니다.');
  for(const rate of [advRate,adfRate])if(!Number.isFinite(rate)||rate<0||rate>1)throw new Error('수수료율을 확인하십시오.');
  if(!data.clientInfo||data.clientInfo.name!==params.clientName)throw new Error('조회 결과의 가맹점이 선택 조건과 다릅니다.');
  const seen=new Set(),months=[];let pos=0,delivery=0,gross=0,fees=0;
  for(const row of records){
   const month=Number(row.month);
   if(!Number.isInteger(month)||month<1||month>12||seen.has(month))throw new Error('월별 매출의 월 범위 또는 중복을 확인하십시오.');
   seen.add(month);
   if(month<params.startMonth||month>params.endMonth)continue;
   const p=cents(row.pos),d=cents(row.delivery),declared=cents(row.total),sum=p+d;
   const totalOnly=row.totalOnly===true&&sum===0&&declared>0;
   if(declared>0&&declared!==sum&&!totalOnly)throw new Error('월별 합계와 POS·배달 매출이 일치하지 않습니다. 원본 데이터를 확인하십시오.');
   const recognized=totalOnly?declared:sum;
   const adv=Math.round(recognized*advRate+1e-8),adf=Math.round(recognized*adfRate+1e-8);
   pos+=p;delivery+=d;gross+=recognized;fees+=adv+adf;
   if(![pos,delivery,gross,fees].every(Number.isSafeInteger))throw new Error('금액이 처리 범위를 초과했습니다.');
   months.push({month,gross:recognized/100,totalOnly,advFee:adv/100,adfFee:adf/100});
  }
  if(cents(data.posSales)!==pos||cents(data.deliverySales)!==delivery||cents(data.totalSales)!==gross)throw new Error('월별 내역과 인보이스 집계가 다릅니다. 최신 데이터를 다시 조회하십시오.');
  return{months,totalFees:fees/100,totalSales:gross/100};
 }};
})(window);
