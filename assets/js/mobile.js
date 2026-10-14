/* Dock visibility changes only when a focused editor and reduced visual viewport coincide. */
(function(){
'use strict';
let pending=false;
function update(){
 pending=false;
 const vv=window.visualViewport,el=document.activeElement;
 const editing=!!el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable);
 const keyboard=!!vv&&vv.scale===1&&window.innerWidth<=1023&&editing&&(window.innerHeight-vv.height-vv.offsetTop)>120;
 document.body.classList.toggle('mobile-keyboard-open',keyboard);
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});
if(window.visualViewport){window.visualViewport.addEventListener('resize',schedule,{passive:true});window.visualViewport.addEventListener('scroll',schedule,{passive:true});}
schedule();
})();

/* No fetch/retry logic here: observe actual AuthEngine activity and existing controls. */
(function(w){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const ux=w.Y2C_UX,auth=w.Y2C_AuthEngine,main=document.querySelector('main');if(!main||!ux)return;
  const nav=document.querySelector('[data-portal-mobile-navigation]'),header=document.querySelector('[data-portal-header]'),toolbar=document.getElementById('catalogToolbar');
  const docks=['cartActionContainer','pdfActionContainer','mobileSalesSaveContainer'].map(id=>document.getElementById(id)).filter(Boolean);
  function dimensions(){
   const visible=n=>n&&!n.hidden&&getComputedStyle(n).display!=='none'&&!n.classList.contains('translate-y-full');
   document.documentElement.style.setProperty('--portal-bottom-nav',(visible(nav)?Math.ceil(nav.getBoundingClientRect().height):0)+'px');
   document.documentElement.style.setProperty('--portal-toolbar-height',(toolbar?Math.ceil(toolbar.getBoundingClientRect().height):0)+'px');
   document.documentElement.style.setProperty('--portal-header-height',(header?Math.ceil(header.getBoundingClientRect().height):70)+'px');
   document.documentElement.style.setProperty('--portal-dock-height',Math.max(0,...docks.map(n=>visible(n)?Math.ceil(n.getBoundingClientRect().height):0))+'px');
  }
  if(w.ResizeObserver){const observer=new ResizeObserver(dimensions);[nav,header,toolbar,...docks].filter(Boolean).forEach(n=>observer.observe(n));}
  docks.forEach(n=>new MutationObserver(dimensions).observe(n,{attributes:true,attributeFilter:['class','hidden']}));dimensions();
  const top=ux.el('button','↑','ux-mobile-top');top.type='button';top.hidden=true;top.setAttribute('aria-label',ux.t('맨 위로','Back to top'));document.body.append(top);
  top.addEventListener('click',()=>{w.scrollTo({top:0,behavior:w.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  let scheduled=false;w.addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;top.hidden=w.scrollY<600;});},{passive:true});
  if(!auth?.getNetworkStatus)return;
  const panel=ux.el('aside',undefined,'ux-network');panel.id='portalNetworkStatus';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');main.prepend(panel);
  const shortcut=ux.el('button','','ux-status-shortcut');shortcut.id='portalStatusShortcut';shortcut.type='button';shortcut.hidden=true;document.body.append(shortcut);
  const orders=document.getElementById('orderHistorySection');
  if(nav&&orders){const go=ux.el('button',ux.t('발주 내역','Orders'),'ux-nav-orders');go.id='portalOrdersShortcut';go.type='button';go.setAttribute('aria-label',ux.t('이 페이지의 발주 내역으로 이동','Go to orders on this page'));go.addEventListener('click',()=>jump(orders));nav.append(go);document.addEventListener('y2c-language-changed',()=>{go.textContent=ux.t('발주 내역','Orders');go.setAttribute('aria-label',ux.t('이 페이지의 발주 내역으로 이동','Go to orders on this page'));});dimensions();}
  let timer=null,last='',pending={count:0},pendingScope=null;
  const scope=()=>auth.cacheSessionKey?.()||auth.getAccountId();
  function jump(target){if(!target)return;target.tabIndex=-1;target.scrollIntoView({block:'start',behavior:'instant'});target.focus({preventScroll:true});}
  shortcut.addEventListener('click',()=>{const queue=document.getElementById('mutationSyncStatus');if((pending.count||pending.error)&&queue){const details=queue.querySelector('details');if(details)details.open=true;jump(queue);}else jump(panel);});
  w.addEventListener('y2c:pending-status',e=>{if(e.detail?.scope!==scope())return;pending=e.detail;pendingScope=e.detail.scope;render();});
  function render(){
   clearTimeout(timer);
   if(pendingScope!==scope()){pending={count:0};pendingScope=scope();}
   const rows=auth.getNetworkStatus(),slow=rows.filter(r=>Date.now()-r.started>=4000||r.phase==='retrying'||r.kind==='sync');
   panel.hidden=!slow.length;
   const retry=slow.find(r=>r.phase==='retrying'),sync=slow.some(r=>r.kind==='sync'),write=slow.some(r=>r.kind==='write');
   if(slow.length){
    const elapsed=Math.floor((Date.now()-Math.min(...slow.map(r=>r.started)))/5000)*5;
    const text=retry?ux.t('연결 재시도 · '+retry.attempt+'번째 시도','Reconnecting · attempt '+retry.attempt):sync?ux.t('기기 보관 요청의 처리 결과 확인 중','Checking results for locally saved requests'):write?ux.t('서버 저장 결과 확인 중','Checking the server save result'):ux.t('최신 정보를 불러오는 중','Loading latest information');
    const note=(sync||write)?ux.t('응답 지연 중에도 서버에서 처리될 수 있습니다. 같은 작업을 새로 제출하지 마세요.','The server may still process this request. Do not submit it as new work.'):ux.t('조회 연결을 확인하고 있습니다. 입력 내용은 유지됩니다.','Checking the read connection. Your input is retained.');
    const timing=elapsed?ux.t(' · '+elapsed+'초 경과',' · '+elapsed+'s elapsed'):'';
    const signature=text+note+timing;
    panel.dataset.state=retry?'retrying':'connecting';
    if(signature!==last){last=signature;panel.replaceChildren(ux.el('span',undefined,'ux-network-dot'),ux.el('strong',text+timing,'ux-network-label'),ux.el('small',note));}
   }else last='';
   shortcut.hidden=!(scope()&&(pending.count||pending.error||slow.length));
   shortcut.textContent=pending.error?ux.t('저장 상태 확인 필요','Check save status'):pending.count?ux.t('기기 대기 '+pending.count+'건 · 상태 보기',pending.count+' pending · view status'):ux.t('연결 상태 보기','View connection status');
   shortcut.setAttribute('aria-label',shortcut.textContent);
   shortcut.dataset.state=pending.attention||pending.error?'attention':'waiting';
   if(rows.length&&!document.hidden)timer=setTimeout(render,slow.length?1000:Math.max(50,4000-(Date.now()-Math.min(...rows.map(r=>r.started)))));
  }
  auth.onNetworkStatus(render);auth.onPendingChanged?.(()=>{if(pendingScope!==scope())render();});document.addEventListener('y2c-language-changed',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();ux.refreshSync?.();}else clearTimeout(timer);});render();ux.refreshSync?.();
 });
})(window);
