/**
 * Y2C release-scoped offline shell V88_25_0.
 * Compiled static assets use cache-first; API data and durable writes stay with AuthEngine.
 * Cache cleanup is restricted to this application path. IndexedDB queues are retained.
 */

"use strict";

const CACHE_VERSION = "V88_29_0";
const SCOPE_URL = new URL(self.registration.scope);
const CACHE_FAMILY = `Y2C_ENTERPRISE_SCOPE_${encodeURIComponent(SCOPE_URL.pathname)}_`;
// Generated hashes pin this worker to one complete release, including its cache namespace.
// BEGIN RELEASE INTEGRITY
const RELEASE_DIGEST = "87e6ea74ada84ec5";
const RELEASE_HASHES = {
  "Sinjeon_Logo_Pink.png": "9e1c774adf9a2a3421d2429ba6b92975ce7014d6de77ae63be5a597bf1820840",
  "admin.html": "11b148aa0d1b2628916651cb949eedc4beb39ac42183e1e078f69d6a2ec96d6f",
  "assets/css/design-system.css": "bea729f0f8d21f0915355af188201587bd6e494e6d0f2ad22e7e3c2419209158",
  "assets/css/experience.css": "232e4ad9320cf96430bcdb6437cece857e2bf0a5319feb9817d04ea2997f6d4b",
  "assets/css/mobile.css": "d1d6fb2c26e9ce7ab234839f0dfca1d2cd57b217b8f4936307754e31718e5788",
  "assets/css/order-lifecycle.css": "94650791e70752e4cf6b839a7c8cbd3b584226fc1fe1e7f3d228fee878e2d4d7",
  "assets/css/order-review.css": "395836d644bb8b397eb922f47e3240d5306dd65a07c45c7594abf6fd1356365b",
  "assets/css/portal-shell.css": "067d9893f62184ae9562336d7fd5c2d8b2483cbf575441d46abd944530463272",
  "assets/css/pwa.css": "a339d72f954d49cf624c445b3ae7f54c248bd1873d13d816a177b2d213054bcd",
  "assets/css/tailwind-admin.css": "70f6a90bed832bfd526e731c7ef7fc48072c43f94d538829aa7bf7e1981734a2",
  "assets/css/tailwind-dashboard.css": "923c0894d3505729c627dff0ffeb44f9c46c7f8096032c30a39aa638ac3242c7",
  "assets/css/tailwind-index.css": "136b5fdd3674b719fb365098840d565f32732e46e2d2225d371b1801107e03bc",
  "assets/css/tailwind-invoice.css": "eece7c70ef8295cb05ca9f0452938e6da703e4e30014241c7453598fbc8d443d",
  "assets/css/tailwind-items.css": "b4b23dbe25dc05e9024ee2cf26db77b09c7582e38e0d8961ac720fe38d25ebd9",
  "assets/css/tailwind-recipes.css": "54e1d574b2a522bea36a2448e015894bcc26a9e23cad1a72fbf224e802f78126",
  "assets/css/workspace-ui.css": "047426dc84745a0de26300391dced89c8570a2d90c5222ff8448c52ebe6f5945",
  "assets/fonts/OFL.txt": "d31ddd9f2bed32fd7e302a205cf2380ba0de6529152d239ef99cfb6f261bfc04",
  "assets/fonts/PretendardVariable.woff2": "9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4",
  "assets/icons/app-180.png": "f40d04aa8dedaf2a31cf7695aa7e8e86efa8bcc98011e44aa74120784396f806",
  "assets/icons/app-192.png": "72c906f6ba1c691868034b7f5c600c5941c93152c97596e654275b2c9da05ee3",
  "assets/icons/app-512.png": "075e0e43b10f03a6fd6032274699c08ef9240b6363602ad62a820a1edf5ada81",
  "assets/icons/app-maskable-512.png": "009950f64e51709b8651a0a51401ef9a7fdb619c82ea2a997d0cd24f8a3f6f79",
  "assets/js/accelerator.js": "10e2d71c85f685568fe8890b96fd0effdac8f250b7bfd79d8805ece3c2081cf7",
  "assets/js/android-install.js": "fa536168eb9e39347cc103ba8aef99021c68b5f742beaf5c23ecad2f0ce5531d",
  "assets/js/auth.js": "6392493a26c3d5ed1b8800fc0fa13042484333208682f5f464179285585ebce0",
  "assets/js/config.js": "d106fabb29915958f998d8b5e0076d6612a1cb49f8a30fe134cc91f35d281d0a",
  "assets/js/dashboard-session.js": "3c1a2020be7d93638e0ea18160bd31abb8588e7fe0248d0ed98b101ed82d0093",
  "assets/js/document-io.js": "f60b1370a2acd82ef9b935fc9dc3ad257a38872152c89ad7d7864688f9986143",
  "assets/js/excel-model.js": "4521b345147de0c7ca95a05088fef5a69e676c286a1a534e71847b81146c1420",
  "assets/js/excel-worker.js": "3db9c5d433b9c7c5772919e22c61cd9c1a853ba0213a04d57b8a602ff3b92303",
  "assets/js/experience.js": "f35242d2b6cb3e6de8ed18b61466a7ccc24ef5a5dc03f3fedec1ff0286870fdf",
  "assets/js/inventory-import.js": "6c633487fda1b62732ab03a005e9e25225bc532f615c3775a8fd36e5098da03f",
  "assets/js/inventory-ocr.js": "b0aaf905f88f6c3a472072fc5e61789c115b3c3c3b8e0a252b2b1be9a792760c",
  "assets/js/inventory-workspace.js": "090e6ed61ce8935fe57a98b10fac5427be4eb86651bc56e07d38a2beb24159b8",
  "assets/js/invoice-math.js": "510aaef3c5b9de56fe36a4a93e5a5ed909365e0de318d61da406fd3240f9a65e",
  "assets/js/mobile.js": "acde86948b5d226ffd0da405571043fe7b72ba6a5079e962789e3fa00e2ba71b",
  "assets/js/mutation-ui.js": "b7eb24d5d9e972027514439947c80ee5d982dd648162f9e983d95a6325a46478",
  "assets/js/operations-monitor.js": "419ca6717aa17fe474191b2f1220ae219fce703b5c62ca6c6fae3a8cdb91c5b0",
  "assets/js/order-history.js": "00293d848eeaa83beff891496febdf506aa7854dac62aa6af6c69cc34b005bc5",
  "assets/js/order-math.js": "78b2ef2662f77f650d35a7f11133fbe9c8b9430fed7fb7e7bed4574a5d888750",
  "assets/js/order-review.js": "4916e6c7d8d2f03aa0a901a7ada0419a6945e373182199e778299d3dc61f2daf",
  "assets/js/performance.js": "b081112c4dc804d9615166a5793585acd54593f03dccdca5382be04d01de876d",
  "assets/js/portal-dialog.js": "3ce70238b0597af1e935996d644e0aed849ee2d2a20b7ea4b53d947615bc8353",
  "assets/js/price-editor.js": "7c838069b80a1c79f786bcda29e16b91848d78995a21b704cbf8a4ced1957ced",
  "assets/js/pwa.js": "854e61da543a183a38aa728752ba5bf541eb324cbf297caf4645ce0159e9b53d",
  "assets/js/workspace-ui.js": "be3b88f1102ae9259634a5ac112142c1427fb81c5946bcb1e951ba810a6bebbc",
  "dashboard.html": "608ec97cb3f4b5f0d118c041153e58c6adc6d7859c606dd39320808a8e20d76f",
  "favicon.png": "493619db1d0e64e0dda864f0111347058325a2da1fdb0924a63d684dff9b03f3",
  "index.html": "dfe6e663ce5ef4a4667e88fb84d2990547d373f9cdb9eadf6d2d925ce557fe47",
  "install.html": "d55860dfddb3d09aa86bf48bcba878731ec2eabea703a0e0dd3f7071582c5ef4",
  "invoice.html": "170999bae58647846a52dbfc9e0d82232c3c8db270c67f3fa7cb993818e35efd",
  "items.html": "7db2eb3b8a2a0671dbc532c67eec9466fcb52ead0d40fae9ac9a6e15b23087e4",
  "manifest.json": "d8ca5a2034d0eb079d4def2e79af057502dbf5922dfc85258f4d7c5cc2dc3029",
  "recipes.html": "13943fbc6639e1480e52da716c31ee19f8b39a3a116872c2601af6635dbaf776",
  "y2c_holdings_logo.png": "0369ebf9bea898e3ad65320da67f1963704da85e2665a36caf6419089d9d6097"
};
// END RELEASE INTEGRITY
const STATIC_CACHE = `${CACHE_FAMILY}STATIC_${CACHE_VERSION}_${RELEASE_DIGEST}`;
const DYNAMIC_CACHE = `${CACHE_FAMILY}DYNAMIC_${CACHE_VERSION}_${RELEASE_DIGEST}`;
const OFFLINE_DB_NAME = 'Y2C_Offline_Sync_DB_V88';
const QUEUE_STORE = 'mutation_queue';

