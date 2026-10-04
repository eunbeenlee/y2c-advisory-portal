/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - PWA Hyper-Cache Engine (Service Worker)
 * Version: V78.00 GRAND FINALE (PWA & Offline Optimized)
 * ============================================================================
 * [ACCELERATOR] Cache-First Strategy & LRU Dynamic Caching: Limits dynamic assets to 100 items to prevent RAM bloat.
 * [SECURITY] Network-Only API Handling: Protects all POST requests to Google Apps Script.
 * [CLEANUP] Advanced Cache Invalidations: Automatically purges ghost caches from V1 to V77.
 * [RESTORED] IndexedDB Mutation Queue, Background Sync & High-End Offline UI intact.
 * ============================================================================
 */

"use strict";

const CACHE_VERSION = 'V78_00';
const STATIC_CACHE = `Y2C_ENTERPRISE_STATIC_${CACHE_VERSION}`;
const DYNAMIC_CACHE = `Y2C_ENTERPRISE_DYNAMIC_${CACHE_VERSION}`;
const OFFLINE_DB_NAME = 'Y2C_Offline_Sync_DB_V78';
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
    // 즉시 설치 및 활성화 대기 무시
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log(`[Y2C SW Engine] Installing ${STATIC_CACHE}...`);
            // Promise.allSettled를 통해 단일 에셋 로드 실패가 전체 설치를 중단시키지 않도록 방어
            return Promise.allSettled(
                CORE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[Y2C SW Engine] Local cache skipped: ${url}`)))
            );
        })
    );
});

self.addEventListener('activate', event => {
    console.log(`[Y2C SW Engine] Activating ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                // 구버전 캐시 찌꺼기 100% 소각 (좀비 캐시 영구 차단)
                if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && (key.startsWith('Y2C_ENTERPRISE_CACHE_') || key.startsWith('Y2C_Enterprise_Static_') || key.startsWith('Y2C_Enterprise_Dynamic_'))) {
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
const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > size) {
                cache.delete(keys[0]).then(() => limitCacheSize(name, size));
            }
        });
    });
};

// ============================================================================
// 📡 [MODULE 4] Request Interceptor & Intelligent Proxy Engine
// ============================================================================
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // 🚨 [CRITICAL FIX 1] 크롬 익스텐션 등 비정상 프로토콜 최상단 원천 차단
    if (!req.url.startsWith('http')) {
        return; 
    }

    // 1. 🚨 백엔드 API 통신 (POST/GET) 인터셉트 및 오프라인 큐잉 로직 (Network-Only)
    if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
        if (req.method === 'POST') {
            event.respondWith(handleApiFetch(req));
        } else {
            event.respondWith(fetch(req));
        }
        return;
    }

    // 2. 🚀 정적 이미지/폰트 에셋 -> Cache-First, fallback to Network & Dynamic Cache
    const isStaticAsset = req.url.match(/\.(png|jpg|jpeg|svg|woff2|woff|ttf|css)$/) || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('cdn');
    if (req.method === 'GET' && isStaticAsset) {
        event.respondWith(
            caches.match(req).then(cachedRes => {
                if (cachedRes) return cachedRes; // 1ms 즉시 반환
                
                return fetch(req).then(networkRes => {
                    // CORS No-Cors 대응 (Opaque Response 저장 허용)
                    if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
                        const responseToCache = networkRes.clone();
                        caches.open(DYNAMIC_CACHE).then(cache => {
                            cache.put(req, responseToCache);
                            limitCacheSize(DYNAMIC_CACHE, 100); // 🚨 다이내믹 캐시 최대 100개 제한 (메모리 최적화)
                        });
                    }
                    return networkRes;
                }).catch(() => { console.warn(`[Y2C SW Engine] Asset Fetch Failed: ${req.url}`); });
            })
        );
        return;
    }

    // 3. 🚀 HTML, JS 문서 -> Network-First, fallback to Cache, fallback to Offline UI
    if (req.method === 'GET') {
        event.respondWith(
            fetch(req).then(networkRes => {
                if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
                    const responseToCache = networkRes.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(req, responseToCache));
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
// 🚀 [MODULE 5] Auto-Flush Background Sync Engine
// ============================================================================
let isFlushing = false;

async function flushQueue() {
    if (isFlushing || !navigator.onLine) return;
    isFlushing = true;

    try {
        const queue = await getQueuedRequests();
        if (queue.length === 0) return;

        for (const requestData of queue) {
            // 포이즌 필(Poison Pill) 방어: 5회 이상 실패한 요청은 영구 파기
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
                    else { await dequeueRequest(requestData.id); } // 논리 에러 발생 시에도 큐에서 제거
                } else {
                    throw new Error(`HTTP Error ${response.status}`);
                }
            } catch (error) {
                await incrementRetryCount(requestData.id, requestData.retryCount);
                break; // 하나라도 실패하면 통신 상태가 불안정한 것으로 간주하고 플러시 중단
            }
        }
    } finally {
        isFlushing = false;
    }
}

self.addEventListener('sync', event => { if (event.tag === 'y2c-flush-queue') event.waitUntil(flushQueue()); });
self.addEventListener('message', event => { if (event.data && event.data.type === 'FLUSH_QUEUE') flushQueue(); });
