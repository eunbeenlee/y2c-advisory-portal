'use strict';
/* Synthetic business responses for local invoice tests only. Never deployed. */
const fixtureCode = `
window.__invoiceTest={mode:'normal',calls:[],pending:[],toasts:[],pdfExports:[]};
const testData=window.__invoiceTest;
const testClient={name:'Test Toronto',bizId:123456789,address:'Local test fixture',city:'Toronto',state:'ON',email:'test@example.invalid'};
const testRecords=()=>testData.mode==='year'?Array.from({length:12},(_,i)=>({month:i+1,pos:1000.25,delivery:500.15,total:1500.40})):[{month:10,pos:1000.25,delivery:500.15,total:1500.40}];
window.Y2C_AuthEngine={
 cacheSessionKey:()=> 'LOCAL_ONLY_TEST_SESSION',getReadRevision:()=>0,
 cacheKey:k=>k,verifiedCacheKey:async k=>k,
 getAccountId:()=> 'LOCAL_ONLY_TEST_ACCOUNT',getAccountRole:()=> 'MASTER',getRole:()=> 'MASTER',
 onReadInvalidated:()=>()=>{},onPendingChanged:()=>()=>{},onNetworkStatus:()=>()=>{},
 getPendingTransactions:async()=>[],getNetworkStatus:()=>[],bindLogoutButton:()=>{},
 escapeHtml:value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 showToast:(message,type)=>testData.toasts.push({message,type}),
 request:async(action,params={})=>{
  testData.calls.push({action,params});
  if(!['get_master_data','get_invoice','get_sales_records'].includes(action))throw new Error('Unexpected fixture request: '+action);
  if(action==='get_master_data')return {success:true,clients:[testClient]};
  if(testData.mode==='slow')await new Promise(resolve=>testData.pending.push(resolve));
  if(testData.mode==='failure')return {success:false,message:'Intentional local read failure'};
  if(testData.mode==='malformed')return null;
  const records=testRecords();
  if(action==='get_sales_records')return {success:true,records};
  const selected=records.filter(r=>r.month>=Number(params.startMonth)&&r.month<=Number(params.endMonth));
  const sum=field=>Math.round(selected.reduce((total,r)=>total+r[field],0)*100)/100;
  return {success:true,invoiceData:{clientInfo:testClient,hqInfo:{},posSales:sum('pos'),deliverySales:sum('delivery'),totalSales:sum('total')+(testData.mode==='mismatch'?1:0)}};
 }
};
`;
module.exports = { fixtureCode };
