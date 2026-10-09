/**
 * Y2C release-scoped offline shell V88_21.
 * Compiled static assets use cache-first; API data and durable writes stay with AuthEngine.
 * Cache cleanup is restricted to this application path. IndexedDB queues are retained.
 */

"use strict";

const CACHE_VERSION = 'V88_21';
const SCOPE_URL = new URL(self.registration.scope);
const CACHE_FAMILY = `Y2C_ENTERPRISE_SCOPE_${encodeURIComponent(SCOPE_URL.pathname)}_`;
const STATIC_CACHE = `${CACHE_FAMILY}STATIC_${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_FAMILY}DYNAMIC_${CACHE_VERSION}`;
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
    '/assets/js/dashboard-session.js', '/assets/js/order-history.js',
    '/assets/js/mobile.js',
    '/assets/js/invoice-math.js',
    '/assets/js/document-io.js',
    '/Sinjeon_Logo_Pink.png',
    '/assets/js/config.js',
    '/assets/css/portal-shell.css',
    '/assets/css/mobile.css',
    '/assets/css/tailwind-admin.css',
    '/assets/css/tailwind-dashboard.css',
    '/assets/css/tailwind-index.css',
    '/assets/css/tailwind-invoice.css',
    '/assets/css/tailwind-items.css',
    '/assets/css/tailwind-recipes.css',
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
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log(`[Y2C SW Engine] Installing ${STATIC_CACHE}...`);
            // A partial rollout must not replace the last working offline shell.
            // A new release must not seed its permanent shell from stale HTTP-cache bytes.
            return cache.addAll(CORE_ASSETS.map(url => new Request(url, {cache: 'reload'})));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log(`[Y2C SW Engine] Activating ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                // 구버전 캐시 찌꺼기 100% 소각 (좀비 캐시 영구 차단)
                if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key.startsWith(CACHE_FAMILY)) {
                    console.log('[Y2C SW Engine] Obsolete Cache Destroyed:', key);
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim()) // 즉시 클라이언트 제어권 획득
    );
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
    if (inScope && CORE_URLS.has(canonical)) {
        event.respondWith((async()=>{
            const cache=await caches.open(STATIC_CACHE);
            const cached=await cache.match(canonical);
            if(cached)return cached;
            try {
                const response=await fetch(req);
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
    if (event.data && event.data.type === 'FLUSH_QUEUE') {
        keepAlive(event, flushQueue());
    } 
    // 🚨 프론트엔드(auth.js)에서 하달되는 모든 캐시 강제 소각 명령을 수신하여 즉각 수행
    else if (event.data && event.data.type === 'FORCE_NUKE') {
        keepAlive(event, caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_FAMILY)).map(key => caches.delete(key)))));
    }
});
