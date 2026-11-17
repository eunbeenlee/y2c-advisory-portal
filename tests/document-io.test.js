'use strict';
/* Offline, dependency-free tests for the real exporter; no PDF engine/CDN calls. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function harness() {
    const hosts = [], saved = [], captured = [];
    const source = { isConnected: true, value: 'Original invoice', cloneNode() { const clone = {value: this.value, classList:{add(){}}, style:{setProperty(){}}, querySelectorAll:()=>[]}; captured.push(clone); return clone; } };
    const fonts = deferred(); fonts.resolve();
    const env = {
        console, Date, Promise, Set, setTimeout, clearTimeout,
        localStorage: { getItem: () => 'en' },
        document: { fonts: { ready: fonts.promise }, createElement: () => {
            const host = {style:{},setAttribute(){},appendChild(child){this.child=child;},remove(){const i=hosts.indexOf(this);if(i>=0)hosts.splice(i,1);}};
            return host;
        }, body: {appendChild:node=>hosts.push(node)} }
    };
    const pdf = { save:filename=>saved.push(filename) };
    let render = () => Promise.resolve(pdf), workerCount = 0;
    env.Y2C_InvoicePDF = {render:()=>{workerCount++;return render();}};
    env.window = env;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/document-io.js'),'utf8'),env);
    return {env,api:env.Y2C_DocumentIO,source,pdf,saved,hosts,captured,setRender(fn){render=fn;},workerCount:()=>workerCount};
}
test('successful export restores mixed disabled states and removes its temporary clone', async()=>{
    const h=harness(),buttons=[{disabled:false},{disabled:true}];
    assert.equal(await h.api.exportPDF(h.source,buttons,'invoice.pdf'),true);
    assert.deepEqual(buttons.map(b=>b.disabled),[false,true]);assert.equal(h.api.isBusy(),false);
    assert.deepEqual(h.saved,['invoice.pdf']);assert.equal(h.hosts.length,0);
});
test('snapshot is captured before asynchronous resource preparation', async()=>{
    const h=harness(),font=deferred();h.env.document.fonts.ready=font.promise;
    const task=h.api.exportPDF(h.source,[],'snapshot.pdf');h.source.value='Changed live invoice';
    font.resolve();await task;assert.equal(h.captured[0].value,'Original invoice');
});
test('a second click cannot start another renderer while the first is pending',async()=>{
    const h=harness(),render=deferred();h.setRender(()=>render.promise);
    const first=h.api.exportPDF(h.source,[],'first.pdf');await tick();
    assert.equal(await h.api.exportPDF(h.source,[],'second.pdf'),false);
    render.resolve(h.pdf);await first;assert.equal(h.workerCount(),1);assert.deepEqual(h.saved,['first.pdf']);
});
test('explicit cancellation unlocks controls and prevents a late PDF download',async()=>{
    const h=harness(),render=deferred(),buttons=[{disabled:false}];h.setRender(()=>render.promise);
    const first=h.api.exportPDF(h.source,buttons,'cancelled.pdf');await tick();assert.equal(h.api.cancelExport(),true);
    await assert.rejects(first,e=>e.code==='EXPORT_CANCELLED');render.resolve(h.pdf);await tick();
    assert.deepEqual(h.saved,[]);assert.equal(buttons[0].disabled,false);assert.equal(h.hosts.length,0);assert.equal(h.api.isBusy(),false);
});
test('timeout cannot initiate a delayed download and a subsequent export can succeed',async()=>{
    const h=harness(),render=deferred();h.setRender(()=>render.promise);
    await assert.rejects(h.api.exportPDF(h.source,[],'timeout.pdf',{timeoutMs:15}),e=>e.code==='EXPORT_TIMEOUT');
    render.resolve(h.pdf);await tick();assert.deepEqual(h.saved,[]);
    h.setRender(()=>Promise.resolve(h.pdf));await h.api.exportPDF(h.source,[],'retry.pdf');assert.deepEqual(h.saved,['retry.pdf']);
});
test('source revision or account change during rendering prevents saving',async()=>{
    const h=harness(),render=deferred();h.setRender(()=>render.promise);let current=true;
    const task=h.api.exportPDF(h.source,[],'stale.pdf',{isCurrent:()=>current});await tick();current=false;render.resolve(h.pdf);
    await assert.rejects(task,e=>e.code==='EXPORT_STALE');assert.deepEqual(h.saved,[]);assert.equal(h.hosts.length,0);
});
test('pre-existing stale state blocks even the initial snapshot',async()=>{
    const h=harness();await assert.rejects(h.api.exportPDF(h.source,[],'no.pdf',{isCurrent:()=>false}),e=>e.code==='EXPORT_STALE');
    assert.equal(h.captured.length,0);assert.equal(h.api.isBusy(),false);
});
test('missing engine or disconnected document cannot leave the interface locked',async()=>{
    const h=harness(),buttons=[{disabled:false}];h.source.isConnected=false;
    await assert.rejects(h.api.exportPDF(h.source,buttons,'x.pdf'),e=>e.code==='EXPORT_DOCUMENT');
    h.source.isConnected=true;h.env.Y2C_InvoicePDF=undefined;
    await assert.rejects(h.api.exportPDF(h.source,buttons,'x.pdf'),e=>e.code==='EXPORT_ENGINE');
    assert.equal(h.api.isBusy(),false);assert.equal(buttons[0].disabled,false);
});
test('render failure restores controls and leaves the source preview intact',async()=>{
    const h=harness(),buttons=[{disabled:false}];h.setRender(()=>Promise.reject(Error('Synthetic render failure')));
    await assert.rejects(h.api.exportPDF(h.source,buttons,'x.pdf'),/Synthetic render failure/);
    assert.equal(buttons[0].disabled,false);assert.equal(h.source.isConnected,true);assert.equal(h.hosts.length,0);
});
test('invalid engine result is rejected rather than claiming a successful download',async()=>{
    const h=harness();h.setRender(()=>Promise.resolve({}));
    await assert.rejects(h.api.exportPDF(h.source,[],'x.pdf'),e=>e.code==='EXPORT_ENGINE');assert.deepEqual(h.saved,[]);
});

test('stalled fonts time out before rendering and restore controls',async()=>{
    const h=harness(),fonts=deferred(),buttons=[{disabled:false}];h.env.document.fonts.ready=fonts.promise;
    await assert.rejects(h.api.exportPDF(h.source,buttons,'fonts.pdf',{timeoutMs:15}),e=>e.code==='EXPORT_TIMEOUT');
    fonts.resolve();await tick();assert.equal(h.workerCount(),0);assert.equal(buttons[0].disabled,false);assert.equal(h.hosts.length,0);
});
test('cancellation cannot claim to retract a save that already started',async()=>{
    const h=harness(),saving=deferred();h.pdf.save=filename=>{h.saved.push(filename);return saving.promise;};
    const task=h.api.exportPDF(h.source,[],'committed.pdf');await tick();
    assert.equal(h.api.cancelExport(),false);saving.resolve();assert.equal(await task,true);assert.deepEqual(h.saved,['committed.pdf']);
});
test('cooperative renderer guard stops work after cancellation',async()=>{
    const h=harness(),render=deferred();let check;
    h.env.Y2C_InvoicePDF={render:(clone,options)=>{check=options.check;return render.promise;}};
    const task=h.api.exportPDF(h.source,[],'late.pdf');await tick();h.api.cancelExport();
    await assert.rejects(task,e=>e.code==='EXPORT_CANCELLED');
    assert.throws(()=>check(),e=>e.code==='EXPORT_CANCELLED');render.resolve(h.pdf);await tick();assert.deepEqual(h.saved,[]);
});
test('progress callback errors cannot interrupt a successful export',async()=>{
    const h=harness();assert.equal(await h.api.exportPDF(h.source,[],'ok.pdf',{onProgress(){throw Error('UI handler failed');}}),true);
});
