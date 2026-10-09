/* Capture only after resources are ready; all locks are restored in finally. */
(function(global){
 'use strict';let busy=false;
 async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' 준비 시간이 초과되었습니다. 다시 시도하십시오.')),10000);})]);}finally{clearTimeout(timer);}}
 async function resources(element){
  if(document.fonts)await bounded(document.fonts.ready,'글꼴');
  await Promise.all(Array.from(element.querySelectorAll('img')).map(async img=>{
   if(!img.complete){let cleanup=()=>{};try{await bounded(new Promise((resolve,reject)=>{
    const loaded=()=>resolve(),failed=()=>reject(new Error('문서 이미지를 불러오지 못했습니다.'));
    cleanup=()=>{img.removeEventListener('load',loaded);img.removeEventListener('error',failed);};
    img.addEventListener('load',loaded,{once:true});img.addEventListener('error',failed,{once:true});
   }),'이미지');}finally{cleanup();}}
   if(!img.naturalWidth)throw new Error('문서 이미지가 준비되지 않았습니다.');
   if(img.decode)await bounded(img.decode(),'이미지 해독');
  }));
 }
 global.Y2C_DocumentIO={isBusy:()=>busy,exportPDF:async function(element,controls,filename){
  if(busy)return false;if(typeof global.html2pdf!=='function')throw new Error('PDF 엔진을 불러오지 못했습니다. 페이지를 새로고침하거나 인쇄를 사용하십시오.');
  busy=true;const states=controls.filter(Boolean).map(button=>({button,disabled:button.disabled}));let host;
  states.forEach(({button})=>button.disabled=true);
  try{
   await resources(element);
   const clone=element.cloneNode(true);clone.classList.add('pdf-export-mode');
   // The live preview is preserved; lengthy periods may span multiple A4 pages.
   for(const [key,value]of Object.entries({width:'794px',height:'auto','max-height':'none','min-height':'1122px',overflow:'visible',transform:'none',margin:'0'}))clone.style.setProperty(key,value,'important');
   host=document.createElement('div');host.setAttribute('aria-hidden','true');host.inert=true;
   host.style.cssText='position:absolute;left:-10000px;top:0;width:794px;pointer-events:none;background:white;';host.appendChild(clone);document.body.appendChild(host);
   await resources(clone);
   const options={margin:0,filename,image:{type:'jpeg',quality:1},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy'],avoid:['tr','.avoid-page-break']}};
   await global.html2pdf().set(options).from(clone).save();return true;
  }finally{if(host)host.remove();states.forEach(({button,disabled})=>button.disabled=disabled);busy=false;}
 }};
})(window);
