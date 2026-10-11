/**
 * Y2C release-scoped offline shell V88_24_9.
 * Compiled static assets use cache-first; API data and durable writes stay with AuthEngine.
 * Cache cleanup is restricted to this application path. IndexedDB queues are retained.
 */

"use strict";

const CACHE_VERSION = 'V88_24_9';
const SCOPE_URL = new URL(self.registration.scope);
const CACHE_FAMILY = `Y2C_ENTERPRISE_SCOPE_${encodeURIComponent(SCOPE_URL.pathname)}_`;
// Generated hashes pin this worker to one complete release, including its cache namespace.
// BEGIN RELEASE INTEGRITY
const RELEASE_DIGEST = "a1f5823bd436fbc4";
const RELEASE_HASHES = {
  "Sinjeon_Logo_Pink.png": "9e1c774adf9a2a3421d2429ba6b92975ce7014d6de77ae63be5a597bf1820840",
  "admin.html": "add3f83c9fdf8c72b685e932185dc20f96c409ce7596ca198dea9b9c75176257",
  "assets/css/design-system.css": "bea729f0f8d21f0915355af188201587bd6e494e6d0f2ad22e7e3c2419209158",
  "assets/css/experience.css": "232e4ad9320cf96430bcdb6437cece857e2bf0a5319feb9817d04ea2997f6d4b",
  "assets/css/mobile.css": "fb4081df3732f0c114c1454b2d89f99e0bc0f04c7f963d2079a7f5b681b9ce51",
  "assets/css/order-review.css": "395836d644bb8b397eb922f47e3240d5306dd65a07c45c7594abf6fd1356365b",
  "assets/css/portal-shell.css": "067d9893f62184ae9562336d7fd5c2d8b2483cbf575441d46abd944530463272",
  "assets/css/pwa.css": "a339d72f954d49cf624c445b3ae7f54c248bd1873d13d816a177b2d213054bcd",
  "assets/css/tailwind-admin.css": "70f6a90bed832bfd526e731c7ef7fc48072c43f94d538829aa7bf7e1981734a2",
  "assets/css/tailwind-dashboard.css": "923c0894d3505729c627dff0ffeb44f9c46c7f8096032c30a39aa638ac3242c7",
  "assets/css/tailwind-index.css": "136b5fdd3674b719fb365098840d565f32732e46e2d2225d371b1801107e03bc",
  "assets/css/tailwind-invoice.css": "eece7c70ef8295cb05ca9f0452938e6da703e4e30014241c7453598fbc8d443d",
  "assets/css/tailwind-items.css": "b4b23dbe25dc05e9024ee2cf26db77b09c7582e38e0d8961ac720fe38d25ebd9",
  "assets/css/tailwind-recipes.css": "54e1d574b2a522bea36a2448e015894bcc26a9e23cad1a72fbf224e802f78126",
  "assets/icons/app-180.png": "f40d04aa8dedaf2a31cf7695aa7e8e86efa8bcc98011e44aa74120784396f806",
  "assets/icons/app-192.png": "72c906f6ba1c691868034b7f5c600c5941c93152c97596e654275b2c9da05ee3",
  "assets/icons/app-512.png": "075e0e43b10f03a6fd6032274699c08ef9240b6363602ad62a820a1edf5ada81",
  "assets/icons/app-maskable-512.png": "009950f64e51709b8651a0a51401ef9a7fdb619c82ea2a997d0cd24f8a3f6f79",
  "assets/js/accelerator.js": "25bfef1c509bd75bf66a81ff533f8ec65f41a94b8c05a34656d6249db5602f74",
  "assets/js/android-install.js": "8b2958f055b95aae67803d9a8da31ad0308d8991d3437378053623c70310de95",
  "assets/js/auth.js": "aff0359f7830f49b3311b6f9944da70f415f6dd7988274131d54b1ad5a6211eb",
  "assets/js/config.js": "d106fabb29915958f998d8b5e0076d6612a1cb49f8a30fe134cc91f35d281d0a",
  "assets/js/dashboard-session.js": "3c1a2020be7d93638e0ea18160bd31abb8588e7fe0248d0ed98b101ed82d0093",
  "assets/js/document-io.js": "f60b1370a2acd82ef9b935fc9dc3ad257a38872152c89ad7d7864688f9986143",
  "assets/js/excel-model.js": "b45fe8227526711a55d441617d8393e1eadbeef3f7d3551a9668eb8f5e0c2aed",
  "assets/js/excel-worker.js": "691d6ce5cbfd938a48d2617fb40ae42fde1e5333bccc71611bd027577b89074c",
  "assets/js/experience.js": "261b82c613f52560a5829ed3e335237f2fce37cb29afd49c1bc8c284418e7e50",
  "assets/js/invoice-math.js": "510aaef3c5b9de56fe36a4a93e5a5ed909365e0de318d61da406fd3240f9a65e",
  "assets/js/mobile.js": "e85feeb47029fb39495246abd7649bdf695776d0d0e0121418f116f8d60d0311",
  "assets/js/mutation-ui.js": "42770e9c2f4c672a0026882116e9a8aa47db030483c9d0f20809d4b95705bf43",
  "assets/js/operations-monitor.js": "3c9af2dd194d09477a3bf27e8073ad1fbc93f104494ddf48608a9a46cffd308b",
  "assets/js/order-history.js": "58ef29de11a6203fc22ebb198b6c73e223b3256d3f88c32c75f983b21c2ac581",
  "assets/js/order-math.js": "78b2ef2662f77f650d35a7f11133fbe9c8b9430fed7fb7e7bed4574a5d888750",
  "assets/js/order-review.js": "4916e6c7d8d2f03aa0a901a7ada0419a6945e373182199e778299d3dc61f2daf",
  "assets/js/portal-dialog.js": "3ce70238b0597af1e935996d644e0aed849ee2d2a20b7ea4b53d947615bc8353",
  "assets/js/price-editor.js": "293db60560e57dc14f469ba3475c1d54ebf58bd365363e56323547a1c03261f9",
  "assets/js/pwa.js": "854e61da543a183a38aa728752ba5bf541eb324cbf297caf4645ce0159e9b53d",
  "dashboard.html": "60cc7d89bc783eb614ebe35c6aee3f66dd6aad26d51373e456c9f596bcbdb12b",
  "favicon.png": "493619db1d0e64e0dda864f0111347058325a2da1fdb0924a63d684dff9b03f3",
  "index.html": "42d0df7c6010afbc2ee11fd91b76f569ce6b99ccbc7f70a19ca644d643d9123d",
  "install.html": "ebd231ac3a3d5c0f9f85b96b37e9cac389117c9775bcf955183b12e88dffe135",
  "invoice.html": "6e7d34f0adcb37822ab2f930b65990b0cea2e9b603794f09bff94aa3280925b8",
  "items.html": "2bb52987a4689cfb84fc34a0c44e21939bad51d1e9436b686e2a7e8b4ad1cb56",
  "manifest.json": "d8ca5a2034d0eb079d4def2e79af057502dbf5922dfc85258f4d7c5cc2dc3029",
  "recipes.html": "513dbaab8844e78b0f294f8daaee3704750b47201ec583bd72d04d3ac55edfb3",
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
    '/index.html',
    '/dashboard.html',
    '/admin.html',
    '/items.html',
    '/recipes.html',
    '/invoice.html',
    '/assets/js/auth.js',
    '/assets/js/accelerator.js',
    '/assets/js/mutation-ui.js',
    '/assets/js/excel-model.js',
    '/assets/js/excel-worker.js',
    '/assets/js/dashboard-session.js', '/assets/js/order-history.js', '/assets/js/operations-monitor.js',
    '/assets/js/mobile.js', '/assets/js/price-editor.js', '/assets/js/order-math.js', '/assets/js/order-review.js', '/assets/css/order-review.css',
    '/assets/js/invoice-math.js',
    '/assets/js/document-io.js',
    '/Sinjeon_Logo_Pink.png',
    '/assets/js/config.js',
    '/assets/js/experience.js', '/assets/css/experience.css',
    '/assets/css/portal-shell.css', '/assets/css/design-system.css', '/assets/js/portal-dialog.js',
    '/assets/css/mobile.css',
    '/assets/css/tailwind-admin.css',
    '/assets/css/tailwind-dashboard.css',
    '/assets/css/tailwind-index.css',
    '/assets/css/tailwind-invoice.css',
    '/assets/css/tailwind-items.css',
    '/assets/css/tailwind-recipes.css',
    '/install.html', '/assets/css/pwa.css', '/assets/js/pwa.js', '/assets/js/android-install.js',
    '/assets/icons/app-180.png', '/assets/icons/app-192.png', '/assets/icons/app-512.png', '/assets/icons/app-maskable-512.png',
    '/manifest.json',
    '/favicon.png',
    '/y2c_holdings_logo.png'
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
            const cache=await caches.open(STATIC_CACHE);
            const cached=await cache.match(canonical);
            if(cached)return cached;
            try {
                const response=await verifiedAsset(canonical, req);
                if(response.status===200 && response.type==='basic')keepAlive(event,cache.put(canonical,response.clone()));
                return response;
            } catch(error){return offlineResponse(req);}
        })().catch(()=>fetch(req).catch(()=>offlineResponse(req))));
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