// 🌟 오프라인 코어 자산 (최소 부팅에 필요한 필수 파일들)
const CORE_ASSETS = [
    '/',
    '/Sinjeon_Logo_Pink.png',
    '/admin.html',
    '/assets/css/design-system.css',
    '/assets/css/experience.css',
    '/assets/css/mobile.css',
    '/assets/css/order-lifecycle.css',
    '/assets/css/order-review.css',
    '/assets/css/portal-shell.css',
    '/assets/css/pwa.css',
    '/assets/css/tailwind-admin.css',
    '/assets/css/tailwind-dashboard.css',
    '/assets/css/tailwind-index.css',
    '/assets/css/tailwind-invoice.css',
    '/assets/css/tailwind-items.css',
    '/assets/css/tailwind-recipes.css',
    '/assets/css/workspace-ui.css',
    '/assets/fonts/OFL.txt',
    '/assets/fonts/PretendardVariable.woff2',
    '/assets/icons/app-180.png',
    '/assets/icons/app-192.png',
    '/assets/icons/app-512.png',
    '/assets/icons/app-maskable-512.png',
    '/assets/js/accelerator.js',
    '/assets/js/android-install.js',
    '/assets/js/auth.js',
    '/assets/js/config.js',
    '/assets/js/dashboard-session.js',
    '/assets/js/document-io.js',
    '/assets/js/excel-model.js',
    '/assets/js/excel-worker.js',
    '/assets/js/experience.js',
    '/assets/js/inventory-import.js',
    '/assets/js/inventory-ocr.js',
    '/assets/js/inventory-workspace.js',
    '/assets/js/invoice-math.js',
    '/assets/js/mobile.js',
    '/assets/js/mutation-ui.js',
    '/assets/js/operations-monitor.js',
    '/assets/js/order-history.js',
    '/assets/js/order-math.js',
    '/assets/js/order-review.js',
    '/assets/js/performance.js',
    '/assets/js/portal-dialog.js',
    '/assets/js/price-editor.js',
    '/assets/js/pwa.js',
    '/assets/js/workspace-ui.js',
    '/dashboard.html',
    '/favicon.png',
    '/index.html',
    '/install.html',
    '/invoice.html',
    '/items.html',
    '/manifest.json',
    '/recipes.html',
    '/y2c_holdings_logo.png',
].map(path => new URL(path.replace(/^\//,''), self.registration.scope).href);

// ============================================================================
// 💾 [MODULE 1] IndexedDB Offline Queue Manager
// ============================================================================
function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(OFFLINE_DB_NAME, 1);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function enqueueRequest(requestData) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(QUEUE_STORE, 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const record = { ...requestData, retryCount: requestData.retryCount || 0, timestamp: requestData.timestamp || Date.now() };
        store.put(record);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getQueuedRequests() {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(QUEUE_STORE, 'readonly');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function dequeueRequest(id) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(QUEUE_STORE, 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function incrementRetryCount(id, currentCount) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(QUEUE_STORE, 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.get(id);
        request.onsuccess = () => {
            const data = request.result;
            if (data) {
                data.retryCount = currentCount + 1;
                store.put(data);
            }
        };
        transaction.oncomplete = () => resolve();
    });
}

// ============================================================================
// ⚙️ [MODULE 2] Service Worker Lifecycle Hooks
// ============================================================================
async function verifiedAsset(url, request) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const relative = new URL(url).pathname.slice(SCOPE_URL.pathname.length) || 'index.html';
    try {
        const response = await fetch(new Request(request || url, {cache:'reload', signal:controller.signal}));
        if (!response.ok || response.redirected || response.type === 'opaque') throw new Error('HTTP_' + response.status);
        const expected = RELEASE_HASHES[relative];
        const bytes = await response.clone().arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), v => v.toString(16).padStart(2, '0')).join('');
        if (!expected || digest !== expected) throw new Error('RELEASE_MISMATCH');
        return response;
    } catch(error) {
        throw new Error('Y2C_ASSET ' + relative + ': ' + (error.name === 'AbortError' ? 'TIMEOUT' : error.message));
    } finally { clearTimeout(timer); }
}
async function installRelease() {
    // Validate every asset before opening a new cache. Missing/mixed files leave the active shell intact.
    const responses = new Array(CORE_ASSETS.length);
    let cursor = 0;
    await Promise.all(Array.from({length:6}, async () => {
        while (cursor < CORE_ASSETS.length) {
            const i = cursor++;
            responses[i] = await verifiedAsset(CORE_ASSETS[i]);
        }
    }));
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(CORE_ASSETS.map((url,i) => cache.put(url,responses[i])));
    // Intentionally wait for existing tabs/windows to close. Never replace an active order form.
}
self.addEventListener('install', event => { event.waitUntil(installRelease()); });
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_FAMILY) && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
    )).catch(() => {})); // Cleanup failure must not disable a verified new shell.
    // No clients.claim(): an already rendered network page keeps its original assets until navigation.
});

