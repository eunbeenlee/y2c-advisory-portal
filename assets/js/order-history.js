/* Live server-scoped order lines. MASTER starts in monitoring mode. */
(function(){
 'use strict';
 let offset=0,busy=false,mutating=false,serial=0,last=null,intervene=false;
 const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
 const statuses={PENDING:'PENDING / 접수 대기',CONFIRMED:'CONFIRMED / 접수 확인',PREPARING:'PREPARING / 준비 중',SHIPPED:'SHIPPED / 출고 완료',COMPLETED:'COMPLETED / 수령 완료',CANCELED:'CANCELED / 취소',MIXED:'MIXED / 품목별 부분 처리'};
 const nextStage={PENDING:'CONFIRMED',CONFIRMED:'PREPARING',PREPARING:'SHIPPED',SHIPPED:'COMPLETED'};
 function dateLabel(value){if(typeof value==='string'&&!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))return value||'일시 없음';const d=new Date(value);return Number.isNaN(d.getTime())?String(value||'일시 없음'):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(d)+' · Toronto';}
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 async function mutate(o,item,target){
  if(busy||mutating)return;
  if(!navigator.onLine){alert('온라인 연결 후 처리해 주세요.');return;}
  const owner=Y2C_AuthEngine.getAccountId(),cancel=target==='CANCELED',whole=item.inventoryModel==='RESERVE_AT_ORDER_V1';
  let reason='';if(cancel){reason=prompt('HQ 예외 정정 사유를 입력하세요 (5~300자).')||'';if(reason.trim().length<5)return;}
  if(!confirm(o.id+(whole?' / 전체 주문':' / '+item.code)+'\n'+(cancel?(whole?'출고 전 전체 주문 예약을 해제하시겠습니까?':'기존 주문을 예외 취소하고 검증된 차감 수량을 복원하시겠습니까?'):'실제 처리한 단계를 '+statuses[target]+'로 기록하시겠습니까? 출고 이후 자동 취소는 차단됩니다.')))return;
  mutating=true;const controls=Array.from($('orderHistorySection').querySelectorAll('button,input')),disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try{
   const action=cancel?'cancel_order':'update_order_status',payload={orderId:o.id};if(!whole)payload.itemCode=item.code;
   if(cancel){payload.restoreStock=true;payload.reason=reason;}else{payload.expectedStatus=item.status;payload.status=target;}
   const r=await Y2C_AuthEngine.request(action,payload);
   if(owner!==Y2C_AuthEngine.getAccountId())return;
   if(!r||r.success!==true)throw Error(r&&r.message||'저장 결과를 확인할 수 없습니다.');
   await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);alert(r.message||'저장 완료');document.dispatchEvent(new Event('y2c-operations-updated'));
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId())alert('처리 결과 확인: '+e.message+'\n새로고침 후 현재 상태와 처리 기록을 대조하세요.');}
  finally{mutating=false;controls.forEach((n,i)=>n.disabled=disabled[i]);if(owner===Y2C_AuthEngine.getAccountId())await load(offset);}
 }
 function render(res){
  const open=new Set(Array.from($('orderHistoryList').querySelectorAll('details[open]')).map(n=>n.dataset.key));
  $('orderHistoryList').replaceChildren();
  const master=res.viewerRole==='MASTER',vendor=res.viewerRole==='VENDOR';
  $('orderHistoryHint').textContent=vendor?'담당 지역의 가맹점 주문입니다. 접수·준비·출고는 벤더가, 수령 확인은 가맹점이 기록합니다. 신규 주문은 전체 주문 단위로 처리합니다.':master?'HQ 모니터링: 전체 발주를 조회합니다. 직접 처리하려면 아래 개입 모드를 켜세요.':'본인 매장의 주문입니다. 상품을 모두 받은 뒤 수령 확인을 눌러주세요. 미수령·차이는 담당 벤더에게 문의하세요.';
  $('hqInterventionLabel').hidden=!master;$('hqIntervention').checked=intervene;
  for(const o of res.orders){
   const card=el('details');card.className='order-history-card';card.dataset.key=JSON.stringify([o.id,o.clientName,o.region]);card.open=open.has(card.dataset.key);
   card.append(el('summary',o.id+' · '+o.clientName+' · '+o.region+' · '+(statuses[o.status]||o.status)+' · '+(vendor?'담당 품목 ':'')+money(o.total)));
   const date=el('p',dateLabel(o.date));date.title=String(o.date||'');card.append(date);
   const scroll=el('div');scroll.style.overflowX='auto';scroll.tabIndex=0;scroll.setAttribute('aria-label','주문 품목 표');const table=el('table');
   const head=el('tr');for(const label of ['SKU','Item / 상품','Qty / 수량','Price / 단가','Amount / 금액','Status / 처리 상태']){const th=el('th',label);th.scope='col';head.append(th);}table.append(head);
   for(const item of o.items){
    const row=el('tr');row.dataset.itemCode=item.code;
    for(const value of [item.code,item.name,item.qty,money(item.price),money(item.total)])row.append(el('td',String(value)));
    const cell=el('td'),st=item.status||o.status;cell.append(el('div',statuses[st]||st));if(master&&item.vendorName)cell.append(el('small','담당: '+item.vendorName));
    const reserved=item.inventoryModel==='RESERVE_AT_ORDER_V1',first=o.items[0]===item,receipt=res.canConfirmReceipt===true&&item.canConfirmReceipt===true;
    cell.append(el('small',reserved?'주문 예약 · 출고 시 차감':'기존 주문 · 선차감 보존'));
    if((!reserved||first)&&((item.canManage===true&&(vendor||(master&&intervene)))||receipt)){
     const actual={...item,status:st};
     if((res.canUpdateStatus===true||receipt)&&nextStage[st]&&(!vendor||st!=='SHIPPED')){const b=el('button',(receipt?'상품 수령 확인':(reserved?'전체 주문: ':'변경: ')+statuses[nextStage[st]]));b.type='button';b.dataset.orderStatus=nextStage[st];b.addEventListener('click',()=>mutate(o,actual,nextStage[st]));cell.append(b);}
     if(res.canCancel===true&&['PENDING','CONFIRMED','PREPARING'].includes(st)){const b=el('button',reserved?'HQ 예외 정정 / 예약 해제':'HQ 예외 정정 / 기존 차감 복원');b.type='button';b.dataset.cancelItem=item.code;b.addEventListener('click',()=>mutate(o,actual,'CANCELED'));cell.append(b);}
    }
    row.append(cell);table.append(row);
   }
   scroll.append(table);card.append(scroll,el('p',(vendor?'담당 품목 합계 · ':'')+'Subtotal '+money(o.subtotal)+' · Tax '+money(o.tax)+' · Total '+money(o.total)));
   if(o.items.some(i=>i.status==='CANCELED'))card.append(el('p','위 합계는 취소 품목을 포함한 원 발주 금액입니다. 취소 품목은 표의 상태를 확인하세요.'));
   $('orderHistoryList').append(card);
  }
 }
 async function load(next){
  if(busy||mutating)return;busy=true;const ticket=++serial,owner=Y2C_AuthEngine.getAccountId();
  $('orderHistoryMessage').textContent='Loading / 조회 중…';for(const id of ['orderHistoryRefresh','orderHistoryNext','orderHistoryPrev'])$(id).disabled=true;
  try{
   const res=await Y2C_AuthEngine.request('get_orders',{offset:next,limit:20,clientState:'ALL'});
   if(ticket!==serial||owner!==Y2C_AuthEngine.getAccountId())return;
   if(res.success!==true||!Array.isArray(res.orders))throw Error(res.message||'조회 응답 오류');
   offset=next;last=res;render(res);$('orderHistoryMessage').textContent=res.totalCount?`${offset+1}–${offset+res.orders.length} / ${res.totalCount} orders`:'No orders / 담당 발주 내역이 없습니다.';
   $('orderHistoryNext').disabled=!res.hasMore;$('orderHistoryPrev').disabled=offset===0;
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId()){$('orderHistoryList').replaceChildren();last=null;$('orderHistoryMessage').textContent='조회 실패: '+e.message;}}
  finally{busy=false;$('orderHistoryRefresh').disabled=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  if(!$('orderHistorySection'))return;
  const historyRefresh=document.getElementById('orderHistoryRefresh');const historyPrev=document.getElementById('orderHistoryPrev');const historyNext=document.getElementById('orderHistoryNext');
  historyRefresh.addEventListener('click',()=>load(0));historyPrev.addEventListener('click',()=>load(Math.max(0,offset-20)));historyNext.addEventListener('click',()=>load(offset+20));
  $('hqIntervention').addEventListener('change',e=>{if(mutating){e.target.checked=intervene;return;}intervene=e.target.checked;if(last)render(last);});load(0);
 });
})();
