/* Installation and safe update status. Authentication, drafts and queues stay with AuthEngine. */
(function () {
 'use strict';
 let deferred = null, prompting = false, installed = false;
 const standalone = () => installed || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
 const status = text => { const el=document.getElementById('installStatus'); if(el) el.textContent=text; };
 let updateBusy=false, lastCheck=0;
 const watched=new WeakSet();
 function updateNotice(text, retry) {
  let box=document.getElementById('pwaUpdateNotice');
  if(!box) {
   box=document.createElement('aside'); box.id='pwaUpdateNotice'; box.className='pwa-update-notice no-print';
   const message=document.createElement('p'); message.setAttribute('role','status'); box.appendChild(message);
   const button=document.createElement('button'); button.type='button'; button.textContent='업데이트 확인 / Check update';
   button.addEventListener('click',()=>checkUpdate(true)); box.appendChild(button);
   const link=document.createElement('a');link.href='app-health.html';link.target='_blank';link.rel='noopener';link.textContent='앱 상태 점검 / App check';box.appendChild(link);
   document.body.appendChild(box);
  }
  box.querySelector('p').textContent=text; box.querySelector('button').hidden=!retry;box.querySelector('button').disabled=updateBusy;
 }
 function waitingNotice() {
  updateNotice('새 버전 준비 완료. 입력 내용을 저장한 뒤 이 사이트의 브라우저 탭과 앱을 모두 닫고 다시 실행하세요. / Update ready. Save your work, close all portal tabs and app windows, then reopen.',false);
 }
 function watchRegistration(reg) {
  if(reg.waiting) waitingNotice();
  if(watched.has(reg)) return; watched.add(reg);
  const watchWorker=()=>{
   const worker=reg.installing; if(!worker) return;
   worker.addEventListener('statechange',()=>{
    if(worker.state==='installed' && reg.waiting) waitingNotice();
    if(worker.state==='redundant') updateNotice('새 버전을 준비하지 못했습니다. 연결 또는 배포 파일을 확인하세요. 저장 대기 요청은 유지됩니다. / Update unavailable. Check connection or deployment files. Queued requests are retained.',true);
   });
  };
  reg.addEventListener('updatefound',watchWorker);watchWorker();
 }
 async function checkUpdate(manual) {
  if(!navigator.serviceWorker || updateBusy || (!manual && Date.now()-lastCheck<60000)) return;
  updateBusy=true;lastCheck=Date.now();
  try {
   let reg=await navigator.serviceWorker.getRegistration();
   if(!reg && typeof navigator.serviceWorker.register==='function') reg=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});
   if(!reg) return;
   if(typeof reg.addEventListener==='function') watchRegistration(reg);
   if(typeof reg.update==='function') await reg.update();
   if(reg.waiting) waitingNotice();
   else if(manual) updateNotice(reg.installing?'업데이트 파일 확인 중입니다. / Checking update files.':'업데이트 확인 요청을 마쳤습니다. / Update check requested.',true);
  } catch(error) {
   updateNotice('업데이트를 확인하지 못했습니다. 인터넷 연결 후 다시 확인하세요. 저장 대기 요청은 유지됩니다. / Unable to check updates. Reconnect and retry. Queued requests are retained.',true);
  } finally {
   updateBusy=false;
   const button=document.querySelector('#pwaUpdateNotice button');if(button)button.disabled=false;
  }
 }
 function render() {
  const button=document.getElementById('installAppButton');
  if(button) { button.disabled=standalone() || !deferred || prompting; button.textContent=standalone()?'앱으로 실행 중 / Running as app':'앱 설치 / Install app'; }
  document.querySelectorAll('[data-pwa-install-link]').forEach(el=>el.hidden=standalone());
 }
 window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferred=event; render();
  status('설치할 수 있습니다. 앱 설치 버튼을 눌러주세요. / Ready to install.');
 });
 window.addEventListener('appinstalled', () => { installed=true; deferred=null; render(); status('설치가 완료되었습니다. 홈 화면에서 실행하세요. / Installation complete.'); });
 async function install() {
  if(prompting || !deferred || standalone()) return;
  const event=deferred; deferred=null; prompting=true; render();
  try {
   await event.prompt(); const choice=await event.userChoice;
   if(!installed) status(choice.outcome==='accepted'?'설치 요청을 전달했습니다. 완료되면 홈 화면에서 실행하세요. / Installation requested.':'설치를 취소했습니다. 아래 브라우저 메뉴로 다시 설치할 수 있습니다. / Installation dismissed.');
  } catch(error) { status('설치 창을 열지 못했습니다. 아래 브라우저 메뉴를 이용하세요. / Use your browser menu to install.'); }
  finally { prompting=false; render(); }
 }
 function init() {
  const button=document.getElementById('installAppButton');
  if(button) button.addEventListener('click',install);
  else {
   const footer=document.createElement('footer');footer.className='pwa-install-footer no-print';footer.setAttribute('data-pwa-install-link','');
   const link=document.createElement('a');link.href='install.html';link.target='_blank';link.rel='noopener';link.textContent='홈 화면에 앱 설치 / Install app';footer.appendChild(link);document.body.appendChild(footer);
  }
  if(standalone()) status('앱으로 실행 중입니다. / Running as app.');
  render();
  const media=window.matchMedia('(display-mode: standalone)');
  if(media.addEventListener) media.addEventListener('change',render);
  // Check the release on every page entry; never reload an active form or clear stored writes.
  if(navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration==='function') checkUpdate(false);
  window.addEventListener('online',()=>checkUpdate(false));
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