// ============================================================================
// 🧹 [MODULE 3] LRU Dynamic Cache Garbage Collector
// ============================================================================
// The compiled shell belongs to this release. API responses never enter CacheStorage.
const CORE_URLS = new Set(CORE_ASSETS);
const ASSET_HOSTS = new Set(['fonts.gstatic.com', 'fonts.googleapis.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'lh3.googleusercontent.com']);

async function limitCacheSize(name, size) {
    const cache = await caches.open(name), keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - size)).map(key => cache.delete(key)));
}
function keepAlive(event, promise) {
    const safe = promise.catch(() => {}); // Cache quota failure must not fail a successful network read.
    if (typeof event.waitUntil === 'function') event.waitUntil(safe);
}
function offlineResponse(request) {
    if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
        return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><title>연결 확인 | Y2C Portal</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f8f9fa;color:#111827;font:16px system-ui,sans-serif}main{max-width:28rem;padding:2rem}button{min-height:44px;padding:.75rem 1.5rem;background:#e3000f;color:white;border:0;border-radius:.5rem;font:inherit}p{line-height:1.6}</style></head><body><main><h1>연결을 확인해 주세요</h1><p>이 화면은 아직 오프라인으로 저장되지 않았습니다. 인터넷 연결 후 다시 시도해 주세요. 대기 중인 저장 요청은 유지됩니다.</p><button onclick="location.reload()">다시 시도</button></main></body></html>`, {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
    return Response.error();
}

