/* APK delivery checks only. This is not a Play Protect verdict and never changes device security. */
(function () {
 'use strict';
 const RELEASE = Object.freeze({file:'SinjeonPortal-1.0.6.apk',bytes:3856271,sha256:'fb943910852bee6516d18125698bf9a6bc52ebde6a91286856d1acc1fdcca29b'});
 let busy=false,controller=null;
 function init() {
  const button=document.getElementById('downloadApkButton');
  const message=document.getElementById('apkDownloadStatus');
  const cancel=document.getElementById('cancelApkDownload');
  if(!button||!message||!cancel) return;
  function say(text,kind){message.textContent=text;message.dataset.kind=kind;}
  cancel.addEventListener('click',()=>{if(controller)controller.abort();});
  button.addEventListener('click',async event=>{
   event.preventDefault();if(busy)return;
   busy=true;button.setAttribute('aria-disabled','true');button.setAttribute('aria-busy','true');cancel.hidden=false;
   controller=new AbortController();let timedOut=false,reader=null;
   const timer=setTimeout(()=>{timedOut=true;controller.abort();},45000);
   try {
    if(!crypto.subtle || !/^[a-f0-9]{64}$/.test(RELEASE.sha256) || RELEASE.bytes<=0)throw Error('VERIFIER_UNAVAILABLE');
    const url=new URL('apps/'+RELEASE.file,location.href);
    if(url.origin!==location.origin || (url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname)))throw Error('HTTPS_REQUIRED');
    url.searchParams.set('y2c_diagnostic','1');
    say('설치 파일 확인 중입니다. / Checking installation file…','working');
    const response=await fetch(url,{cache:'no-store',redirect:'error',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error('HTTP_'+response.status);
    const declared=Number(response.headers.get('content-length'));
    if(declared && declared!==RELEASE.bytes)throw Error('SIZE_MISMATCH');
    if(!response.body || typeof response.body.getReader!=='function')throw Error('VERIFIER_UNAVAILABLE');
    reader=response.body.getReader();const chunks=[];let total=0;
    while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>RELEASE.bytes)throw Error('SIZE_MISMATCH');chunks.push(value);}
    if(total!==RELEASE.bytes)throw Error('SIZE_MISMATCH');
    const blob=new Blob(chunks,{type:'application/vnd.android.package-archive'});
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
    if(digest!==RELEASE.sha256)throw Error('HASH_MISMATCH');
    if(controller.signal.aborted)throw Error('CANCELED');
    const objectUrl=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectUrl;link.download=RELEASE.file;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
    say('파일 일치를 확인하고 다운로드를 요청했습니다. 휴대폰의 설치·검사 결과를 확인하세요. / File matches this release; download requested. Check your device’s installation and scan result.','success');
   } catch(error) {
    const code=controller.signal.aborted?(timedOut?'TIMEOUT':'CANCELED'):error.message;
    say(code==='CANCELED'?'다운로드를 취소했습니다. / Download canceled.':'파일을 확인하지 못해 다운로드를 중단했습니다. 연결 또는 배포 파일을 확인하세요. / Download stopped: file could not be verified. ('+code+')','error');
   } finally {
    clearTimeout(timer);if(reader){try{await reader.cancel();}catch(error){}}controller=null;busy=false;cancel.hidden=true;button.removeAttribute('aria-disabled');button.removeAttribute('aria-busy');
   }
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
