/* Live server-scoped order lines. MASTER starts in monitoring mode. */
(function(){
 'use strict';
 let offset=0,busy=false,mutating=false,serial=0,last=null,lastOwner=null,intervene=false,reviewing=false,query='',statusFilter='ALL';
 const ux=()=>window.Y2C_UX,t=(ko,en)=>ux().t(ko,en);
 const stageNames={PENDING:['접수 대기','Pending'],CONFIRMED:['접수 확인','Confirmed'],PREPARING:['준비 중','Preparing'],SHIPPED:['출고 완료','Shipped'],COMPLETED:['수령 완료','Received'],CANCELED:['취소','Canceled'],MIXED:['품목별 부분 처리','Mixed item status']};
 const statusText=st=>st+' · '+(stageNames[st]?t(...stageNames[st]):st);
 const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
 const statuses={PENDING:'PENDING / 접수 대기',CONFIRMED:'CONFIRMED / 접수 확인',PREPARING:'PREPARING / 준비 중',SHIPPED:'SHIPPED / 출고 완료',COMPLETED:'COMPLETED / 수령 완료',CANCELED:'CANCELED / 취소',MIXED:'MIXED / 품목별 부분 처리'};
 const nextStage={PENDING:'CONFIRMED',CONFIRMED:'PREPARING',PREPARING:'SHIPPED',SHIPPED:'COMPLETED'};
 function dateLabel(value){if(typeof value==='string'&&!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))return value||'일시 없음';const d=new Date(value);return Number.isNaN(d.getTime())?String(value||'일시 없음'):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(d)+' · Toronto';}
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 async function mutate(o,item,target){
  if(busy||mutating||reviewing)return;
  if(!navigator.onLine){Y2C_AuthEngine.showToast('온라인 연결 후 처리해 주세요.','warning');return;}
  const owner=Y2C_AuthEngine.getAccountId(),cancel=target==='CANCELED',whole=item.inventoryModel==='RESERVE_AT_ORDER_V1';
  reviewing=true;let decision;
  try{decision=await Y2C_Dialog.ask({title:cancel?t('HQ 예외 정정','HQ exception correction'):t('주문 처리 확인','Confirm order update'),message:o.id+(whole?t(' / 전체 주문',' / whole order'):' / '+item.code)+'\n'+(cancel?(whole?t('출고 전 전체 주문 예약을 해제합니다.','Release the whole order reservation before shipment.'):t('기존 주문을 예외 취소하고 검증된 차감 수량을 복원합니다.','Cancel this legacy order and restore verified deducted quantities.')):t('실제 처리한 단계를 '+statusText(target)+'로 기록합니다. 출고 이후 자동 취소는 차단됩니다.','Record the actual completed step as '+statusText(target)+'. Automatic cancellation is blocked after shipment.')),confirmLabel:cancel?t('정정 확정','Confirm correction'):t('처리 확정','Confirm update'),reason:cancel?{label:t('HQ 예외 정정 사유 (5~300자)','Reason for HQ correction (5–300 characters)'),minLength:5,maxLength:300}:null});}
  catch(e){Y2C_AuthEngine.showToast('확인창을 열 수 없습니다. 새로고침 후 다시 시도하세요.','error');return;}
  finally{reviewing=false;}
  if(!decision.confirmed||owner!==Y2C_AuthEngine.getAccountId()||(!intervene&&last?.viewerRole==='MASTER'))return;
  const reason=decision.value;

  mutating=true;ux().busy($('orderHistorySection'),true);const controls=Array.from($('orderHistorySection').querySelectorAll('button,input')),disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try{
   const action=cancel?'cancel_order':'update_order_status',payload={orderId:o.id};if(!whole)payload.itemCode=item.code;
   if(cancel){payload.restoreStock=true;payload.reason=reason;}else{payload.expectedStatus=item.status;payload.status=target;}
   const r=await Y2C_AuthEngine.request(action,payload);
   if(owner!==Y2C_AuthEngine.getAccountId())return;
   if(!r||r.success!==true)throw Error(r&&r.message||'저장 결과를 확인할 수 없습니다.');
   await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);Y2C_AuthEngine.showToast(r.message||'저장 완료','success');document.dispatchEvent(new Event('y2c-operations-updated'));
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId())Y2C_AuthEngine.showToast('처리 결과 확인: '+e.message+' · 새로고침 후 현재 상태와 처리 기록을 대조하세요.','error');}
  finally{mutating=false;ux().busy($('orderHistorySection'),false);controls.forEach((n,i)=>n.disabled=disabled[i]);if(owner===Y2C_AuthEngine.getAccountId())await load(offset);}
 }
 function render(res){
  const open=new Set(Array.from($('orderHistoryList').querySelectorAll('details[open]')).map(n=>n.dataset.key));
  const list=$('orderHistoryList');list.replaceChildren();
  const filterQuery=$('orderFilterQuery'),filterState=$('orderFilterState');if(filterQuery){filterQuery.placeholder=t('현재 페이지의 주문·매장·상품 검색','Search orders, stores or items on this page');filterQuery.setAttribute('aria-label',filterQuery.placeholder);}if(filterState){filterState.setAttribute('aria-label',t('현재 페이지 상태 필터','Status filter on this page'));Array.from(filterState.options).forEach(o=>o.textContent=o.value==='ALL'?t('모든 상태','All statuses'):statusText(o.value));}
  const master=res.viewerRole==='MASTER',vendor=res.viewerRole==='VENDOR';
  $('orderHistoryTitle').textContent=t('발주 내역','Order history');
  $('orderHistoryRefresh').textContent=t('새로고침','Refresh');$('orderHistoryPrev').textContent=t('이전','Previous');$('orderHistoryNext').textContent=t('다음','Next');
  $('orderHistoryHint').textContent=vendor?t('담당 지역 가맹점 주문입니다. 벤더가 접수·준비·출고를, 가맹점이 수령 확인을 기록합니다.','Orders for your assigned region. Vendors confirm, prepare and ship; franchises confirm receipt.'):master?t('HQ 모니터링 중입니다. 직접 처리하려면 개입 모드를 켜세요.','HQ monitoring is active. Enable intervention mode to process an order.'):t('본인 매장의 주문입니다. 모두 받은 뒤 수령 확인을 눌러주세요. 차이는 담당 벤더에게 문의하세요.','Orders for your store. Confirm receipt after receiving all items. Contact your vendor about discrepancies.');
  $('hqInterventionLabel').hidden=!master;$('hqIntervention').checked=intervene;
  const filtered=res.orders.filter(o=>(statusFilter==='ALL'||o.status===statusFilter)&&(o.id+' '+o.clientName+' '+o.items.map(i=>i.code+' '+i.name).join(' ')).toLowerCase().includes(query.toLowerCase()));
  if($('orderFilterCount'))$('orderFilterCount').textContent=t('현재 페이지 '+res.orders.length+'건 중 '+filtered.length+'건','Showing '+filtered.length+' of '+res.orders.length+' on this page');
  if(!filtered.length){ux().empty(list,res.orders.length?t('조건에 맞는 발주가 없습니다','No orders match your filters'):t('표시할 발주 내역이 없습니다','No orders to display'),res.orders.length?t('현재 페이지에서 검색합니다. 검색 조건을 지우거나 다른 페이지를 확인하세요.','Filters apply to this page. Clear filters or check another page.'):t('새 발주가 저장되면 이곳에서 진행 상태를 확인할 수 있습니다.','New orders will appear here after they are saved.'),()=>{query='';statusFilter='ALL';$('orderFilterQuery').value='';$('orderFilterState').value='ALL';if(res.orders.length)render(res);else load(0);},res.orders.length?t('조건 초기화','Clear filters'):t('다시 조회','Refresh'));}
  for(const o of filtered){
   const card=el('details');card.className='order-history-card';card.dataset.key=JSON.stringify([o.id,o.clientName,o.region]);card.open=open.has(card.dataset.key);
   const summary=el('summary'),id=el('span',o.id+' · '),client=el('span',o.clientName+' · '+o.region),badge=el('span',statusText(o.status)),total=el('strong',(vendor?t('담당 품목 ','Assigned items '):'')+money(o.total)),toggle=el('span',t('상세 보기','Details'));
   id.className='ux-order-id';client.className='ux-order-client';badge.className='ux-status';badge.dataset.status=o.status;total.className='ux-order-total';toggle.className='ux-order-toggle';summary.append(id,client,badge,total,toggle);card.append(summary);
   const date=el('p',dateLabel(o.date));date.title=String(o.date||'');card.append(date);
   const stages=['PENDING','CONFIRMED','PREPARING','SHIPPED','COMPLETED'],current=stages.indexOf(o.status);
   if(current>=0){const steps=el('ol');steps.className='ux-stepper';steps.setAttribute('aria-label',t('주문 진행 상태','Order progress'));stages.forEach((stage,i)=>{const li=el('li',t(...stageNames[stage]));li.dataset.done=String(i<current);if(i===current)li.setAttribute('aria-current','step');steps.append(li);});card.append(steps);}
   else card.append(el('p',o.status==='CANCELED'?t('취소된 발주입니다. 처리 기록과 품목 상태를 확인하세요.','This order is canceled. Review its history and item status.'):t('품목마다 상태가 다릅니다. 아래 품목별 상태를 확인하세요.','Items have different states. Check each item below.')));
   const scroll=el('div');scroll.className='ux-table-scroll ux-mobile-cards';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',t('주문 품목','Order items'));const table=el('table');table.className='ux-data-table';
   const labels=['SKU',t('상품','Item'),t('수량 (박스)','Quantity (boxes)'),t('단가','Unit price'),t('금액','Amount'),t('처리 상태','Status')],head=el('tr'),thead=el('thead'),tbody=el('tbody');for(const label of labels){const th=el('th',label);th.scope='col';head.append(th);}thead.append(head);table.append(thead);
   for(const item of o.items){
    const row=el('tr');row.dataset.itemCode=item.code;
    [item.code,item.name,item.qty,money(item.price),money(item.total)].forEach((value,i)=>{const cell=el('td');cell.dataset.label=labels[i];cell.append(el('div',String(value)));row.append(cell);});
    const cell=el('td'),content=el('div'),st=item.status||o.status;cell.dataset.label=labels[5];content.append(el('div',statusText(st)));if(master&&item.vendorName)content.append(el('small',t('담당: ','Vendor: ')+item.vendorName));
    const reserved=item.inventoryModel==='RESERVE_AT_ORDER_V1',first=o.items[0]===item,receipt=res.canConfirmReceipt===true&&item.canConfirmReceipt===true;
    content.append(el('small',reserved?t('주문 예약 · 출고 시 차감','Reserved at order · deducted at shipment'):t('기존 주문 · 선차감 보존','Legacy order · previous deduction retained')));
    if((!reserved||first)&&((item.canManage===true&&(vendor||(master&&intervene)))||receipt)){
     const actual={...item,status:st};
     if((res.canUpdateStatus===true||receipt)&&nextStage[st]&&(!vendor||st!=='SHIPPED')){const label=receipt?t('상품 수령 확인','Confirm receipt'):(reserved?t('전체 주문: ','Whole order: '):t('변경: ','Set: '))+statusText(nextStage[st]);const b=el('button',label);b.type='button';b.dataset.orderStatus=nextStage[st];b.addEventListener('click',()=>mutate(o,actual,nextStage[st]));content.append(b);}
     if(res.canCancel===true&&['PENDING','CONFIRMED','PREPARING'].includes(st)){const b=el('button',reserved?t('HQ 예외 정정 / 예약 해제','HQ correction / release reservation'):t('HQ 예외 정정 / 기존 차감 복원','HQ correction / restore deduction'));b.type='button';b.dataset.cancelItem=item.code;b.addEventListener('click',()=>mutate(o,actual,'CANCELED'));content.append(b);}
    }
    cell.append(content);row.append(cell);tbody.append(row);
   }
   table.append(tbody);scroll.append(table);card.append(scroll);const totals=el('div');totals.className='ux-order-totals';[[t('상품 금액','Subtotal'),o.subtotal],[t('세금','Tax'),o.tax],[t('총액 (CAD)','Total (CAD)'),o.total]].forEach(([label,value])=>{const part=el('div');part.append(el('span',label),el('strong',money(value)));totals.append(part);});card.append(totals);
   if(o.items.some(i=>i.status==='CANCELED'))card.append(el('p',t('합계는 취소 품목을 포함한 원 발주 금액입니다. 품목별 상태를 확인하세요.','Totals show the original order, including canceled items. Check each item status.')));
   list.append(card);
  }
 }
 function filters(){
  const bar=el('div');bar.className='ux-filter-bar';const search=el('input'),select=el('select'),reset=el('button',t('조건 초기화','Clear filters')),count=el('span');search.id='orderFilterQuery';search.type='search';search.placeholder=t('현재 페이지의 주문·매장·상품 검색','Search orders, stores or items on this page');search.setAttribute('aria-label',search.placeholder);select.id='orderFilterState';select.setAttribute('aria-label',t('현재 페이지 상태 필터','Status filter on this page'));['ALL',...Object.keys(stageNames)].forEach(s=>{const o=el('option',s==='ALL'?t('모든 상태','All statuses'):statusText(s));o.value=s;select.append(o);});count.id='orderFilterCount';count.setAttribute('role','status');reset.type='button';reset.dataset.uxKo='조건 초기화';reset.dataset.uxEn='Clear filters';bar.append(search,select,reset,count);$('orderHistoryList').before(bar);let timer;
  search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{query=search.value.trim();if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);},180);});select.addEventListener('change',()=>{statusFilter=select.value;if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);});reset.addEventListener('click',()=>{query='';statusFilter='ALL';search.value='';select.value='ALL';if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);});
 }
 async function load(next){
  if(busy||mutating||reviewing)return;busy=true;const ticket=++serial,owner=Y2C_AuthEngine.getAccountId();
  $('orderHistoryMessage').textContent=t('조회 중…','Loading…');ux().busy($('orderHistoryList'),true);if(!last)ux().skeleton($('orderHistoryList'));for(const id of ['orderHistoryRefresh','orderHistoryNext','orderHistoryPrev'])$(id).disabled=true;
  try{
   const res=await Y2C_AuthEngine.request('get_orders',{offset:next,limit:20,clientState:'ALL'});
   if(ticket!==serial||owner!==Y2C_AuthEngine.getAccountId())return;
   if(res.success!==true||!Array.isArray(res.orders))throw Error(res.message||'조회 응답 오류');
   offset=next;last=res;lastOwner=owner;render(res);$('orderHistoryMessage').textContent=res.totalCount?`${offset+1}–${offset+res.orders.length} / ${res.totalCount} `+t('건','orders'):t('담당 발주 내역이 없습니다.','No orders in your scope.');
   $('orderHistoryNext').disabled=!res.hasMore;$('orderHistoryPrev').disabled=offset===0;
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId()){last=null;ux().error($('orderHistoryList'),e.message,()=>load(next));$('orderHistoryMessage').textContent=t('조회 실패','Unable to load orders');}}
  finally{busy=false;$('orderHistoryRefresh').disabled=false;ux().busy($('orderHistoryList'),false);}
 }
 document.addEventListener('y2c-language-changed',()=>{if(last&&lastOwner===Y2C_AuthEngine.getAccountId()&&!mutating&&!reviewing)render(last);});
 document.addEventListener('DOMContentLoaded',()=>{
  if(!$('orderHistorySection'))return;filters();
  const historyRefresh=document.getElementById('orderHistoryRefresh');const historyPrev=document.getElementById('orderHistoryPrev');const historyNext=document.getElementById('orderHistoryNext');
  historyRefresh.addEventListener('click',()=>load(0));historyPrev.addEventListener('click',()=>load(Math.max(0,offset-20)));historyNext.addEventListener('click',()=>load(offset+20));
  $('hqIntervention').addEventListener('change',e=>{if(mutating){e.target.checked=intervene;return;}intervene=e.target.checked;if(last)render(last);});load(0);
 });
})();