self.addEventListener('fetch', event => {
    const req=event.request, url=new URL(req.url);
    if (!/^https?:$/.test(url.protocol) || req.method !== 'GET') return;
    // Google web app redirects, all mutations, and foreign application data stay native.
    if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com' || url.hostname === 'googleapis.com' || url.hostname.endsWith('.googleapis.com')) return;
    const inScope=url.origin===SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname);
    const canonical=new URL(url.pathname,SCOPE_URL).href;
    // Diagnostics must inspect the network even when an older shell is cached.
    if (inScope && (url.searchParams.get('y2c_diagnostic') === '1' || /(?:app-health\.html|release-manifest\.json)$/.test(url.pathname))) {
        event.respondWith(fetch(new Request(req, {cache:'no-store'})).catch(()=>offlineResponse(req)));
        return;
    }
    if (inScope && CORE_URLS.has(canonical)) {
        event.respondWith((async()=>{
            // CacheStorage can be unavailable. Network fallback must still belong to this release.
            let cache=null;
            try {
                cache=await caches.open(STATIC_CACHE);
                const cached=await cache.match(canonical);
                if(cached)return cached;
            } catch(error) { cache=null; }
            try {
                const response=await verifiedAsset(canonical, req);
                if(cache && response.status===200 && response.type==='basic')keepAlive(event,cache.put(canonical,response.clone()));
                return response;
            } catch(error){return offlineResponse(req);}
        })());
        return;
    }
    const asset=(inScope && /\.(png|jpe?g|svg|webp|gif|ico|woff2?|ttf|css|js)$/i.test(url.pathname)) || ASSET_HOSTS.has(url.hostname);
    if(asset){
        event.respondWith((async()=>{
            const cache=await caches.open(DYNAMIC_CACHE), cached=await cache.match(req);
            if(cached)return cached;
            try {
                const response=await fetch(req);
                if(response.status===200 || response.type==='opaque')keepAlive(event,cache.put(req,response.clone()).then(()=>limitCacheSize(DYNAMIC_CACHE,100)));
                return response;
            }catch(error){return offlineResponse(req);}
        })().catch(()=>fetch(req).catch(()=>offlineResponse(req))));
        return;
    }
    // Unknown same-app navigations get a readable offline error, never cached user data.
    if(inScope && req.mode==='navigate')event.respondWith(fetch(req).catch(()=>offlineResponse(req)));
});

