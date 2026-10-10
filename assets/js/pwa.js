/* Installation UI only. Authentication, drafts and mutation queues remain owned by AuthEngine. */
(function () {
 'use strict';
 let deferred = null, prompting = false, installed = false;
 const standalone = () => installed || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
 const status = text => { const el=document.getElementById('installStatus'); if(el) el.textContent=text; };
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
  if(navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration==='function') navigator.serviceWorker.getRegistration().then(reg=>{if(reg && typeof reg.update==='function') return reg.update();}).catch(()=>{});
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
