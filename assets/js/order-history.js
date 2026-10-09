/* Scoped franchise order history and MASTER cancellation. Server determines store and region access. */
(function(){
 'use strict';
 let offset=0,busy=false,cancelBusy=false,serial=0;
 const $=id=>document.getElementById(id);
 const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
 const statuses={PENDING:'PENDING / 접수 대기',CONFIRMED:'CONFIRMED / 접수 확인',PREPARING:'PREPARING / 준비 중',SHIPPED:'SHIPPED / 출고 완료',COMPLETED:'COMPLETED / 처리 완료',CANCELED:'CANCELED / 취소',MIXED:'MIXED / 상태 확인 필요'};
 function dateLabel(value){if(typeof value==='string' && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))return value || 'Date unavailable / 일시 없음';const d=new Date(value);return Number.isNaN(d.getTime())?String(value || 'Date unavailable / 일시 없음'):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(d)+' · Toronto';}
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 async function load(next){
  if(busy || cancelBusy)return;busy=true;const ticket=++serial;
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
    card.append(el('summary',o.id+' · '+o.clientName+' · '+o.region+' · '+(statuses[o.status] || o.status)+' · '+money(o.total)));
    const date=el('p',dateLabel(o.date));date.title=String(o.date || '');card.append(date);
    const scroll=el('div');scroll.style.overflowX='auto';const table=el('table');
    const head=el('tr');for(const label of ['SKU','Item / 상품','Qty / 수량','Price / 단가','Amount / 금액'])head.append(el('th',label));table.append(head);
    for(const item of o.items){const row=el('tr');for(const value of [item.code,item.name,item.qty,money(item.price),money(item.total)])row.append(el('td',String(value)));table.append(row);}
    scroll.append(table);card.append(scroll,el('p','Subtotal '+money(o.subtotal)+' · Tax '+money(o.tax)+' · Total '+money(o.total)));if(res.canCancel===true && o.status==='PENDING'){
     const cancel=el('button','Cancel & restore stock / 취소·재고 복원');cancel.type='button';
     cancel.addEventListener('click',async()=>{
      if(busy || cancelBusy || !navigator.onLine)return;
      if(!confirm('주문 '+o.id+'를 취소하시겠습니까?\n차감 기록을 검증한 뒤 재고·유통기한별 수량을 복원합니다.\n이미 출고한 주문은 취소하지 마세요.'))return;
      cancelBusy=true;
      const controls=Array.from($('orderHistorySection').querySelectorAll('button'));
      const disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
      try{
       const result=await Y2C_AuthEngine.request('cancel_order',{orderId:o.id,restoreStock:true});
       if(owner!==Y2C_AuthEngine.getAccountId())return;
       if(!result || result.success!==true)throw Error(result && result.message || '취소 응답 오류');
       alert(result.message || '취소 처리 완료');
      }catch(e){if(owner===Y2C_AuthEngine.getAccountId())alert('취소 결과 확인: '+e.message+'\n발주 내역과 복구 진단을 대조하세요.');}
      finally{
       cancelBusy=false;controls.forEach((n,i)=>n.disabled=disabled[i]);
       if(owner===Y2C_AuthEngine.getAccountId())await load(offset);
      }
     });card.append(cancel);
    }
    $('orderHistoryList').append(card);
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
