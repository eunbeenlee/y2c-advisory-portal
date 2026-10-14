/* Live server-scoped order lines. MASTER starts in monitoring mode. */
(function(){
 'use strict';
 let offset=0,busy=false,mutating=false,serial=0,last=null,lastOwner=null,intervene=false,reviewing=false,query='',statusFilter='ALL';
 const actorScope=()=>Y2C_AuthEngine.cacheSessionKey?.()||Y2C_AuthEngine.getAccountId();
 const ux=()=>window.Y2C_UX,t=(ko,en)=>ux().t(ko,en);
 const stageNames={PENDING:['접수 대기','Pending'],CONFIRMED:['접수 확인','Confirmed'],PREPARING:['준비 중','Preparing'],SHIPPED:['출고 완료','Shipped'],COMPLETED:['수령 완료','Received'],CANCELED:['취소','Canceled'],MIXED:['품목별 부분 처리','Mixed item status'],CANCEL_REQUESTED:['취소 승인 대기','Cancellation pending']};
 const statusText=st=>st+' · '+(stageNames[st]?t(...stageNames[st]):st);
 const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
 const statuses={PENDING:'PENDING / 접수 대기',CONFIRMED:'CONFIRMED / 접수 확인',PREPARING:'PREPARING / 준비 중',SHIPPED:'SHIPPED / 출고 완료',COMPLETED:'COMPLETED / 수령 완료',CANCELED:'CANCELED / 취소',MIXED:'MIXED / 품목별 부분 처리'};
 const nextStage={PENDING:'CONFIRMED',CONFIRMED:'PREPARING',PREPARING:'SHIPPED',SHIPPED:'COMPLETED'};
 function dateLabel(value){if(typeof value==='string'&&!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))return value||'일시 없음';const d=new Date(value);return Number.isNaN(d.getTime())?String(value||'일시 없음'):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(d)+' · Toronto';}
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 const cancelLabels={DIRECT:['주문 취소','Cancel order'],REQUEST:['취소 요청','Request cancellation'],APPROVE:['취소 승인','Approve cancellation'],REJECT:['취소 요청 거절','Decline cancellation request'],WITHDRAW:['취소 요청 철회','Withdraw request'],VENDOR_DECLINE:['접수 거절','Decline order'],VENDOR_CANCEL:['공급 취소','Cancel fulfillment']};
 const eventLabels={PLACED:['발주 접수','Order placed'],CONFIRMED:['접수 확인','Order confirmed'],PREPARING:['준비 시작','Preparation started'],SHIPPED:['출고 완료','Shipped'],COMPLETED:['가맹점 수령 확인','Receipt confirmed'],CANCELED_BY_FRANCHISE:['가맹점 직접 취소','Canceled by franchise'],CANCEL_REQUESTED:['취소 요청 접수','Cancellation requested'],CANCEL_APPROVED:['취소 승인','Cancellation approved'],CANCEL_REJECTED:['취소 거절','Cancellation declined'],CANCEL_WITHDRAWN:['취소 요청 철회','Cancellation withdrawn'],CANCELED_BY_HQ:['HQ 예외 취소','HQ exception cancellation'],ORDER_DECLINED_BY_VENDOR:['벤더 접수 거절','Order declined by vendor'],CANCELED_BY_VENDOR:['벤더 공급 취소','Fulfillment canceled by vendor']};
 function duration(start,end){const seconds=Math.floor((Date.parse(end)-Date.parse(start))/1000);if(!Number.isFinite(seconds)||seconds<0)return t('계산 불가','Unavailable');const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return t(`${h}시간 ${m}분 ${s}초`,`${h}h ${m}m ${s}s`);}
 async function cancelAction(o,mode){
  if(busy||mutating||reviewing)return;
  if(!navigator.onLine){Y2C_AuthEngine.showToast(t('온라인 연결 후 최신 주문 상태를 조회하세요.','Connect and refresh the order first.'),'warning');return;}
  const owner=Y2C_AuthEngine.getAccountId(),session=actorScope();if(last?.viewerRole==='MASTER'&&!intervene)return;
  const vendorInitiated=mode==='VENDOR_DECLINE'||mode==='VENDOR_CANCEL';
  const label=t(...cancelLabels[mode]),messages={VENDOR_DECLINE:['담당 벤더로서 접수를 거절하고 전체 주문을 취소합니다. 실물이 아직 출고되지 않았는지 확인하세요. 예약만 해제되며, 사유·처리 계정·시각은 가맹점과 HQ의 주문 내역에 표시됩니다.','Decline the whole order as its assigned vendor. Confirm that no goods have physically shipped. Only the reservation is released. The reason, account and time are visible to the franchise and HQ.'],VENDOR_CANCEL:['확정 또는 준비 중인 전체 주문의 공급을 취소합니다. 실물이 아직 출고되지 않았는지 확인하세요. 예약만 해제되며, 취소 당시 단계·사유·계정·시각은 가맹점과 HQ의 주문 내역에 표시됩니다.','Cancel fulfillment of the entire confirmed or preparing order. Confirm that no goods have physically shipped. Only the reservation is released. The stage, reason, account and time are visible to the franchise and HQ.'],DIRECT:['접수 전 주문을 취소하고 예약 수량을 해제합니다.','Cancel this pending order and release its reservation.'],REQUEST:['담당 벤더에게 취소를 요청합니다. 승인 전까지 예약은 유지되고 출고는 중지됩니다.','Ask your vendor to cancel. Stock remains reserved and shipment is paused until a decision.'],APPROVE:['전체 주문을 취소하고 예약을 해제합니다. 실물 재고는 변하지 않습니다.','Cancel the whole order and release its reservation. Physical stock will not change.'],REJECT:['취소를 거절하면 원래 주문과 예약이 유지되며 출고를 진행할 수 있습니다.','Declining keeps the order and reservation active and allows fulfillment to resume.'],WITHDRAW:['취소 요청을 철회하면 원래 주문과 예약이 유지되며 출고를 진행할 수 있습니다.','Withdrawing keeps the order and reservation active and allows fulfillment to resume.']};
  reviewing=true;let decision;
  try{decision=await Y2C_Dialog.ask({title:label,message:o.id+'\n'+t(...messages[mode]),confirmLabel:vendorInitiated?(mode==='VENDOR_DECLINE'?t('미출고 확인 · 접수 거절','Confirm unshipped · decline'):t('미출고 확인 · 취소 확정','Confirm unshipped · cancel')):label,reason:{label:t('처리 사유 (5~300자 · 주문 관계자에게 표시)','Reason (5–300 characters; visible to order participants)'),minLength:5,maxLength:300}});}
  catch(e){Y2C_AuthEngine.showToast(t('확인창을 열 수 없습니다. 새로고침하세요.','Unable to open confirmation. Refresh the page.'),'error');return;}
  finally{reviewing=false;}
  if(!decision.confirmed||(owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope())||(last?.viewerRole==='MASTER'&&!intervene))return;
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);const operationId='CXL-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const payload={orderId:o.id,cancelAction:mode,operationId,expectedStatus:o.status,expectedRevision:o.lifecycle.revision,cancelRequestId:vendorInitiated?'':o.lifecycle.cancelRequest?.id||'',reason:decision.value,restoreStock:true};
  if(vendorInitiated)payload.physicalNotShipped=true;
  mutating=true;ux().busy($('orderHistorySection'),true);const controls=Array.from($('orderHistorySection').querySelectorAll('button,input,select')),disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try{
   const r=await Y2C_AuthEngine.request('cancel_order',payload);
   if((owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope()))return;
   if(!r||r.success!==true)throw Error(r?.message||t('서버 처리 결과를 확인할 수 없습니다.','Unable to confirm the server result.'));
   await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);Y2C_AuthEngine.showToast(r.message,'success');document.dispatchEvent(new Event('y2c-operations-updated'));
  }catch(e){if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope()))Y2C_AuthEngine.showToast(e.message+' · '+t('완료 여부는 주문 이력에서 확인하세요.','Check order history for the outcome.'),'warning');}
  finally{mutating=false;ux().busy($('orderHistorySection'),false);controls.forEach((n,i)=>n.disabled=disabled[i]);if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope()))await load(offset);}
 }
 function lifecycleCard(o,res,card){
  const life=o.lifecycle,c=o.cancellation;
  if(!life||!c){if(o.items.some(i=>i.inventoryModel==='RESERVE_AT_ORDER_V1'))card.append(el('p',t('취소 및 처리 이력 기능은 서버 업데이트 후 표시됩니다.','Cancellation and history require the server update.')));return;}
  const panel=el('section');panel.className='ux-cancel-panel';panel.setAttribute('aria-label',t('주문 취소 관리','Order cancellation'));
  const heading=el('strong',c.hold?t('취소 승인 대기 · 출고 중지','Cancellation pending · shipment paused'):t('주문 취소 관리','Order cancellation'));panel.append(heading);
  panel.append(el('p',c.hold?t('예약은 유지됩니다. 담당 벤더가 승인·거절하거나 가맹점이 요청을 철회해야 다음 단계로 진행할 수 있습니다.','Stock stays reserved. A vendor decision or franchise withdrawal is needed before fulfillment can continue.'):o.status==='PENDING'?t('벤더 접수 전에는 가맹점이 직접 취소할 수 있습니다.','The franchise can cancel directly before vendor confirmation.'):['CONFIRMED','PREPARING'].includes(o.status)?t('접수 후에는 취소 요청을 보내고 담당 벤더의 승인을 받아야 합니다.','After confirmation, cancellation requires the assigned vendor’s approval.'):['SHIPPED','COMPLETED'].includes(o.status)?t('출고 이후에는 취소할 수 없습니다. 반품·수량 차이는 담당 벤더에게 문의하세요.','Shipped orders cannot be canceled. Contact your vendor about returns or discrepancies.'):t('취소된 주문입니다. 아래 처리 이력을 확인하세요.','This order is canceled. Review the history below.')));
  if(c.hold){const request=life.cancelRequest;panel.append(el('p',dateLabel(request.requestedAt)+' · '+request.requestedBy+' · '+request.reason));panel.append(el('small',t('취소 요청 후 경과: ','Since cancellation request: ')+duration(request.requestedAt,res.serverTime)));}
  if(c.vendorDecline||c.vendorCancel)panel.append(el('p',t('벤더는 실물 출고 전 사유를 남겨 전체 주문을 취소할 수 있습니다. 가맹점과 HQ에서 취소 단계·사유·처리 기록을 확인할 수 있습니다.','The assigned vendor may cancel the entire order before physical shipment with a reason. The franchise and HQ can review its stage, reason and processing history.')));
  const terminal=[...life.events].reverse().find(e=>['ORDER_DECLINED_BY_VENDOR','CANCELED_BY_VENDOR','CANCELED_BY_FRANCHISE','CANCEL_APPROVED','CANCELED_BY_HQ'].includes(e.event));
  if(o.status==='CANCELED'&&terminal){panel.append(el('strong',t(...eventLabels[terminal.event])),el('p',dateLabel(terminal.at)+' · '+terminal.actor+' · '+statusText(terminal.from)+' → '+statusText(terminal.to)),el('p',terminal.reason),el('small',t('이 주문의 예약이 해제되었습니다. 실물 재고는 증가하지 않습니다.','This order’s reservation has been released. Physical stock does not increase.')));}
  const actions=el('div');actions.className='ux-cancel-actions';
  if(res.viewerRole!=='MASTER'||intervene){const modes=[];if(c.direct)modes.push('DIRECT');if(c.request)modes.push('REQUEST');if(c.withdraw)modes.push('WITHDRAW');if(c.vendorDecline)modes.push('VENDOR_DECLINE');if(c.vendorCancel)modes.push('VENDOR_CANCEL');if(c.decide)modes.push('APPROVE','REJECT');for(const mode of modes){const b=el('button',t(...cancelLabels[mode]));b.type='button';b.dataset.cancelAction=mode;b.addEventListener('click',()=>cancelAction(o,mode));actions.append(b);}}
  panel.append(actions);card.append(panel);
  const history=el('details');history.className='ux-order-audit';history.append(el('summary',t('처리 이력 · 서버 시각 / Toronto','Processing history · server time / Toronto')));
  if(life.historyCoverage==='SINCE_UPGRADE')history.append(el('p',t('기존 주문입니다. 업데이트 이전의 처리 시각·계정은 이 이력에 기록되어 있지 않습니다.','Existing order: actions before this update are not recorded in this history.')));
  const events=el('ol');for(const event of life.events){const entry=el('li');entry.append(el('strong',event.event==='COMPLETED'&&event.role==='MASTER'?t('HQ 수령 대행 기록','Receipt recorded by HQ'):eventLabels[event.event]?t(...eventLabels[event.event]):event.event));const time=el('time',dateLabel(event.at));time.dateTime=event.at;time.title=event.at+' (UTC)';entry.append(time,el('span',event.actor+' · '+event.role+(event.company?' · '+event.company:'')));if(event.from&&event.to)entry.append(el('span',t('처리 단계: ','Stage: ')+statusText(event.from)+' → '+statusText(event.to)));if(event.physicalNotShippedConfirmed===true)entry.append(el('span',t('벤더 확인: 실물 미출고','Vendor declaration: goods not physically shipped')));if(event.physicalShippedConfirmed===true)entry.append(el('span',t('담당자 확인: 실물 출고','Operator declaration: physically shipped')));if(event.receiptConfirmed===true)entry.append(el('span',t('담당자 확인: 상품 수령','Operator declaration: goods received')));if(event.reason)entry.append(el('p',event.reason));events.append(entry);}history.append(events);
  const placed=life.events.find(e=>e.event==='PLACED'),confirmed=life.events.find(e=>e.event==='CONFIRMED');
  if(placed&&confirmed)history.append(el('p',t('발주 → 접수 확인: ','Placement → confirmation: ')+duration(placed.at,confirmed.at)));
  else if(o.status==='PENDING'&&placed)history.append(el('p',t('접수 대기 경과: ','Awaiting confirmation: ')+duration(placed.at,res.serverTime)));
  const shipped=life.events.find(e=>e.event==='SHIPPED'),received=life.events.find(e=>e.event==='COMPLETED');
  if(confirmed&&shipped)history.append(el('p',t('접수 확인 → 출고: ','Confirmation → shipment: ')+duration(confirmed.at,shipped.at)));
  if(shipped&&received)history.append(el('p',t('출고 → 수령 기록: ','Shipment → receipt entry: ')+duration(shipped.at,received.at)));
  else if(shipped&&o.status==='SHIPPED')history.append(el('p',t('출고 후 수령 확인 대기: ','Awaiting receipt confirmation: ')+duration(shipped.at,res.serverTime)));
  const vendorEnd=life.events.find(e=>['ORDER_DECLINED_BY_VENDOR','CANCELED_BY_VENDOR'].includes(e.event));
  if(vendorEnd&&placed)history.append(el('p',t('발주 → 벤더 취소: ','Placement → vendor cancellation: ')+duration(placed.at,vendorEnd.at)));
  if(vendorEnd&&confirmed)history.append(el('p',t('접수 확인 → 벤더 취소: ','Confirmation → vendor cancellation: ')+duration(confirmed.at,vendorEnd.at)));
  const requested=life.cancelRequest;if(requested?.resolvedAt)history.append(el('p',t('취소 요청 → 결정/철회: ','Cancellation request → decision/withdrawal: ')+duration(requested.requestedAt,requested.resolvedAt)));
  history.append(el('small',t('조회 시점 기준 경과 시간입니다. 공용 계정은 계정 단위로 기록되며 실제 개인을 식별하지 않습니다.','Elapsed time is calculated at refresh. Shared accounts identify an account, not an individual operator.')));card.append(history);
 }

 const mailLabels={QUEUED:['전송 대기','Queued'],DEFERRED:['재처리 대기','Deferred'],BLOCKED:['설정·상태 확인 필요','Review required'],SENDING:['전송 처리 중','Sending'],UNKNOWN:['전송 결과 불명 · 확인 필요','Outcome unknown · review required'],ACCEPTED:['메일 서비스 접수','Accepted by mail service'],CONFIRMED_RECEIVED:['담당자 수신 확인','Receipt confirmed by operator'],SIMULATED:['TEST 모의 처리 · 발송 없음','TEST simulation · no email'],SUPPRESSED:['발송 생략','Suppressed']};
 const mailActions={RETRY:['대기 메일 재처리','Retry queued notice'],REFRESH_RECIPIENTS:['수신 설정 다시 확인','Refresh recipient settings'],CONFIRM_RECEIVED:['수신 확인 기록','Record confirmed receipt'],AUTHORIZE_RESEND:['확인 후 재전송 승인','Authorize resend after review']};
 const mailReasons={QUOTA_WAIT:['발송 한도 회복 대기','Waiting for sending quota'],QUOTA_CHECK_UNAVAILABLE:['메일 서비스 확인 지연','Mail service check unavailable'],CANCELLATION_PENDING:['취소 승인 대기 중','Cancellation pending'],RECIPIENT_CONFIG:['수신 이메일 설정 확인','Check recipient settings'],OWNER_CHANGED:['지역 담당 변경 확인','Regional owner changed'],STALE_NOTICE:['24시간 이상 지연되어 담당자 확인 필요','Over 24 hours old; operator review required'],NOTICE_CHANGED:['원본 알림 기록 확인','Review original notice'],ORDER_INTEGRITY:['주문 기록 대조 필요','Order reconciliation required'],MAIL_CALL_ERROR:['메일 서비스 호출 결과를 확정할 수 없음','Cannot confirm mail service call outcome'],INTERRUPTED_SEND:['전송 중 실행이 중단되어 결과 확인 필요','Execution interrupted during sending'],ORDER_NO_LONGER_ACTIVE:['취소·출고·수령 완료 주문의 초기 발주 알림 생략','Initial notice suppressed for canceled, shipped or received order'],NO_SEPARATE_COPY:['별도 가맹점 사본 대상 아님','No separate franchise copy'],TEST_NO_EMAIL:['가상 환경에서만 확인','Synthetic environment only'],MAILAPP_RETURNED:['서비스가 요청을 수락함 · 실제 도착·열람은 별도','Service accepted request; delivery and reading are not verified']};
 async function reviewMail(o,job,mode){
  if(busy||mutating||reviewing||!navigator.onLine)return;
  const owner=Y2C_AuthEngine.getAccountId(),session=actorScope();if(last?.viewerRole==='MASTER'&&!intervene)return;
  const label=t(...mailActions[mode]),message=mode==='AUTHORIZE_RESEND'?t('먼저 수신자에게 도착 여부를 확인하세요. 이미 도착한 메일일 수 있으며 다시 보내면 중복될 수 있습니다. 확인 후 재전송을 승인합니다. 주문이나 재고는 다시 저장하지 않습니다.','Check with the recipient first. The original may already have arrived and resending may duplicate it. Authorize only after review. The order and stock are not recreated.'):mode==='CONFIRM_RECEIVED'?t('수신자에게 실제 도착을 확인했다는 기록을 남깁니다. 시스템이 자동 확인한 결과가 아닙니다.','Record that you confirmed arrival with the recipient. This is an operator assertion, not automatic delivery verification.'):mode==='REFRESH_RECIPIENTS'?t('서버에 등록된 최신 수신 이메일 설정을 다시 읽습니다. 주소는 이 화면에서 입력하지 않습니다. 기존 주문과 금액은 유지됩니다.','Reload the server’s recipient settings. No address is supplied by this screen. Existing order and amounts are retained.'):t('아직 전송하지 않은 알림을 다시 처리하도록 요청합니다. 지연된 발주 알림을 보내도 되는지 확인하세요. 한도 부족이면 다시 대기합니다.','Request processing of a notice not yet sent. Confirm that this delayed order notice is still appropriate. Insufficient quota keeps it deferred.');
  reviewing=true;let decision;
  try{decision=await Y2C_Dialog.ask({title:label,message:o.id+'\n'+message,confirmLabel:mode==='AUTHORIZE_RESEND'?t('중복 가능성 확인 · 재전송 승인','Acknowledge duplicate risk · authorize'):label,reason:{label:t('확인 내용·사유 (5~300자)','Review notes / reason (5–300 characters)'),minLength:5,maxLength:300}});}
  catch(e){Y2C_AuthEngine.showToast(t('확인창을 열 수 없습니다.','Unable to open confirmation.'),'error');return;}finally{reviewing=false;}
  if(!decision.confirmed||(owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope())||(last?.viewerRole==='MASTER'&&!intervene))return;
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  const payload={orderId:o.id,jobId:job.id,mailAction:mode,operationId:'MAILREVIEW-'+Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join(''),expectedRevision:job.revision,reason:decision.value,duplicateRiskAccepted:mode==='AUTHORIZE_RESEND'};
  mutating=true;ux().busy($('orderHistorySection'),true);const controls=Array.from($('orderHistorySection').querySelectorAll('button,input,select')),disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try{const r=await Y2C_AuthEngine.request('review_order_mail',payload);if((owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope()))return;if(!r||r.success!==true)throw Error(r?.message||t('처리 결과를 확인할 수 없습니다.','Unable to confirm the result.'));await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);Y2C_AuthEngine.showToast(r.message,'success');document.dispatchEvent(new Event('y2c-operations-updated'));}
  catch(e){if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope()))Y2C_AuthEngine.showToast(e.message+' · '+t('메일 처리 이력을 새로 조회하세요.','Refresh the mail processing history.'),'warning');}
  finally{mutating=false;ux().busy($('orderHistorySection'),false);controls.forEach((n,i)=>n.disabled=disabled[i]);if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope()))await load(offset);}
 }
 function mailCard(o,res,card){
  const notices=o.mailNotices;if(!notices)return;
  const panel=el('details');panel.className='ux-order-audit ux-mail-panel';panel.append(el('summary',t('발주 메일 처리 상태','Order notification status')));
  if(!notices.tracked){panel.append(el('p',t('이전 버전 주문 또는 알림 비활성 주문입니다. 기존 메일의 전송 결과는 추정하지 않습니다.','An earlier-version order or notifications were disabled. Previous mail outcomes are not inferred.')));card.append(panel);return;}
  if(notices.reason==='REVIEW_REQUIRED'){panel.append(el('p',t('메일 기록 대조가 필요합니다. HQ 운영 모니터링에서 확인하세요.','Mail records need reconciliation. Review HQ operations.')));card.append(panel);return;}
  panel.append(el('p',t('주문 저장과 메일 전송은 별도입니다. 서비스 접수는 실제 도착·열람 확인을 뜻하지 않습니다.','Order storage and email processing are separate. Service acceptance does not verify delivery or reading.')));
  for(const job of notices.jobs){
   const block=el('section');block.className='ux-mail-job';block.dataset.mailJob=job.id;
   block.append(el('strong',(job.kind==='VENDOR'?t('벤더 발주 알림','Vendor notice'):t('가맹점 확인 사본','Franchise copy'))+' · '+(mailLabels[job.status]?t(...mailLabels[job.status]):job.status)));
   if(mailReasons[job.reasonCode])block.append(el('p',t(...mailReasons[job.reasonCode])));
   block.append(el('small',t('전송 시도 ','Send attempts ')+job.attempts+' · '+dateLabel(job.updatedAt)));
   const actions=el('div');actions.className='ux-cancel-actions';
   if(job.canReview&&(res.viewerRole!=='MASTER'||intervene)){
    const modes=[];if(job.status==='DEFERRED'||(job.status==='BLOCKED'&&job.reasonCode==='STALE_NOTICE'))modes.push('RETRY');
    if(job.status==='UNKNOWN')modes.push('CONFIRM_RECEIVED','AUTHORIZE_RESEND');
    if(job.status==='BLOCKED'&&job.attempts===0&&['RECIPIENT_CONFIG','OWNER_CHANGED'].includes(job.reasonCode))modes.push('REFRESH_RECIPIENTS');
    for(const mode of modes){const b=el('button',t(...mailActions[mode]));b.type='button';b.dataset.mailAction=mode;b.addEventListener('click',()=>reviewMail(o,job,mode));actions.append(b);}
   }
   block.append(actions);const history=el('details');history.append(el('summary',t('메일 처리 이력','Mail processing history')));
   for(const event of job.events||[]){const line=el('p');line.append(el('span',dateLabel(event.at)+' · '+event.actor+' · '+(mailLabels[event.state]?t(...mailLabels[event.state]):event.state)));if(event.detail)line.append(el('span',' · '+event.detail));history.append(line);}block.append(history);panel.append(block);
  }card.append(panel);
 }


 async function mutate(o,item,target){
  if(busy||mutating||reviewing)return;
  if(!navigator.onLine){Y2C_AuthEngine.showToast('온라인 연결 후 처리해 주세요.','warning');return;}
  const owner=Y2C_AuthEngine.getAccountId(),session=actorScope(),cancel=target==='CANCELED',whole=item.inventoryModel==='RESERVE_AT_ORDER_V1';
  if(whole&&!cancel&&(last?.fulfillmentVersion!=='FULFILLMENT_REVIEW_V1'||!Number.isSafeInteger(o.lifecycle?.revision))){Y2C_AuthEngine.showToast(t('처리 확인 기능의 서버 업데이트가 필요합니다. 최신 주문을 다시 조회하세요.','The fulfillment server update is required. Reload the latest order.'),'warning');return;}
  const hqReceipt=!cancel&&target==='COMPLETED'&&last?.viewerRole==='MASTER';
  const totalBoxes=o.items.reduce((sum,line)=>sum+Number(line.qty||0),0);
  let stepMessage=t('실제 처리한 단계를 '+statusText(target)+'로 기록합니다. 출고 이후 자동 취소는 차단됩니다.','Record the completed step as '+statusText(target)+'. Automatic cancellation is blocked after shipment.');
  if(!cancel&&whole&&target==='SHIPPED')stepMessage=t('전체 '+totalBoxes+'박스의 실제 출고를 확인하세요. 예약이 해제되고 실물 재고가 한 번 차감됩니다. 출고 후에는 자동 취소할 수 없습니다.','Confirm that all '+totalBoxes+' boxes have physically shipped. The reservation is released and physical stock is deducted once. Automatic cancellation is unavailable after shipment.');
  if(!cancel&&target==='COMPLETED')stepMessage=hqReceipt?t('HQ가 수령 사실을 대신 기록합니다. 가맹점 직접 확인으로 표시되지 않으며, 대행 사유와 HQ 계정·서버 시각을 남깁니다. 실물 재고는 다시 차감하지 않습니다.','HQ is recording receipt on behalf of the franchise. This is labelled as an HQ entry with its reason, account and server time. Stock is not deducted again.'):t('상품을 실제로 수령했는지 확인하세요. 수령 확인 계정과 서버 시각을 기록하며 실물 재고는 다시 차감하지 않습니다.','Confirm that you have physically received the goods. Your account and server time are recorded; stock is not deducted again.');
  reviewing=true;let decision;
  try{decision=await Y2C_Dialog.ask({title:cancel?t('HQ 예외 정정','HQ exception correction'):t('주문 처리 확인','Confirm order update'),message:o.id+(whole?t(' / 전체 주문',' / whole order'):' / '+item.code)+'\n'+(cancel?(whole?t('출고 전 전체 주문 예약을 해제합니다.','Release the whole order reservation before shipment.'):t('기존 주문을 예외 취소하고 검증된 차감 수량을 복원합니다.','Cancel this legacy order and restore verified deducted quantities.')):stepMessage),confirmLabel:cancel?t('정정 확정','Confirm correction'):target==='SHIPPED'?t('실물 출고 확인','Confirm physical shipment'):target==='COMPLETED'?t('수령 사실 확인','Confirm receipt'):t('처리 확정','Confirm update'),reason:(cancel||hqReceipt)?{label:hqReceipt?t('HQ 수령 대행 사유 (5~300자)','Reason for HQ receipt entry (5–300 characters)'):t('HQ 예외 정정 사유 (5~300자)','Reason for HQ correction (5–300 characters)'),minLength:5,maxLength:300}:null});}
  catch(e){Y2C_AuthEngine.showToast('확인창을 열 수 없습니다. 새로고침 후 다시 시도하세요.','error');return;}
  finally{reviewing=false;}
  if(!decision.confirmed||(owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope())||(!intervene&&last?.viewerRole==='MASTER'))return;
  const reason=decision.value;

  mutating=true;ux().busy($('orderHistorySection'),true);const controls=Array.from($('orderHistorySection').querySelectorAll('button,input,select')),disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try{
   const action=cancel?'cancel_order':'update_order_status',payload={orderId:o.id};if(!whole)payload.itemCode=item.code;
   if(cancel){payload.restoreStock=true;payload.reason=reason;}else{payload.expectedStatus=item.status;payload.status=target;if(whole){payload.fulfillmentVersion='FULFILLMENT_REVIEW_V1';payload.expectedRevision=o.lifecycle.revision;if(target==='SHIPPED')payload.physicalShipped=true;if(target==='COMPLETED')payload.receiptConfirmed=true;if(hqReceipt)payload.reason=reason;}}
   const r=await Y2C_AuthEngine.request(action,payload);
   if((owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope()))return;
   if(!r||r.success!==true)throw Error(r&&r.message||'저장 결과를 확인할 수 없습니다.');
   await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);Y2C_AuthEngine.showToast(r.message||'저장 완료','success');document.dispatchEvent(new Event('y2c-operations-updated'));
  }catch(e){if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope()))Y2C_AuthEngine.showToast('처리 결과 확인: '+e.message+' · 새로고침 후 현재 상태와 처리 기록을 대조하세요.','error');}
  finally{mutating=false;ux().busy($('orderHistorySection'),false);controls.forEach((n,i)=>n.disabled=disabled[i]);if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope()))await load(offset);}
 }
 function render(res){
  const open=new Set(Array.from($('orderHistoryList').querySelectorAll('details[open]')).map(n=>n.dataset.key));
  const list=$('orderHistoryList');list.replaceChildren();
  const filterQuery=$('orderFilterQuery'),filterState=$('orderFilterState');if(filterQuery){filterQuery.placeholder=t('현재 페이지의 주문·매장·상품 검색','Search orders, stores or items on this page');filterQuery.setAttribute('aria-label',filterQuery.placeholder);}if(filterState){filterState.setAttribute('aria-label',t('현재 페이지 상태 필터','Status filter on this page'));Array.from(filterState.options).forEach(o=>o.textContent=o.value==='ALL'?t('모든 상태','All statuses'):statusText(o.value));}
  const master=res.viewerRole==='MASTER',vendor=res.viewerRole==='VENDOR';
  $('orderHistoryTitle').textContent=t('발주 내역','Order history');
  $('orderHistoryRefresh').textContent=t('새로고침','Refresh');$('orderHistoryPrev').textContent=t('이전','Previous');$('orderHistoryNext').textContent=t('다음','Next');
  $('orderHistoryHint').textContent=vendor?t('담당 지역 가맹점 주문입니다. 벤더가 접수·준비·출고를, 가맹점이 수령 확인을 기록합니다.','Orders for your assigned region. Vendors confirm, prepare and ship; franchises confirm receipt.'):master?t('HQ 모니터링 중입니다. 직접 처리하려면 개입 모드를 켜세요.','HQ monitoring is active. Enable intervention mode to process an order.'):t('본인 매장 주문입니다. 접수 전 직접 취소, 접수 후 취소 요청이 가능합니다. 수령 후 수령 확인을 눌러주세요.','Your store’s orders. Cancel before confirmation or request cancellation afterward. Confirm receipt after delivery.');
  $('hqInterventionLabel').hidden=!master;$('hqIntervention').checked=intervene;
  const filtered=res.orders.filter(o=>(statusFilter==='ALL'||(statusFilter==='CANCEL_REQUESTED'?o.cancellation?.hold:o.status===statusFilter))&&(o.id+' '+o.clientName+' '+o.items.map(i=>i.code+' '+i.name).join(' ')).toLowerCase().includes(query.toLowerCase()));
  if($('orderFilterCount'))$('orderFilterCount').textContent=t('현재 페이지 '+res.orders.length+'건 중 '+filtered.length+'건','Showing '+filtered.length+' of '+res.orders.length+' on this page');
  if(!filtered.length){ux().empty(list,res.orders.length?t('조건에 맞는 발주가 없습니다','No orders match your filters'):t('표시할 발주 내역이 없습니다','No orders to display'),res.orders.length?t('현재 페이지에서 검색합니다. 검색 조건을 지우거나 다른 페이지를 확인하세요.','Filters apply to this page. Clear filters or check another page.'):t('새 발주가 저장되면 이곳에서 진행 상태를 확인할 수 있습니다.','New orders will appear here after they are saved.'),()=>{query='';statusFilter='ALL';$('orderFilterQuery').value='';$('orderFilterState').value='ALL';if(res.orders.length)render(res);else load(0);},res.orders.length?t('조건 초기화','Clear filters'):t('다시 조회','Refresh'));}
  for(const o of filtered){
   const card=el('details');card.className='order-history-card';card.dataset.key=JSON.stringify([o.id,o.clientName,o.region]);card.open=open.has(card.dataset.key);
   const summary=el('summary'),id=el('span',o.id+' · '),client=el('span',o.clientName+' · '+o.region),badge=el('span',o.cancellation?.hold?t('취소 승인 대기 · 출고 중지','Cancellation pending · shipment paused'):statusText(o.status)),total=el('strong',(vendor?t('담당 품목 ','Assigned items '):'')+money(o.total)),toggle=el('span',t('상세 보기','Details'));
   id.className='ux-order-id';client.className='ux-order-client';badge.className='ux-status';badge.dataset.status=o.status;total.className='ux-order-total';toggle.className='ux-order-toggle';summary.append(id,client,badge,total,toggle);card.append(summary);
   const date=el('p',dateLabel(o.date));date.title=String(o.date||'');card.append(date);
   lifecycleCard(o,res,card);
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
   mailCard(o,res,card);
   list.append(card);
  }
 }
 function filters(){
  const bar=el('div');bar.className='ux-filter-bar';const search=el('input'),select=el('select'),reset=el('button',t('조건 초기화','Clear filters')),count=el('span');search.id='orderFilterQuery';search.type='search';search.placeholder=t('현재 페이지의 주문·매장·상품 검색','Search orders, stores or items on this page');search.setAttribute('aria-label',search.placeholder);select.id='orderFilterState';select.setAttribute('aria-label',t('현재 페이지 상태 필터','Status filter on this page'));['ALL',...Object.keys(stageNames)].forEach(s=>{const o=el('option',s==='ALL'?t('모든 상태','All statuses'):statusText(s));o.value=s;select.append(o);});count.id='orderFilterCount';count.setAttribute('role','status');reset.type='button';reset.dataset.uxKo='조건 초기화';reset.dataset.uxEn='Clear filters';bar.append(search,select,reset,count);$('orderHistoryList').before(bar);let timer;
  search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{query=search.value.trim();if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);},180);});select.addEventListener('change',()=>{statusFilter=select.value;if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);});reset.addEventListener('click',()=>{query='';statusFilter='ALL';search.value='';select.value='ALL';if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);});
 }
 async function load(next){
  if(busy||mutating||reviewing)return;busy=true;const ticket=++serial,owner=Y2C_AuthEngine.getAccountId(),session=actorScope();
  $('orderHistoryMessage').textContent=t('조회 중…','Loading…');ux().busy($('orderHistoryList'),true);if(!last)ux().skeleton($('orderHistoryList'));for(const id of ['orderHistoryRefresh','orderHistoryNext','orderHistoryPrev'])$(id).disabled=true;
  try{
   const res=await Y2C_AuthEngine.request('get_orders',{offset:next,limit:20,clientState:'ALL'});
   if(ticket!==serial||(owner!==Y2C_AuthEngine.getAccountId()||session!==actorScope()))return;
   if(res.success!==true||!Array.isArray(res.orders))throw Error(res.message||'조회 응답 오류');
   offset=next;last=res;lastOwner=owner;render(res);$('orderHistoryMessage').textContent=res.totalCount?`${offset+1}–${offset+res.orders.length} / ${res.totalCount} `+t('건','orders'):t('담당 발주 내역이 없습니다.','No orders in your scope.');
   $('orderHistoryNext').disabled=!res.hasMore;$('orderHistoryPrev').disabled=offset===0;
  }catch(e){if((owner===Y2C_AuthEngine.getAccountId()&&session===actorScope())){last=null;ux().error($('orderHistoryList'),e.message,()=>load(next));$('orderHistoryMessage').textContent=t('조회 실패','Unable to load orders');}}
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
