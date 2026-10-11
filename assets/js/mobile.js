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
  const nav=document.querySelector('[data-portal-mobile-navigation]'),header=document.querySelector('[data-portal-header]');
  const docks=['cartActionContainer','pdfActionContainer','mobileSalesSaveContainer'].map(id=>document.getElementById(id)).filter(Boolean);
  function dimensions(){
   const visible=n=>n&&!n.hidden&&getComputedStyle(n).display!=='none'&&!n.classList.contains('translate-y-full');
   document.documentElement.style.setProperty('--portal-bottom-nav',(visible(nav)?Math.ceil(nav.getBoundingClientRect().height):0)+'px');
   document.documentElement.style.setProperty('--portal-header-height',(header?Math.ceil(header.getBoundingClientRect().height):70)+'px');
   document.documentElement.style.setProperty('--portal-dock-height',Math.max(0,...docks.map(n=>visible(n)?Math.ceil(n.getBoundingClientRect().height):0))+'px');
  }
  if(w.ResizeObserver){const observer=new ResizeObserver(dimensions);[nav,header,...docks].filter(Boolean).forEach(n=>observer.observe(n));}
  docks.forEach(n=>new MutationObserver(dimensions).observe(n,{attributes:true,attributeFilter:['class','hidden']}));dimensions();
  const top=ux.el('button','↑','ux-mobile-top');top.type='button';top.hidden=true;top.setAttribute('aria-label',ux.t('맨 위로','Back to top'));document.body.append(top);
  top.addEventListener('click',()=>{w.scrollTo({top:0,behavior:w.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  let scheduled=false;w.addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;top.hidden=w.scrollY<600;});},{passive:true});
  if(!auth?.getNetworkStatus)return;
  const panel=ux.el('aside',undefined,'ux-network');panel.id='portalNetworkStatus';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');main.prepend(panel);
  let timer=null,last='';
  function render(){
   clearTimeout(timer);const rows=auth.getNetworkStatus(),slow=rows.filter(r=>Date.now()-r.started>=4000||r.phase==='retrying'||r.kind==='sync');
   if(!slow.length){panel.hidden=true;last='';if(rows.length)timer=setTimeout(render,Math.max(50,4000-(Date.now()-Math.min(...rows.map(r=>r.started)))));return;}
   panel.hidden=false;const retry=slow.find(r=>r.phase==='retrying'),sync=slow.some(r=>r.kind==='sync'),write=slow.some(r=>r.kind==='write');
   const text=retry?ux.t('연결 재시도 중 · '+retry.attempt+'번째 시도','Reconnecting · attempt '+retry.attempt):sync?ux.t('저장된 대기 요청을 서버에 전송 중','Sending queued requests to the server'):write?ux.t('서버 저장 응답을 기다리는 중','Waiting for the server save response'):ux.t('최신 정보를 불러오는 중','Loading latest information');
   const note=(sync||write)?ux.t('완료 응답 전입니다. 같은 작업을 새로 제출하지 마세요.','Not confirmed yet. Avoid submitting the same work again.'):ux.t('같은 서버에 연결하고 있습니다. 입력 내용은 유지됩니다.','Connecting to the same server. Your input is retained.');
   panel.dataset.state=retry?'retrying':'connecting';const signature=text+note;
   if(signature!==last){last=signature;panel.replaceChildren(ux.el('span',undefined,'ux-network-dot'),ux.el('strong',text,'ux-network-label'),ux.el('small',note));}
  }
  auth.onNetworkStatus(render);document.addEventListener('y2c-language-changed',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});render();
 });
})(window);
