'use strict';
/* Execute the exact service-worker code in a deterministic runtime harness.
 * Fetch/CacheStorage are in-memory substitutes. This is NOT a browser SW install test.
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..'),code=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function harness(options={}){
 const listeners={},store=new Map(),network=[],deleted=[],messages=[];let mutations=0;
 const scope='https://fixture.invalid/portal/';
 // Immutable fetch response stub avoids Undici stream/finalizer coupling across vm realms.
 // Hashes are still computed by the real crypto API over the actual release bytes.
 const response=bytes=>({ok:true,status:200,type:'basic',redirected:false,
  clone:()=>response(bytes),arrayBuffer:async()=>Uint8Array.from(bytes).buffer,text:async()=>Buffer.from(bytes).toString('utf8')});
 const key=v=>typeof v==='string'?v:v.url;
 const caches={async keys(){return [...store.keys()];},async delete(name){deleted.push(name);return store.delete(name);},async open(name){
  if(options.unavailable)throw Error('Storage unavailable');
  if(!store.has(name))store.set(name,new Map());const rows=store.get(name);
  return {async match(req){return rows.get(key(req))?.clone();},async put(req,res){
   if(options.failPut && key(req).endsWith(options.failPut))throw Error('Quota');
   rows.set(key(req),res.clone());},async keys(){return [...rows.keys()];},async delete(req){return rows.delete(key(req));}};
 }};
 const self={registration:{scope},addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn);},clients:{matchAll:async()=>[
  {url:scope+'invoice.html',postMessage:x=>messages.push(x)},{url:'https://fixture.invalid/other/',postMessage:()=>{throw Error('Outside scope');}}]}};
 const env={self,URL,Request,Response,Headers,caches,crypto:webcrypto,AbortController,setTimeout,clearTimeout,console,Promise,Uint8Array,TextEncoder,
  fetch:async req=>{
   const url=key(req);network.push(url);if(options.offline)throw Error('Offline');
   const pathname=new URL(url).pathname.slice('/portal/'.length)||'index.html';
   let bytes;if(options.tamper===pathname)bytes=Buffer.from('WRONG RELEASE');else if(new URL(url).origin==='https://fixture.invalid'&&fs.existsSync(path.join(root,pathname)))bytes=fs.readFileSync(path.join(root,pathname));else bytes=Buffer.from('synthetic network data');
   return response(bytes);
  }};
 vm.createContext(env);vm.runInContext(code,env);
 async function event(type,extra={}){const pending=[];let response;const e={...extra,waitUntil:p=>pending.push(p),respondWith:p=>{response=p;}};(listeners[type]||[]).forEach(fn=>fn(e));const value=response?await response:undefined;await Promise.all(pending);return value;}
 const evaluate=x=>vm.runInContext(x,env);
 return {store,network,deleted,messages,caches,event,evaluate,scope,options};
}
test('worker verifies and installs every release asset without calling APIs',async()=>{
 const h=harness();await h.event('install');const key=h.evaluate('STATIC_CACHE'),cache=h.store.get(key);
 assert.equal(cache.size,h.evaluate('CORE_ASSETS.length'));assert.ok(h.network.every(u=>u.startsWith(h.scope)));assert.ok(cache.has(h.scope+'assets/js/invoice-pdf.js'));
});
test('tampered static source rejects installation before a cache is opened',async()=>{
 const h=harness({tamper:'invoice.html'});await assert.rejects(h.event('install'),/RELEASE_MISMATCH/);assert.equal(h.store.size,0);
});
test('cache quota failure rolls back only the new candidate after all writes finish',async()=>{
 const h=harness({failPut:'invoice.html'});h.store.set('previous-app-shell',new Map([['sentinel',new Response('keep')]]));
 await assert.rejects(h.event('install'),/Y2C_CACHE_WRITE_FAILED/);assert.ok(h.store.has('previous-app-shell'));assert.ok(!h.store.has(h.evaluate('STATIC_CACHE')));assert.deepEqual(h.deleted,[h.evaluate('STATIC_CACHE')]);
});
test('quota failure never removes a pre-existing current namespace',async()=>{
 const h=harness({failPut:'invoice.html'}),name=h.evaluate('STATIC_CACHE');h.store.set(name,new Map());
 await assert.rejects(h.event('install'),/Y2C_CACHE_WRITE_FAILED/);assert.ok(h.store.has(name));assert.deepEqual(h.deleted,[]);
});
test('activation only removes old caches in the exact application family',async()=>{
 const h=harness(),family=h.evaluate('CACHE_FAMILY');h.store.set(family+'STATIC_old',new Map());h.store.set('other-app-cache',new Map());h.store.set(h.evaluate('STATIC_CACHE'),new Map());
 await h.event('activate');assert.ok(!h.store.has(family+'STATIC_old'));assert.ok(h.store.has('other-app-cache'));assert.ok(h.store.has(h.evaluate('STATIC_CACHE')));
});
test('version-pinned shell works offline and ignores cache-busting query strings',async()=>{
 const h=harness();await h.event('install');h.options.offline=true;const count=h.network.length;
 const res=await h.event('fetch',{request:new Request(h.scope+'invoice.html?v=new')});assert.ok((await res.text()).includes('invoiceDocument'));assert.equal(h.network.length,count);
});
test('offline diagnostics never pretend a cached manifest is current',async()=>{
 const h=harness();await h.event('install');h.options.offline=true;
 const res=await h.event('fetch',{request:new Request(h.scope+'release-manifest.json',{headers:{accept:'text/html'}})});assert.equal(res.status,503);
});
test('business API GET and every POST bypass worker caches and queues',async()=>{
 const h=harness();for(const req of [new Request('https://script.google.com/macros/s/example/exec'),new Request(h.scope+'api',{method:'POST',body:'synthetic'})])assert.equal(await h.event('fetch',{request:req}),undefined);
 assert.equal(h.network.length,0);assert.equal(h.store.size,0);
});
test('unavailable storage falls back to verified static network bytes',async()=>{
 const h=harness({unavailable:true});const res=await h.event('fetch',{request:new Request(h.scope+'assets/js/invoice-pdf.js')});assert.ok((await res.text()).includes('Y2C_InvoicePDF'));
});
test('missing cached asset never falls back to a different release',async()=>{
 const h=harness({tamper:'invoice.html',unavailable:true});const res=await h.event('fetch',{request:new Request(h.scope+'invoice.html',{headers:{accept:'text/html'}})});assert.equal(res.status,503);
});
test('release status exposes no account or business data',async()=>{
 const h=harness();let response;await h.event('message',{data:{type:'Y2C_RELEASE_STATUS'},ports:[{postMessage:v=>{response=v;}}]});assert.equal(response.version,JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8')).version);assert.deepEqual(Object.keys(response).sort(),['digest','networkDiagnostics','version']);
});
test('background sync only asks in-scope pages to synchronize',async()=>{
 const h=harness();await h.event('sync',{tag:'y2c-flush-queue'});assert.equal(h.messages.length,1);assert.equal(h.messages[0].type,'Y2C_SYNC_REQUEST');assert.equal(h.network.length,0);
});
