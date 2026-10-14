/* Presentation only. AuthEngine owns identity, queues and every business write. */
(function(w){
 'use strict';
 const lang=()=>{try{return localStorage.getItem('y2c_lang')==='ko'?'ko':'en';}catch(_){return 'en';}},t=(ko,en)=>lang()==='ko'?ko:en;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const reduced=()=>w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function pulse(n,color='#e7f4ed'){if(n&&!reduced()&&n.animate)n.animate([{backgroundColor:color},{backgroundColor:'transparent'}],{duration:700,easing:'ease-out'});}
 function busy(n,on){if(n)n.setAttribute('aria-busy',String(!!on));}
 function skeleton(parent,label){parent.replaceChildren();const box=el('div',undefined,'ux-skeleton');box.setAttribute('role','status');box.append(el('span',label||t('최신 정보를 불러오는 중','Loading latest information'),'ux-sr-only'));for(let i=0;i<3;i++){const bar=el('span',undefined,'ux-skeleton-line');bar.setAttribute('aria-hidden','true');box.append(bar);}parent.append(box);}
 function empty(parent,title,detail,action,label){const box=el('div',undefined,'ux-empty');const art=el('span',undefined,'ux-empty-icon');art.setAttribute('aria-hidden','true');if(w.Y2C_WorkspaceUI)art.append(w.Y2C_WorkspaceUI.artwork());else art.textContent='—';box.append(art,el('h3',title),el('p',detail));if(action){const b=el('button',label||t('다시 조회','Try again'),'ux-button');b.type='button';b.addEventListener('click',action);box.append(b);}parent.append(box);return box;}
 function error(parent,message,action){parent.replaceChildren();empty(parent,t('정보를 불러오지 못했습니다','Unable to load information'),message+' · '+t('입력한 내용은 유지됩니다. 연결을 확인하고 다시 조회하세요.','Your input is retained. Check your connection and try again.'),action);}
 function changed(n,value){if(!n)return;const before=n.textContent;n.textContent=value;if(before.trim()&&before!==value)pulse(n,'#fff0f1');}
 function stat(label,value,note,tone){const c=el('article',undefined,'ux-stat'+(tone?' ux-stat-'+tone:''));c.append(el('p',label,'ux-stat-label'),el('strong',String(value),'ux-stat-value'));if(note)c.append(el('p',note,'ux-stat-note'));return c;}
 let retrying=false,refreshing=false,refreshAgain=false,syncOwner=null,lastSync=null;
 const scope=()=>w.Y2C_AuthEngine?.cacheSessionKey?.()||w.Y2C_AuthEngine?.getAccountId();
 function publish(rows,error=false){w.dispatchEvent(new CustomEvent('y2c:pending-status',{detail:{scope:scope(),count:rows.length,attention:rows.some(r=>['DEAD_LETTER','AUTH_REQUIRED','RETRY_PAUSED'].includes(r.status)),error}}));}
 function formatTime(ms){return Number.isFinite(ms)&&ms>0?new Date(ms).toLocaleTimeString(lang()==='ko'?'ko-KR':'en-CA',{hour:'2-digit',minute:'2-digit'}):'';}
 function renderSync(node,rows){
  if(!node)return;const owner=w.Y2C_AuthEngine?.getAccountId(),ticket=scope(),opened=!!node.querySelector('details')?.open,focused=node.contains(document.activeElement)?document.activeElement?.dataset?.syncFocus:null;node.replaceChildren();node.classList.remove('hidden');node.classList.add('ux-sync');node.hidden=false;node.tabIndex=-1;node.setAttribute('aria-label',t('기기 저장 상태','Device save status'));publish(rows);
  const offline=navigator.onLine===false,attention=rows.some(r=>['DEAD_LETTER','AUTH_REQUIRED','RETRY_PAUSED'].includes(r.status));
  node.dataset.state=attention?'attention':rows.length||offline?'waiting':'clear';
  const head=el('div',undefined,'ux-sync-head'),dot=el('span',undefined,'ux-sync-dot');dot.setAttribute('aria-hidden','true');
  const title=rows.length?t('기기 보관 요청 '+rows.length+'건',rows.length+' locally retained requests'):offline?t('오프라인 · 기기 보관 상태','Offline · local storage'):t('기기 대기열 0건','No pending saves on this device');
  const status=el('strong',title);status.setAttribute('role','status');head.append(dot,status);node.append(head);
  if(!rows.length){node.append(el('p',offline?t('연결이 돌아오면 저장 상태를 다시 확인합니다.','Save status will be checked when connection returns.'):t('서버 반영 여부는 각 작업의 완료 응답과 처리 내역에서 확인합니다.','Confirm saved results in the completion response and transaction history.')));return;}
  node.append(el('p',t('기기 보관은 서버 저장 완료가 아닙니다. 같은 내용을 새로 제출하지 말고 아래 상태를 확인하세요.','Saved on this device does not mean committed to the server. Check the status below before submitting the same work again.')));
  const details=el('details'),summary=el('summary',t('저장 상태 보기','View save status'));details.open=opened;summary.dataset.syncFocus='details';details.append(summary);
  const labels={QUEUED:t('연결 대기','Queued'),FAILED_RETRYABLE:t('연결 재시도 대기','Waiting to retry'),RETRY_PAUSED:t('재시도 일시 중지','Retry paused'),AUTH_REQUIRED:t('로그인 확인 필요','Sign-in required'),DEAD_LETTER:t('입력·서버 기록 확인 필요','Review input and server history')};
  const actions={save_order:t('발주','Order'),update_stock:t('재고 입고','Stock receipt'),update_price:t('가격 변경','Price change')};
  rows.forEach(r=>{const row=el('div',undefined,'ux-queue-row');row.append(el('strong',(actions[r.action]||r.action)+' · '+(r.hub||'')),el('span',labels[r.status]||r.status));if(r.lastError)row.append(el('p',r.lastError));const when=formatTime(r.createdAt);if(when)row.append(el('small',t('기기 보관 '+when+' · 재시도 '+(r.retryCount||0)+'회','Saved locally '+when+' · '+(r.retryCount||0)+' retries')));if(r.leaseUntil>Date.now())row.append(el('small',t('다른 창을 포함해 전송 결과 확인 중','Waiting for the active send, including other tabs')));else if(r.nextAttemptAt>Date.now()&&r.status==='FAILED_RETRYABLE')row.append(el('small',t(formatTime(r.nextAttemptAt)+' 이후 연결 상태에 따라 재확인','Will check again after '+formatTime(r.nextAttemptAt)+' when connected')));details.append(row);});node.append(details);
  // The engine rechecks fresh records atomically; this is only the presentation guard.
  const sending=rows.some(r=>r.leaseUntil>Date.now()),blocked=rows.some(r=>!['QUEUED','FAILED_RETRYABLE','RETRY_PAUSED'].includes(r.status));
  if(blocked)node.append(el('p',t('로그인 또는 오류 원인을 먼저 확인하세요. 대기 기록은 보존됩니다.','Resolve sign-in or validation issues first. Pending records are retained.')));
  else{const b=el('button',t('같은 요청 다시 동기화','Retry existing requests'),'ux-button');b.type='button';b.dataset.syncFocus='retry';b.disabled=retrying||offline||sending;b.addEventListener('click',async()=>{if(retrying||ticket!==scope())return;retrying=true;b.disabled=true;busy(b,true);try{const latest=await w.Y2C_AuthEngine.getPendingTransactions();if(ticket!==scope())return;if(latest.some(r=>!['QUEUED','FAILED_RETRYABLE','RETRY_PAUSED'].includes(r.status)))throw Error(t('확인이 필요한 기록이 있습니다.','Some records require review.'));await w.Y2C_AuthEngine.retryPending();}catch(e){if(ticket===scope())w.Y2C_AuthEngine.showToast(e.message,'warning');}finally{retrying=false;busy(b,false);lastSync=null;refreshSync();}});node.append(b);}
  if(focused)node.querySelector('[data-sync-focus="'+focused+'"]')?.focus({preventScroll:true});
 }
 async function refreshSync(){
  const node=document.getElementById('mutationSyncStatus');if(!node)return;
  const ticket=scope();
  if(syncOwner!==ticket){node.replaceChildren();node.hidden=true;lastSync=null;syncOwner=ticket;publish([]);}
  if(!ticket||document.hidden)return;
  if(refreshing){refreshAgain=true;return;}
  refreshing=true;
  try{const rows=await w.Y2C_AuthEngine.getPendingTransactions();if(ticket!==scope()){refreshAgain=true;return;}const signature=JSON.stringify([ticket,lang(),navigator.onLine,rows,rows.map(r=>r.leaseUntil>Date.now())]);if(signature!==lastSync){renderSync(node,rows);lastSync=signature;}}
  catch(_){if(ticket===scope()){node.hidden=false;node.classList.remove('hidden');node.textContent=t('기기 저장 상태를 확인할 수 없습니다. 저장 여부를 단정하지 말고 입력을 유지하세요.','Cannot check local save status. Keep your input and verify the result.');lastSync=null;publish([],true);}}
  finally{refreshing=false;if(refreshAgain){refreshAgain=false;refreshSync();}}
 }
 function initReadFreshness(main){
  const engine=w.Y2C_Accelerator;if(!main||!engine?.onReadStatus||!engine?.getReadStatus)return;
  const panel=el('aside',undefined,'ux-read-freshness');panel.id='portalReadFreshness';panel.hidden=true;
  const message=el('p'),button=el('button',undefined,'ux-button');message.setAttribute('role','status');message.setAttribute('aria-live','polite');button.type='button';
  panel.append(message,button);if(location.pathname.endsWith('/invoice.html'))main.before(panel);else main.prepend(panel);
  const names={fetchCatalogFast:['상품·재고','Items / stock'],fetchRecipesFast:['레시피','Recipes'],fetchMasterDataForDashboard:['가맹점 목록','Client list'],fetchMasterDataFast:['가맹점 목록','Client list'],fetchClientsFast:['가맹점 목록','Client list'],loadDashboardSalesFast:['매출','Sales'],loadSalesGridFast:['매출','Sales'],fetchInitialDataFast:['조달·재고','Procurement / stock']};
  let signature='',owner=scope();
  function render(){
   const identity=scope();if(owner!==identity){owner=identity;signature='';message.textContent='';panel.hidden=true;}
   const rows=identity?engine.getReadStatus().filter(r=>['cached','stale','failed','outdated','draft'].includes(r.phase)):[];
   const next=JSON.stringify([identity,lang(),rows.map(r=>[r.key,r.phase,r.cachedAt])]);if(next===signature)return;signature=next;
   panel.hidden=!rows.length;button.hidden=rows.length>0&&rows.every(r=>r.phase==='draft');button.textContent=t('최신 정보 다시 조회','Check latest information');
   message.textContent=rows.map(r=>{const pair=names[r.key]||['화면 데이터','Page data'],name=t(...pair);const date=Number.isFinite(r.cachedAt)&&r.cachedAt>0?new Date(r.cachedAt).toLocaleString(lang()==='ko'?'ko-KR':'en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    if(r.phase==='cached')return name+' · '+t('이전 조회값'+(date?' ('+date+')':'')+' 표시 중 · 최신 정보 확인 중','Showing previous data'+(date?' ('+date+')':'')+' · checking for updates');
    if(r.phase==='stale')return name+' · '+t('최신 조회 실패 · 이전 조회값'+(date?' ('+date+')':'')+' 확인 필요','Latest check failed · verify previous data'+(date?' ('+date+')':''));
    if(r.phase==='draft')return name+' · '+t('편집 중인 입력 유지 · 저장/편집 완료 후 최신 값 확인','Edits retained · review latest data after saving or finishing edits');
    if(r.phase==='outdated')return name+' · '+t('변경 이후 재조회 필요','Recheck after changes');
    return name+' · '+t('최신 정보를 확인하지 못했습니다','Could not verify the latest information');
   }).join(' / ');
  }
  button.addEventListener('click',()=>{if(owner!==scope())return;engine.refreshVisibleReads();});
  engine.onReadStatus(render);w.Y2C_AuthEngine?.onPendingChanged?.(render);
  for(const event of ['storage','focus'])w.addEventListener(event,render);
  document.addEventListener('y2c-language-changed',render);render();
 }
 function applyLanguage(){document.documentElement.lang=lang();document.querySelectorAll('[data-ux-ko][data-ux-en]').forEach(n=>n.textContent=n.getAttribute('data-ux-'+lang()));for(const l of ['ko','en'])document.getElementById('lang_'+l)?.setAttribute('aria-pressed',String(lang()===l));lastSync=null;refreshSync();}
 w.Y2C_UX={t,el,busy,skeleton,empty,error,stat,changed,pulse,renderSync,refreshSync,language:lang};
 document.addEventListener('y2c-language-changed',applyLanguage);
 document.addEventListener('DOMContentLoaded',()=>{
  const main=document.querySelector('main');if(main){if(!main.id)main.id='portalMain';main.tabIndex=-1;const skip=el('a',t('본문 바로가기','Skip to content'),'ux-skip');skip.href='#'+main.id;skip.dataset.uxKo='본문 바로가기';skip.dataset.uxEn='Skip to content';document.body.prepend(skip);}
  if(main&&w.Y2C_AuthEngine?.getAccountId()&&!document.getElementById('mutationSyncStatus')){const panel=el('aside');panel.id='mutationSyncStatus';panel.setAttribute('aria-label',t('기기 저장 상태','Device save status'));if(location.pathname.endsWith('/invoice.html')){panel.className='ux-sync-outside';main.before(panel);}else main.prepend(panel);}
  for(const [id,ko,en] of [['catalogSearchInput','상품명 또는 코드 검색','Search item name or code'],['recipeSearchInput','레시피 검색','Search recipes'],['recipeCategoryFilter','레시피 분류','Recipe category']]){const n=document.getElementById(id);if(n)n.setAttribute('aria-label',t(ko,en));}
  initReadFreshness(main);applyLanguage();setInterval(refreshSync,15000);w.Y2C_AuthEngine?.onPendingChanged?.(()=>{lastSync=null;refreshSync();});w.Y2C_AuthEngine?.onNetworkStatus?.(()=>refreshSync());
  w.addEventListener('online',()=>{lastSync=null;refreshSync();});w.addEventListener('offline',()=>{lastSync=null;refreshSync();});w.addEventListener('focus',refreshSync);w.addEventListener('storage',refreshSync);
  w.addEventListener('y2c:mutation-completed',e=>{if(e.detail?.owner!==w.Y2C_AuthEngine?.getAccountId()||e.detail?.response?.success!==true)return;lastSync=null;refreshSync();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSync();});
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&!reduced()&&b.animate)b.animate([{opacity:.78},{opacity:1}],{duration:140});});
  // Restore focus and contain keyboard navigation in the legacy custom modal panels.
  for(const id of ['itemSelectionModal','statusUpdateModal']){
   const modal=document.getElementById(id);if(!modal)continue;let prior=null,opened=false;
   const visible=()=>!modal.classList.contains('hidden')&&!modal.hidden;
   const focusable=()=>Array.from(modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')).filter(n=>!n.disabled&&n.getClientRects().length);
   const update=()=>{const show=visible();if(show&&!opened){prior=document.activeElement;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');const title=modal.querySelector('h2,h3');if(title){if(!title.id)title.id=id+'Heading';modal.setAttribute('aria-labelledby',title.id);}requestAnimationFrame(()=>{if(visible())focusable()[0]?.focus();});}else if(!show&&opened&&prior?.isConnected)prior.focus();opened=show;};
   new MutationObserver(update).observe(modal,{attributes:true,attributeFilter:['class','hidden']});
   modal.addEventListener('keydown',e=>{if(e.key==='Escape'){const close=modal.querySelector('[id*=Close],[id*=Cancel]');if(close&&!close.disabled){e.preventDefault();close.click();}return;}if(e.key!=='Tab'||e.defaultPrevented)return;const f=focusable();if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}});update();
  }
 });
})(window);
