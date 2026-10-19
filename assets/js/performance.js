/* Read-path acceleration. No business data, account identifiers, URLs or automatic telemetry. */
(function(w){
 'use strict';
 const libraries=Object.freeze({
  charts:{url:'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js',ready:()=>typeof w.Chart==='function'},
  ocr:{url:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js',ready:()=>!!w.Tesseract?.createWorker},
  excel:{url:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',ready:()=>!!w.XLSX?.read}
 });
 const allowedAPI=new Set(['login','get_orders','get_ops_monitor','get_session_context','get_master_data','get_sales_records','get_dashboard','get_invoice','get_items','get_procurement_data','get_recipes','check_system_alerts','save_order','update_stock','update_price','cancel_order','update_order_status','review_order_mail','upsert_hq_order','update_hq_order_status','update_master_data','save_sales_records']);
 const flights=new Map(),samples=[],prefetched=new Set();
 const clock=()=>w.performance?.now?.()??Date.now();
 function start(kind,name){
  const began=clock();let done=false;
  return ok=>{if(done)return;done=true;samples.push({kind,name,ms:Math.max(0,Math.round(clock()-began)),ok:ok===true});if(samples.length>100)samples.shift();};
 }
 function load(name){
  const lib=libraries[name];if(!lib)return Promise.reject(Error('Unknown optional library'));
  if(lib.ready())return Promise.resolve();if(flights.has(name))return flights.get(name);
  const finish=start('library',name);
  const promise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');let settled=false,timer;
   const complete=error=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;finish(!error);if(error){script.remove();reject(Error('기능 파일을 불러오지 못했습니다. 연결 확인 후 다시 시도하세요. / Unable to load this feature. Check your connection and retry.'));}else resolve();};
   script.src=lib.url;script.async=true;
   script.onload=()=>complete(lib.ready()?null:Error('Library unavailable'));
   script.onerror=()=>complete(Error('Library connection failed'));
   timer=setTimeout(()=>complete(Error('Library timed out')),15000);
   document.head.append(script);
  });
  flights.set(name,promise);
  promise.finally(()=>{if(flights.get(name)===promise)flights.delete(name);}).catch(()=>{});
  return promise;
 }
 function libraryNotice(canvasId,retry){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  const id='portal-library-notice-'+canvasId;let box=document.getElementById(id);
  if(!retry){box?.remove();return;}
  if(!box){box=document.createElement('p');box.id=id;box.className='ux-muted';box.setAttribute('role','status');canvas.parentElement.before(box);}
  box.replaceChildren();const text=document.createElement('span'),button=document.createElement('button');
  text.textContent='차트 연결을 확인해 주세요. 금액과 표는 계속 확인할 수 있습니다. / Chart unavailable; totals and table remain available. ';
  button.type='button';button.className='ux-button';button.textContent='차트 다시 불러오기 / Retry chart';button.addEventListener('click',()=>{button.disabled=true;retry();});box.append(text,button);
 }
 function prefetch(event){
  const connection=w.navigator.connection;
  if(document.hidden||w.navigator.onLine===false||connection?.saveData||/^(slow-)?2g$/.test(connection?.effectiveType||''))return;
  const a=event.target.closest?.('a[href]');if(!a)return;
  const role=w.Y2C_AuthEngine?.getAccountRole?.();
  const pages={MASTER:['dashboard.html','items.html','recipes.html','admin.html','invoice.html'],PARTNER:['dashboard.html','items.html','recipes.html'],VENDOR:['admin.html','items.html']};
  if(!pages[role])return;
  let url;try{url=new URL(a.href,w.location.href);}catch(_){return;}
  const base=new URL('.',w.location.href);
  if(url.origin!==base.origin||url.search||url.hash)return;
  const file=url.pathname.slice(base.pathname.length);
  if(!url.pathname.startsWith(base.pathname)||!pages[role].includes(file)||url.pathname===w.location.pathname||prefetched.has(file)||prefetched.size>=2)return;
  prefetched.add(file);const link=document.createElement('link');link.rel='prefetch';link.as='document';link.href=url.href;document.head.append(link);
 }
 w.Y2C_Performance={load,libraryNotice,startAPI:action=>allowedAPI.has(action)?start('api',action):()=>{},
  report:()=>({version:'READ_ACCEL_V1',localOnly:true,automaticTransmission:false,samples:samples.map(x=>({...x}))})};
 // User intent only: no speculative API reads and no loading pages outside the visible role.
 document.addEventListener('pointerover',prefetch,{passive:true});document.addEventListener('focusin',prefetch);
})(window);