// 🚨 오프라인 큐잉을 위한 인젝터 로직 (온라인일 때는 브라우저가 알아서 처리하므로 여기 도달하지 않음)
async function handleApiFetch(req) {
    // The page owns authentication and the durable queue; never acknowledge locally here.
    return fetch(req);
}

// ============================================================================
// 🚀 [MODULE 5] Auto-Flush Background Sync Engine
// ============================================================================
let isFlushing = false;

async function flushQueue() {
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    clients.forEach(client=>{
        try { const url=new URL(client.url); if(url.origin===SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname))client.postMessage({type:'Y2C_SYNC_REQUEST'}); } catch(error) {}
    });
    // Legacy records are retained and migrated by the authenticated page.
}

// ============================================================================
// 💣 [MODULE 6] Deep Nuke Action Listener
// ============================================================================
self.addEventListener('sync', event => { 
    if (event.tag === 'y2c-flush-queue') event.waitUntil(flushQueue()); 
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'Y2C_RELEASE_STATUS') {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({version:CACHE_VERSION, digest:RELEASE_DIGEST, networkDiagnostics:true});
    }
    else if (event.data && event.data.type === 'FLUSH_QUEUE') {
        keepAlive(event, flushQueue());
    } 
    // 🚨 프론트엔드(auth.js)에서 하달되는 모든 캐시 강제 소각 명령을 수신하여 즉각 수행
    else if (event.data && event.data.type === 'FORCE_NUKE') {
        keepAlive(event, caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_FAMILY)).map(key => caches.delete(key)))));
    }
});
