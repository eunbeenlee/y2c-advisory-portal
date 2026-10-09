/* Read-only franchise order history. Server determines store and region access. */
(function(){
 'use strict';
 let offset=0,busy=false,serial=0;
 const $=id=>document.getElementById(id);
 const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 async function load(next){
  if(busy)return;busy=true;const ticket=++serial;
  const owner=Y2C_AuthEngine.getAccountId();
  $('orderHistoryMessage').textContent='Loading / 조회 중…';
  $('orderHistoryRefresh').disabled=true;$('orderHistoryNext').disabled=true;$('orderHistoryPrev').disabled=true;
  try{
   const res=await Y2C_AuthEngine.request('get_orders',{offset:next,limit:20,clientState:'ALL'});
   if(ticket!==serial || owner!==Y2C_AuthEngine.getAccountId())return;
   if(res.success!==true || !Array.isArray(res.orders))throw Error(res.message || '조회 응답 오류');
   offset=next;$('orderHistoryList').replaceChildren();
   for(const o of res.orders){
    const card=el('details');card.className='order-history-card';
    card.append(el('summary',o.id+' · '+o.clientName+' · '+o.region+' · '+o.status+' · '+money(o.total)));
    card.append(el('p',o.date));
    const scroll=el('div');scroll.style.overflowX='auto';const table=el('table');
    const head=el('tr');for(const label of ['SKU','Item / 상품','Qty / 수량','Price / 단가','Amount / 금액'])head.append(el('th',label));table.append(head);
    for(const item of o.items){const row=el('tr');for(const value of [item.code,item.name,item.qty,money(item.price),money(item.total)])row.append(el('td',String(value)));table.append(row);}
    scroll.append(table);card.append(scroll,el('p','Subtotal '+money(o.subtotal)+' · Tax '+money(o.tax)+' · Total '+money(o.total)));$('orderHistoryList').append(card);
   }
   $('orderHistoryMessage').textContent=res.totalCount ? `${offset+1}–${offset+res.orders.length} / ${res.totalCount} orders` : 'No orders / 발주 내역이 없습니다.';
   $('orderHistoryNext').disabled=!res.hasMore;$('orderHistoryPrev').disabled=offset===0;
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId())$('orderHistoryMessage').textContent='조회 실패: '+e.message;}
  finally{busy=false;$('orderHistoryRefresh').disabled=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const historyRefresh=document.getElementById('orderHistoryRefresh');
  const historyPrev=document.getElementById('orderHistoryPrev');
  const historyNext=document.getElementById('orderHistoryNext');
  historyRefresh.addEventListener('click',()=>load(0));
  historyPrev.addEventListener('click',()=>load(Math.max(0,offset-20)));
  historyNext.addEventListener('click',()=>load(offset+20));
  load(0);
 });
})();
