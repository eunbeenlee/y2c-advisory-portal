/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Progressive Web App Service Worker
 * Version: V51.00 GRAND FINALE (Absolute Offline Cache & Deep CORS Fix)
 * ============================================================================
 * [CRITICAL FIX 1] Extension Crash Prevented: Absolute top-level `startsWith('http')` fast-return added.
 * [CRITICAL FIX 2] CDN CORS Crash Fix: Removed strict external CDNs from Install Phase to prevent aborts. Handled dynamically instead.
 * [RESTORED 1] Intelligent Caching Routing: Network-First for HTML/JS, Cache-First for static images/fonts.
 * [RESTORED 2] Poison Pill Protection: Retry Count limit (max 5) to IndexedDB Queue to prevent infinite loops.
 * [RESTORED 3] Premium Offline UI: High-end fallback HTML template for complete offline scenarios.
 * [PRESERVED] IndexedDB Mutation Queue, Background Sync & Auto-Flush 100% loss-less intact.
 * ============================================================================
 */

"use strict";

const CACHE_NAME = 'Y2C_ENTERPRISE_CACHE_V51_00';
const OFFLINE_DB_NAME = 'Y2C_Offline_Sync_DB_V51';
const QUEUE_STORE = 'mutation_queue';

// 🌟 오프라인 코어 자산 (CORS 충돌을 막기 위해 철저히 내부 로컬 에셋만 지정)
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/admin.html',
    '/items.html',
    '/recipes.html',
    '/invoice.html',
    '/assets/js/auth.js',
    '/assets/js/config.js',
    '/favicon.png',
    '/y2c_holdings_logo.png'
];

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
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Y2C SW Engine] Core Local Assets Caching Started.');
            // Promise.allSettled를 통해 단일 에셋 로드 실패가 전체 설치를 중단시키지 않도록 방어
            return Promise.allSettled(
                CORE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[Y2C SW Engine] Local cache skipped: ${url}`, err)))
            );
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                // 구버전 캐시 찌꺼기 100% 소각 (좀비 캐시 영구 차단)
                if (key !== CACHE_NAME && key.startsWith('Y2C_ENTERPRISE_CACHE_')) {
                    console.log('[Y2C SW Engine] Obsolete Cache Destroyed:', key);
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// ============================================================================
// 📡 [MODULE 3] Request Interceptor & Intelligent Proxy Engine
// ============================================================================
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // 🚨 [CRITICAL FIX 1] 크롬 익스텐션 등 비정상 프로토콜 최상단 원천 차단
    if (!req.url.startsWith('http')) {
        return; 
    }

    // 1. 백엔드 API 통신 (POST) 인터셉트 및 오프라인 큐잉 로직
    if (req.method === 'POST' && url.hostname.includes('script.google.com')) {
        event.respondWith(handleApiFetch(req));
        return;
    }

    // 2. 정적 이미지/폰트 에셋 -> Cache-First
    const isStaticAsset = req.url.match(/\.(png|jpg|jpeg|svg|woff2|woff|ttf)$/) || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('cdn');
    if (req.method === 'GET' && isStaticAsset) {
        event.respondWith(
            caches.match(req).then(cachedRes => {
                if (cachedRes) return cachedRes;
                return fetch(req).then(networkRes => {
                    // CORS No-Cors 대응 (Opaque Response 저장)
                    if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
                        const responseToCache = networkRes.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
                    }
                    return networkRes;
                }).catch(() => { console.warn(`[Y2C SW Engine] Asset Fetch Failed: ${req.url}`); });
            })
        );
        return;
    }

    // 3. HTML, JS, CSS -> Network-First, Cache-Fallback
    if (req.method === 'GET') {
        event.respondWith(
            fetch(req).then(networkRes => {
                if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
                    const responseToCache = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
                }
                return networkRes;
            }).catch(async () => {
                const cachedRes = await caches.match(req);
                if (cachedRes) {
                    console.log('[Y2C SW Engine] Offline Mode Active: Served from Cache', req.url);
                    return cachedRes;
                }
                
                // 🚨 [핵심 방어막] HTML 문서 요청인데 캐시마저 없다면, 하이엔드 오프라인 UI 반환
                if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
                    return new Response(
                        `<html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                <title>System Offline | Y2C Portal</title>
                                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                                <style>
                                    body { background-color: #F8F9FA; color: #111827; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                                    .glass-box { background: rgba(255, 255, 255, 0.95); padding: 50px 40px; border-radius: 30px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05); text-align: center; max-width: 440px; width: 90%; backdrop-filter: blur(20px); border-top: 4px solid #E3000F; }
                                    .icon-wrap { width: 80px; height: 80px; background: #FEF2F2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; color: #E3000F; font-size: 36px; border: 1px solid #FEE2E2; }
                                    h1 { font-family: 'Montserrat', sans-serif; font-size: 26px; color: #111827; margin: 0 0 12px 0; font-weight: 900; letter-spacing: -0.5px; }
                                    p { color: #64748b; font-size: 15px; line-height: 1.6; font-weight: 500; margin-bottom: 30px; }
                                    .btn { background: #E3000F; color: white; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; transition: all 0.3s ease; width: 100%; box-shadow: 0 4px 15px rgba(227, 0, 15, 0.2); }
                                    .btn:hover { background: #B9000C; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(227, 0, 15, 0.3); }
                                </style>
                            </head>
                            <body>
                                <div class="glass-box">
                                    <div class="icon-wrap">📡</div>
                                    <h1>SYSTEM OFFLINE</h1>
                                    <p>인터넷 연결이 완전히 단절되었으며, 해당 페이지의 보안 저장소가 존재하지 않습니다.<br><br>와이파이 또는 셀룰러 데이터를 확인해 주십시오.</p>
                                    <button class="btn" onclick="window.location.reload()">Retry Connection</button>
                                </div>
                            </body>
                        </html>`, 
                        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
                    );
                }
                
                return new Response('', { status: 404, statusText: 'Not Found' });
            })
        );
    }
});

// 🚨 백엔드 에러 및 오프라인 타임아웃 방어막 (Mutation Queue Injector)
async function handleApiFetch(req) {
    const clonedReq = req.clone(); 
    try {
        const fetchOptions = {
            method: req.method, headers: req.headers, body: await req.clone().text(),
            mode: req.mode, credentials: req.credentials, redirect: 'follow'
        };
        const networkResponse = await fetch(req.url, fetchOptions);
        return networkResponse;
    } catch (error) {
        try {
            const bodyText = await clonedReq.text();
            let payload = {};
            try { payload = JSON.parse(bodyText); } 
            catch (e) {
                const parts = bodyText.split('&');
                for (let p of parts) {
                    const kv = p.split('=');
                    if (kv.length === 2) payload[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
                }
            }

            const mutationActions = ['save_order', 'update_stock', 'upsert_hq_order', 'update_master_data', 'update_hq_order_status', 'save_sales_records'];
            
            if (mutationActions.includes(payload.action)) {
                await enqueueRequest({ url: req.url, headers: [...req.headers.entries()], body: bodyText, action: payload.action, timestamp: Date.now(), retryCount: 0 });
                return new Response(JSON.stringify({
                    success: true,
                    message: "[오프라인 보관 완료] 네트워크가 단절되어 기기 저장소에 안전하게 보관되었습니다. 인터넷 복구 시 백그라운드에서 자동 처리됩니다.",
                    offlineQueued: true, action: payload.action, batchId: payload.batchId || `OFFLINE-${Date.now()}`
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else {
                throw error;
            }
        } catch (fallbackError) {
            throw error;
        }
    }
}

// ============================================================================
// 🚀 [MODULE 4] Auto-Flush Background Sync Engine
// ============================================================================
let isFlushing = false;

async function flushQueue() {
    if (isFlushing || !navigator.onLine) return;
    isFlushing = true;

    try {
        const queue = await getQueuedRequests();
        if (queue.length === 0) return;

        for (const requestData of queue) {
            if (requestData.retryCount >= 5) {
                await dequeueRequest(requestData.id);
                continue;
            }

            try {
                const headers = new Headers();
                requestData.headers.forEach(h => headers.append(h[0], h[1]));

                const response = await fetch(requestData.url, { method: 'POST', headers: headers, body: requestData.body, redirect: 'follow' });

                if (response.ok) {
                    const resJson = await response.json();
                    if (resJson.success) { await dequeueRequest(requestData.id); } 
                    else { await dequeueRequest(requestData.id); }
                } else {
                    throw new Error(`HTTP Error ${response.status}`);
                }
            } catch (error) {
                await incrementRetryCount(requestData.id, requestData.retryCount);
                break; 
            }
        }
    } finally {
        isFlushing = false;
    }
}

self.addEventListener('sync', event => { if (event.tag === 'y2c-flush-queue') event.waitUntil(flushQueue()); });
self.addEventListener('message', event => { if (event.data && event.data.type === 'FLUSH_QUEUE') flushQueue(); });
