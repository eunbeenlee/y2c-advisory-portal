'use strict';
/* Local visual smoke check. All business reads use synthetic fixtures; all writes fail.
 * NODE_PATH=<playwright location> node tests/ui-browser.js --browser /path/to/chromium --chart-bundle /path/chart.umd.min.js
 * Supply the unmodified Chart.js 4.5.1 bundle to exercise the real charts offline.
 */
const fs=require('node:fs'),fsp=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const output=path.resolve(arg('--output',path.resolve(root,'..','ui-qa')));
const fixture=`
window.__uiFixture={calls:[],toasts:[],writes:[]};
const fixtureRole=()=>localStorage.getItem('y2c_role')||'';
const fixtureItems=[
 {code:'SJ-001',name:'Original Tteokbokki Sauce',category:'Sauces',price:42.5,stock:48,stockBreakdown:{ON:48},reservedBreakdown:{ON:8},expBreakdown:{ON:'2027-06-30:48'},taxable:true},
 {code:'SJ-002',name:'Rice Cake · 1 kg × 10',category:'Frozen',price:65,stock:72,stockBreakdown:{ON:72},reservedBreakdown:{ON:12},expBreakdown:{ON:'2027-08-31:72'},taxable:false},
 {code:'SJ-003',name:'Fish Cake',category:'Frozen',price:38.75,stock:8,stockBreakdown:{ON:8},reservedBreakdown:{ON:0},expBreakdown:{ON:'2027-04-30:8'},taxable:false},
 {code:'SJ-004',name:'Takeout Containers · 500 pcs',category:'Packaging',price:56,stock:30,stockBreakdown:{ON:30},reservedBreakdown:{ON:5},expBreakdown:{ON:'-'},taxable:true}
];
const fixtureClients=[{rowIdx:2,name:'Sample Toronto',state:'ON',city:'Toronto',address:'Local QA fixture',attn:'Store manager',email:'toronto@example.invalid',bizId:'TEST123'},{rowIdx:3,name:'Sample North York',state:'ON',city:'North York',address:'Local QA fixture',attn:'Store manager',email:'north-york@example.invalid',bizId:'TEST456'}];
const fixtureSales=Array.from({length:12},(_,i)=>({month:i+1,pos:18000+i*600,delivery:12000+i*450,total:30000+i*1050}));
const fixtureOrder={id:'QA-2026-001',clientName:'Sample Toronto',region:'ON',date:'2026-11-15T14:00:00Z',status:'PREPARING',subtotal:85,tax:11.05,total:96.05,items:[{code:'SJ-001',name:'Original Tteokbokki Sauce',qty:2,price:42.5,total:85,status:'PREPARING',vendorName:'Sample supplier',inventoryModel:'RESERVE_AT_ORDER_V1',canManage:false}],lifecycle:{revision:1,events:[{event:'PLACED',at:'2026-11-15T14:00:00Z',actor:'Sample Toronto',role:'PARTNER',from:'',to:'PENDING'},{event:'PREPARING',at:'2026-11-16T10:00:00Z',actor:'Sample supplier',role:'VENDOR',from:'CONFIRMED',to:'PREPARING'}]},cancellation:{hold:false}};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.Y2C_AuthEngine={
 cacheSessionKey:()=>localStorage.getItem('y2c_token')?'LOCAL_ONLY_UI_'+fixtureRole():null,
 cacheKey:k=>k,verifiedCacheKey:async k=>k,getReadRevision:()=>0,
 getAccountId:()=>localStorage.getItem('y2c_token')?'LOCAL_ONLY_UI_ACCOUNT':null,getAccountRole:fixtureRole,getRole:fixtureRole,
 onReadInvalidated:()=>()=>{},onPendingChanged:()=>()=>{},onNetworkStatus:()=>()=>{},getPendingTransactions:async()=>[],getNetworkStatus:()=>[],
 bindLogoutButton:()=>{},logout:()=>{},saveLoginSession:()=>{},escapeHtml,inlineArgs:(...a)=>escapeHtml(a.map(v=>JSON.stringify(v)).join(',')),showToast:(m,t)=>window.__uiFixture.toasts.push({message:m,type:t}),
 request:async(action,params={})=>{
  window.__uiFixture.calls.push({action,params});
  if(!action.startsWith('get_')){window.__uiFixture.writes.push(action);throw new Error('Local QA blocks all mutations');}
  if(action==='get_session_context')return {success:true,id:'LOCAL_ONLY_UI_ACCOUNT',clientName:localStorage.getItem('y2c_client'),role:fixtureRole()};
  if(action==='get_master_data')return {success:true,clients:fixtureClients};
  if(action==='get_sales_records')return {success:true,records:fixtureSales};
  if(action==='get_items')return {success:true,items:fixtureItems,appliedState:'ON'};
  if(action==='get_procurement_data')return {success:true,hqOrders:[],mappings:[{state:'ON',region:'ON',vendor:'Sample supplier',vendorName:'Sample supplier'}]};
  if(action==='get_orders')return {success:true,viewerRole:fixtureRole(),orders:[fixtureOrder],totalCount:1,hasMore:false,canUpdateStatus:false,canCancel:false,serverTime:'2026-11-16T15:00:00Z'};
  if(action==='get_ops_monitor')return {success:true,readOnly:true,pendingCount:0,mappingIssueCount:0,amountDataErrors:0,activeOrderAmount:96.05,statusLineCounts:{PREPARING:1},shipmentReadiness:{ready:true,reservedBoxes:25,reservationLines:1,legacyLines:0,issues:[]},vendorReadiness:{issues:[],accounts:[],issueCount:0},priceChanges:[],mappingIssues:[],events:[],audit:[],errors:[]};
  if(action==='get_recipes')return {success:true,recipes:[{id:'RC-001',title:'Original Tteokbokki',category:'Tteokbokki',ingredients:'Rice cakes 200 g\\nSauce 50 g\\nWater 200 ml',instructions:'1. Bring water to a boil.\\n2. Add sauce and rice cakes.\\n3. Simmer and serve.',tips:'Follow the approved portion size.'},{id:'RC-002',title:'Cheese Tteokbokki',category:'Tteokbokki',ingredients:'Rice cakes 200 g\\nMozzarella 30 g',instructions:'1. Prepare original tteokbokki.\\n2. Add mozzarella and melt.'},{id:'RC-003',title:'Fish Cake Soup',category:'Sides',ingredients:'Fish cake 100 g\\nStock 250 ml',instructions:'1. Heat the stock.\\n2. Add fish cake and simmer.'}]};
  throw Error('Unexpected local fixture action '+action);
 }
};
`;
(async()=>{
 await fsp.mkdir(output,{recursive:true});
 const chartPath=arg('--chart-bundle',''),chart=chartPath?await fsp.readFile(chartPath):null;
 const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||file.includes('/.git/'))throw Error();const data=await fsp.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 const results=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:arg('--browser',process.env.CHROMIUM_PATH||'/usr/bin/chromium'),args:['--no-sandbox']});
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   for(const pageName of ['index','dashboard','admin','items','recipes']){
    const suffix=viewport.width===1440?'desktop':'mobile';
    const context=await browser.newContext({viewport,locale:'en-CA',timezoneId:'America/Toronto',serviceWorkers:'block',reducedMotion:'reduce'});
    const role=pageName==='items'?'PARTNER':'MASTER';
    await context.addInitScript(({pageName,role})=>{
     localStorage.setItem('y2c_lang','en');
     if(pageName!=='index'){
      const claims={exp:Math.floor(Date.now()/1000)+3600,role,clientName:role==='PARTNER'?'Sample Toronto':'Sample HQ',id:'LOCAL_ONLY_UI_ACCOUNT',region:'ON',allowedStates:['ON']};
      localStorage.setItem('y2c_token','local.'+btoa(JSON.stringify(claims))+'.fixture');
      localStorage.setItem('y2c_role',role);localStorage.setItem('y2c_client',claims.clientName);localStorage.setItem('y2c_region','ON');
     }
    },{pageName,role});
    const external=[],errors=[],consoleErrors=[];
    await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/assets/js/auth.js'))return route.fulfill({contentType:'application/javascript',body:fixture});if(url.startsWith(origin+'/'))return route.continue();if(url==='https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js'&&chart)return route.fulfill({contentType:'application/javascript',body:chart});external.push(url);return route.abort('blockedbyclient');});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await page.goto(origin+'/'+pageName+'.html',{waitUntil:'networkidle'});
    assert.equal(new URL(page.url()).pathname,'/'+pageName+'.html','Fixture must stay on requested page');
    if(pageName==='items')await page.waitForFunction(()=>document.querySelector('#catalogTableBody').textContent.includes('Original Tteokbokki'));
    if(pageName==='recipes')await page.waitForFunction(()=>document.querySelectorAll('[data-recipe-id]').length===3);
    if(pageName==='admin')await page.waitForFunction(()=>document.querySelector('#masterTableBody').textContent.includes('Sample Toronto'));
    if(pageName==='dashboard')await page.waitForFunction(()=>document.querySelectorAll('.order-history-card').length===1);
    await page.screenshot({path:path.join(output,pageName+'-'+suffix+'.png'),fullPage:true});
    const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:Array.from(document.querySelectorAll('main *')).filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left<-2)&&getComputedStyle(n).position!=='fixed';}).slice(0,10).map(n=>({tag:n.tagName,id:n.id,width:n.getBoundingClientRect().width}))}));
    assert.ok(overflow.width<=overflow.viewport+2,JSON.stringify({pageName,suffix,...overflow}));
    if(pageName==='admin'){
     for(const id of ['tab-sales','tab-excel','tab-procurement']){await page.locator('#adminSubNav [data-target="'+id+'"]').click();assert.equal(await page.locator('#'+id).isVisible(),true);}
     await page.locator('#adminSubNav [data-target="tab-excel"]').click();await page.locator('#tab-excel').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'admin-stock-'+suffix+'.png')});
    }
    if(pageName==='recipes'){
     await page.locator('[data-recipe-id]').first().click();assert.equal(await page.locator('#recipeModalPanel').isVisible(),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#recipeModal').classList.contains('hidden'));
    }
    if(pageName!=='index'){
     await page.evaluate(()=>window.changeLanguage('ko'));assert.equal(await page.locator('html').getAttribute('lang'),'ko');
     if(pageName==='items')assert.equal(await page.locator('#catalogSearchInput').getAttribute('aria-label'),'상품명 또는 코드 검색');
    }
    const writes=await page.evaluate(()=>window.__uiFixture.writes);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.equal(external.some(u=>/script\.google(?:usercontent)?\.com/.test(u)),false);
    results.push({page:pageName,viewport:suffix,passed:true,overflow,consoleErrors,blockedExternal:external});console.log('PASS '+pageName+' '+suffix);await context.close();
   }
  }
  await fsp.writeFile(path.join(output,'ui-results.json'),JSON.stringify({results,chartEngineTested:!!chart,liveBusinessApiTested:false},null,2));console.log('UI QA output '+output);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
