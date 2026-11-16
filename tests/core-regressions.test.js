/* Run with: node --test tests/core-regressions.test.js
 * All transport and storage operations are simulated; no live API is called. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const math=require('../assets/js/order-math.js');

test('order estimates round exact half-cents up for Alberta and Quebec',()=>{
 assert.equal(math.quote({A:1},[{code:'A',price:80.30}],'AB').tax,4.02);
 assert.equal(math.quote({A:1},[{code:'A',price:260}],'QC').tax,38.94);
});
test('mixed tax lines retain cent-exact subtotal, per-line taxes and total',()=>{
 const q=math.quote({A:3,B:2,C:1},[{code:'A',price:19.99,taxType:'ZERO_RATED'},{code:'B',price:0.05},{code:'C',price:80.30}],'AB');
 assert.equal(q.subtotal,140.37);assert.equal(q.tax,4.03);assert.equal(q.total,144.40);
 assert.deepEqual(q.lines.map(x=>x.tax),[0,.01,4.02]);
});
test('invalid order quantity, price and combined amount never produce a quote',()=>{
 assert.throws(()=>math.quote({A:1.5},[{code:'A',price:1}],'ON'));
 assert.throws(()=>math.quote({A:1},[{code:'A',price:.001}],'ON'));
 assert.throws(()=>math.quote({A:Number.MAX_SAFE_INTEGER},[{code:'A',price:1}],'ON'));
 assert.throws(()=>math.quote({A:1},[{code:'A',price:null}],'ON'));
});

function authHarness(){
 let now=1800000000000,nextTimer=0;const timers=new Map(),events=[],store=new Map(),redirects=[];
 const token='header.'+Buffer.from(JSON.stringify({id:'test-owner',role:'MASTER',clientName:'Test',exp:2000000000})).toString('base64url')+'.signature';
 store.set('y2c_token',token);store.set('y2c_region','ON');
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const env={console:{log(){},warn(){},error(){}},TextDecoder,Uint8Array,AbortController,Response,Blob,atob,
  navigator:{onLine:true},localStorage:storage,sessionStorage:{getItem:()=>null,removeItem(){},setItem(){}},
  Date:class extends Date{static now(){return now;}},
  setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,at:now+delay});return id;},clearTimeout(id){timers.delete(id);},
  setInterval(){return 1;},clearInterval(){},addEventListener(){},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},
  document:{readyState:'loading',addEventListener(){},getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}}},
  SYSTEM_CONFIG:{API:{BASE_URL:'https://example.invalid/api',TIMEOUT_MS:1000,MAX_RETRIES:0},STORAGE_KEYS:{USER_TOKEN:'y2c_token',REGION:'y2c_region'}},
  location:{replace:value=>redirects.push(value)},fetch:async()=>{throw new TypeError('Failed to fetch');}};
 env.window=env;
 const source=fs.readFileSync(path.join(__dirname,'../assets/js/auth.js'),'utf8');
 // Private collaborators are exposed only in this isolated test context.
 vm.runInNewContext(source.replace('global.Y2C_AuthEngine = Object.freeze(AuthEngine);',
  'global.__test={OfflineEngine,IntentRegistry,RequestPolicy,SyncDaemon,NetworkEngine,SessionManager};global.Y2C_AuthEngine=Object.freeze(AuthEngine);'),env,{filename:'auth.js'});
 const h=env.__test,rows=[{id:1,owner:'test-owner',intentKey:'intent-1',action:'save_order',payload:{requestId:'stable-request',batchId:'stable-batch',clientState:'ON'},timestamp:now,status:'QUEUED',retryCount:0}],sent=[],commits=[];
 h.OfflineEngine.migrateLegacy=async()=>{};
 h.OfflineEngine.getQueuedRequests=async()=>rows.filter(r=>['QUEUED','FAILED_RETRYABLE','AUTH_REQUIRED'].includes(r.status));
 h.OfflineEngine.claim=async()=>true;
 h.OfflineEngine.updateRecord=async(id,patch)=>Object.assign(rows.find(r=>r.id===id),patch);
 h.OfflineEngine.dequeueRequest=async(id)=>{rows.splice(rows.findIndex(r=>r.id===id),1);return true;};
 h.IntentRegistry.setState=async(...args)=>commits.push(args);
 const fail=env.fetch;
 env.fetch=async(url,opts)=>{sent.push(JSON.parse(opts.body));return fail();};
 return {env,h,rows,sent,commits,timers,events,store,redirects,
  succeed(){env.fetch=async(url,opts)=>{sent.push(JSON.parse(opts.body));return {ok:true,text:async()=>JSON.stringify({success:true,message:'Saved'})};};},
  setTime(value){now=value;},now:()=>now};
}

test('a retried queued save reuses its original request and order identity',async()=>{
 const a=authHarness();await a.h.SyncDaemon.flushQueue();
 assert.equal(a.rows[0].status,'FAILED_RETRYABLE');assert.equal(a.rows[0].retryCount,1);
 a.succeed();a.setTime(a.rows[0].nextAttemptAt);await a.h.SyncDaemon.flushQueue();
 assert.equal(a.rows.length,0);assert.equal(a.sent.length,2);
 assert.equal(a.sent[0].requestId,a.sent[1].requestId);assert.equal(a.sent[0].batchId,a.sent[1].batchId);
 assert.equal(a.commits[0][1],'DONE');
});
test('a queued save waits until its retry time',async()=>{
 const a=authHarness();a.rows[0].nextAttemptAt=a.now()+12345;
 await a.h.SyncDaemon.flushQueue();assert.equal(a.sent.length,0);
});
test('retry pauses after the fifth queue failure instead of looping indefinitely',async()=>{
 const a=authHarness();a.rows[0].retryCount=4;await a.h.SyncDaemon.flushQueue();
 assert.equal(a.rows[0].status,'RETRY_PAUSED');a.setTime(a.now()+100000);
 await a.h.SyncDaemon.flushQueue();assert.equal(a.sent.length,1);
});
test('queued work cannot submit after logout',async()=>{
 const a=authHarness();await a.h.SyncDaemon.flushQueue();
 a.store.delete('y2c_token');a.setTime(a.now()+100000);await a.h.SyncDaemon.flushQueue();
 assert.equal(a.sent.length,1);assert.equal(a.rows.length,1);
});
test('an explicit AUTH failure signs out even when the message is not Korean',async()=>{
 const a=authHarness();a.env.fetch=async()=>({ok:true,text:async()=>JSON.stringify({success:false,errorType:'AUTH',message:'Account verification failed'})});
 await assert.rejects(()=>a.h.NetworkEngine.dispatch('get_items'),/Account verification failed/);
 assert.equal(a.store.has('y2c_token'),false);assert.deepEqual(a.redirects,['index.html']);
});
test('shared HTML escaping preserves zero values and encodes markup',()=>{
 const a=authHarness();assert.equal(a.env.Y2C_AuthEngine.escapeHtml(0),'0');
 assert.equal(a.env.Y2C_AuthEngine.escapeHtml('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
});


function procurementHarness(){
 const nodes=new Map(),sent=[],warnings=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerText:'',innerHTML:'',handlers:{},classList:{add(){},remove(){}},addEventListener(event,fn){this.handlers[event]=fn;}});return nodes.get(id);};
 node('procHubSelect').value='ON';node('procVendorName').value='Vendor';node('procShippingMethod').value='NONE';node('procItemsSummary').value='A: 1';
 const env={window:null,AppState:{role:'MASTER',cart:{A:1},catalogItems:[{code:'A',name:'Sample',stockBreakdown:{ON:100}}],isSubmitting:false,isBooting:false},
  document:{getElementById:node,body:{style:{}}},setTimeout(){},
  Y2C_AuthEngine:{cacheSessionKey:()=> 'session-1',escapeHtml:String,inlineArgs:JSON.stringify,showToast:message=>warnings.push(message)},
  Y2C_Accelerator:{renderReactively(){}},Y2C_MutationUI:{submit:async(action,payload)=>sent.push({action,payload})},
  procurementFields:()=>[],refreshProcurementSafely:async()=>{},updatePendingStatus(){},
  Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-11-17T02:00:00Z']));}},
  modal:node('itemSelectionModal'),modalPanel:node('itemModalPanel'),btnOpen:node('btnOpenItemModal'),btnClose:node('btnCloseModal'),backdrop:node('itemModalBackdrop'),btnConfirm:node('btnConfirmModal')};
 env.window=env;
 const html=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');
 const start=html.indexOf("        document.getElementById('procHubSelect')?.addEventListener('change'"),end=html.indexOf('        const statusModal = ',start);
 assert.ok(start>=0&&end>start,'active procurement code must be present');
 vm.runInNewContext(html.slice(start,end),env,{filename:'admin-procurement-inline.js'});
 return {env,node,sent,warnings};
}
test('closing the procurement picker discards edits until selection is confirmed',()=>{
 const a=procurementHarness();a.env.openModal();a.env.updateModalCart('A',1);
 assert.equal(a.env.AppState.cart.A,1,'the submitted cart must not change during selection');
 a.env.closeModal();assert.equal(a.env.AppState.cart.A,1);assert.equal(a.node('procItemsSummary').value,'A: 1');
 a.env.openModal();a.env.updateModalCart('A',1);a.node('btnConfirmModal').handlers.click();
 assert.equal(a.env.AppState.cart.A,2);assert.equal(a.node('procItemsSummary').value,'A: 2');
});
test('procurement payload summary and quantities always describe the same selection',async()=>{
 const a=procurementHarness();a.env.AppState.cart.A=3;a.node('procItemsSummary').value='A: 999';
 await a.node('btnSubmitProcurement').handlers.click();
 assert.equal(a.sent.length,1);assert.equal(a.sent[0].payload.order.items,'A: 3');
 assert.equal(a.sent[0].payload.order.lineItems[0].qty,3);assert.equal(a.sent[0].payload.order.lineItems[0].code,'A');
});
test('a procurement picker cannot commit a draft after the selected hub changes',()=>{
 const a=procurementHarness();a.env.openModal();a.env.updateModalCart('A',1);
 a.node('procHubSelect').value='BC';a.node('procHubSelect').handlers.change();a.node('btnConfirmModal').handlers.click();
 assert.equal(Object.keys(a.env.AppState.cart).length,0);assert.equal(a.node('procItemsSummary').value,'');assert.equal(a.warnings.length,1);
});

test('new procurement orders use the Toronto business date, not the next UTC date',async()=>{
 const a=procurementHarness();await a.node('btnSubmitProcurement').handlers.click();
 assert.equal(a.sent[0].payload.order.date,'2026-11-16');
});
