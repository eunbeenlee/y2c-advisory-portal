'use strict';
/* Actual page-script smoke checks in JSDOM. No layout, pixels, charts or PDF rendering are asserted.
 * Install jsdom for the test runtime, then: NODE_PATH=/path/to/node_modules node tests/ui-dom.js
 * Business responses come only from the synthetic, mutation-blocking UI browser fixture.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
const fixtureLiteral=fs.readFileSync(path.join(__dirname,'ui-browser.js'),'utf8').match(/const fixture=(`[^]*?`);/)[1];
const fixture=vm.runInNewContext(fixtureLiteral);
const results=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate){for(let i=0;i<40;i++){if(predicate())return;await pause(25);}assert.ok(predicate(),'Expected DOM update did not complete');}
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name);}
(async()=>{
 for(const pageName of ['index','admin','items','recipes','dashboard']){
  const errors=[],blocked=[];const console=new VirtualConsole();console.on('jsdomError',e=>{if(!String(e.message).includes('CSS'))errors.push(e.message);});
  const role=pageName==='items'?'PARTNER':'MASTER';
  const dom=new JSDOM(fs.readFileSync(path.join(root,pageName+'.html'),'utf8'),{url:'https://local-ui-test.invalid/'+pageName+'.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
   w.localStorage.setItem('y2c_lang','en');
   if(pageName!=='index'){
    const c={exp:Math.floor(Date.now()/1000)+3600,role,clientName:role==='PARTNER'?'Sample Toronto':'Sample HQ',id:'LOCAL_ONLY_UI_ACCOUNT',region:'ON',allowedStates:['ON']};
    w.localStorage.setItem('y2c_token','local.'+Buffer.from(JSON.stringify(c)).toString('base64')+'.fixture');w.localStorage.setItem('y2c_role',role);w.localStorage.setItem('y2c_client',c.clientName);w.localStorage.setItem('y2c_region','ON');
   }
   w.fetch=async url=>{blocked.push(String(url));throw Error('Unexpected network request in local DOM test');};
   w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
   w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.alert=()=>{};
   w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  }});
  const w=dom.window,d=w.document;
  try{
   const defer=[];
   for(const s of d.querySelectorAll('script')){
    if(s.type&&s.type!=='text/javascript')continue;
    const src=s.getAttribute('src');let code=s.textContent;
    if(src){const local=src.split('?')[0];if(/^https?:/.test(local)||/\/(performance|pwa|android-install)\.js$/.test(local))continue;code=local==='assets/js/auth.js'?fixture:fs.readFileSync(path.join(root,local),'utf8');}
    if(s.defer)defer.push(code);else w.eval(code);
   }
   defer.forEach(code=>w.eval(code));await pause(100);
   await check(pageName+' scripts initialize without uncaught errors',()=>assert.deepEqual(errors,[]));
   if(pageName==='index'){
    await check('login has accurately named required password fields',()=>{assert.equal(d.querySelector('#userId').required,true);assert.equal(d.querySelector('#userPw').required,true);assert.equal(d.querySelector('label[for="userPw"]').textContent,'Password');assert.equal(d.body.textContent.includes('Secure Auth Level 4'),false);});
   }
   if(pageName==='admin'){
    await until(()=>d.querySelector('#masterTableBody').textContent.includes('Sample Toronto'));
    await check('admin master list and all four tabs render',()=>{assert.equal(d.querySelectorAll('#masterTableBody tr').length,2);for(const id of ['tab-franchise','tab-sales','tab-excel','tab-procurement']){d.querySelector('#adminSubNav [data-target="'+id+'"]').click();assert.equal(d.getElementById(id).classList.contains('active'),true);}});
    await check('procurement selector has keyboard semantics and opens/closes',async()=>{const trigger=d.querySelector('#btnOpenItemModal');assert.equal(trigger.getAttribute('role'),'button');assert.equal(trigger.tabIndex,0);assert.match(trigger.getAttribute('onkeydown'),/Enter/);trigger.click();assert.equal(d.querySelector('#itemSelectionModal').classList.contains('hidden'),false);d.querySelector('#btnCloseModal').click();await until(()=>d.querySelector('#itemSelectionModal').classList.contains('hidden'));});
   }
   if(pageName==='items'){
    await until(()=>d.querySelectorAll('#catalogTableBody tr').length===4);
    await check('catalog search renders the matching real row',async()=>{const q=d.querySelector('#catalogSearchInput');q.value='Fish';q.dispatchEvent(new w.Event('input',{bubbles:true}));await until(()=>d.querySelectorAll('#catalogTableBody tr').length===1);assert.match(d.querySelector('#catalogTableBody').textContent,/Fish Cake/);});
   }
   if(pageName==='recipes'){
    await until(()=>d.querySelectorAll('[data-recipe-id]').length===3);
    await check('recipe card opens correct detail and closes',async()=>{d.querySelector('[data-recipe-id="RC-001"]').click();assert.equal(d.querySelector('#modalRecipeTitle').textContent,'Original Tteokbokki');assert.equal(d.querySelector('#recipeModal').classList.contains('hidden'),false);d.querySelector('#btnCloseModal').click();await until(()=>d.querySelector('#recipeModal').classList.contains('hidden'));});
   }
   if(pageName==='dashboard'){
    await until(()=>d.querySelectorAll('.order-history-card').length===1);
    await check('dashboard renders fixture order and operations summaries',()=>{assert.match(d.querySelector('#orderHistoryList').textContent,/QA-2026-001/);assert.match(d.querySelector('#operationsContent').textContent,/96\.05/);assert.equal(d.querySelector('#kpiClientSelector').options.length>=2,true);});
   }
   await check(pageName+' Korean text and accessible names update',()=>{w.localStorage.setItem('y2c_lang','ko');if(w.changeLanguage)w.changeLanguage('ko');else d.dispatchEvent(new w.Event('y2c-language-changed'));assert.equal(d.documentElement.lang,'ko');if(pageName==='items')assert.equal(d.querySelector('#catalogSearchInput').getAttribute('aria-label'),'상품명 또는 코드 검색');if(pageName==='index')assert.equal(d.querySelector('label[for="userPw"]').textContent,'비밀번호');});
   await check(pageName+' remains read-only with zero outbound requests',()=>{assert.deepEqual(Array.from(w.__uiFixture.writes),[]);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);});
  }finally{dom.window.close();}
 }
 console.log(JSON.stringify({passed:results.length,results,visualRenderingTested:false,liveBusinessApiTested:false},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
