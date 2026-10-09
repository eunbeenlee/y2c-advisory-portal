/* Y2C browser accelerator v17. Read cache only; never opens or clears the durable write queue. */
(function (global) {
    'use strict';
    const SCHEMA = 2, MAX_AGE = 24 * 60 * 60 * 1000, FRESH_AGE = 5 * 60 * 1000;
    const DB_NAME = 'Y2C_Admin_Cache_V80', STORE = 'cacheStore';
    const deployment = JSON.stringify([
        global.location ? String(global.location.pathname || '/').replace(/[^/]*$/, '') : '/',
        String(global.SYSTEM_CONFIG && global.SYSTEM_CONFIG.API && global.SYSTEM_CONFIG.API.BASE_URL || '')
    ]);
    const GENERATION_KEY = 'Y2C_SWR_GENERATION_V17:' + deployment;
    let db = null, opening = null, localGeneration = '0', volatileGeneration = false;
    const auth = () => global.Y2C_AuthEngine;
    const scope = () => auth() && (auth().cacheSessionKey ? auth().cacheSessionKey() : auth().cacheKey('__SWR_SCOPE__'));
    const revision = () => auth() && auth().getReadRevision ? auth().getReadRevision() : 0;
    function generation() {
        if (volatileGeneration) return localGeneration;
        try { return global.localStorage.getItem(GENERATION_KEY) || localGeneration; }
        catch (_) { return localGeneration; }
    }
    function invalidate(change) {
        if (!change || change.reason !== 'mutation-committed') return;
        localGeneration = Date.now().toString(36) + ':' + Math.random().toString(36).slice(2);
        try { global.localStorage.setItem(GENERATION_KEY, localGeneration); volatileGeneration = false; }
        catch (_) { volatileGeneration = true; }
    }
    if (auth() && auth().onReadInvalidated) auth().onReadInvalidated(invalidate);
    function openDB() {
        if (db) return Promise.resolve(db);
        if (opening) return opening;
        if (!global.indexedDB) return Promise.reject(new Error('Read cache unavailable'));
        opening = new Promise((resolve, reject) => {
            let finished = false, request;
            const timeout = setTimeout(() => finish(new Error('Read cache open timeout')), 1200);
            function finish(error, result) {
                if (finished) { if (result) result.close(); return; }
                finished = true; clearTimeout(timeout);
                if (error) { opening = null; reject(error); }
                else { db = result; result.onversionchange = () => { result.close(); if (db === result) db = null; opening = null; }; resolve(result); }
            }
            try {
                request = global.indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, {keyPath:'id'});
                };
                request.onsuccess = () => finish(null, request.result);
                request.onerror = () => finish(request.error || new Error('Read cache unavailable'));
                request.onblocked = () => finish(new Error('Read cache blocked'));
            } catch (error) { finish(error); }
        });
        // A synchronous open failure must not pin a rejected promise for the entire page.
        opening.catch(() => { opening = null; });
        return opening;
    }
    async function transaction(mode, callback) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            let tx, result, finished = false;
            const timeout = setTimeout(() => {
                try { if (tx) tx.abort(); } catch (_) {}
                finish(new Error('Read cache transaction timeout'));
            }, 2000);
            function finish(error) {
                if (finished) return;
                finished = true; clearTimeout(timeout);
                if (error) reject(error); else resolve(result);
            }
            try {
                tx = database.transaction(STORE, mode);
                const request = callback(tx.objectStore(STORE));
                request.onsuccess = () => { result = request.result; };
                request.onerror = () => finish(request.error || new Error('Read cache request failed'));
                tx.oncomplete = () => finish();
                tx.onerror = tx.onabort = () => finish(tx.error || new Error('Read cache transaction failed'));
            } catch (error) {
                if (error && error.name === 'InvalidStateError') { database.close(); db = null; opening = null; }
                finish(error);
            }
        });
    }
    async function capture(key) {
        const identity = scope(), readRevision = revision(), stamp = generation();
        if (!identity || !auth()) return null;
        const id = await auth().verifiedCacheKey('Y2C_SWR_SCHEMA_' + SCHEMA + ':' + deployment + ':' + key);
        const current = () => identity === scope() && readRevision === revision() && stamp === generation();
        return id && current() ? {id,stamp,current} : null;
    }
    const cache = {
        name: DB_NAME, version: 1, storeName: STORE,
        get isSupported() { return !!global.indexedDB; },
        init: openDB,
        async get(key) {
            try {
                if (!this.isSupported) return null;
                const access = await capture(key);
                if (!access) return null;
                const record = await transaction('readonly', store => store.get(access.id));
                if (!access.current() || !record || record.schema !== SCHEMA || record.generation !== access.stamp) return null;
                const age = Date.now() - record.timestamp;
                if (!Number.isFinite(age) || age < -60000 || age > MAX_AGE) return null;
                return {id:record.id, data:record.data, timestamp:record.timestamp, stale:age > FRESH_AGE};
            } catch (_) { return null; }
        },
        async set(key, data) {
            try {
                if (!this.isSupported) return false;
                const access = await capture(key);
                if (!access) return false;
                await openDB();
                if (!access.current()) return false;
                // The same connection is reused by transaction(); no await between its callback and put.
                await transaction('readwrite', store => {
                    if (!access.current()) throw new Error('Read cache session changed');
                    return store.put({id:access.id, data, timestamp:Date.now(), schema:SCHEMA, generation:access.stamp});
                });
                return access.current();
            } catch (_) { return false; }
        }
    };

    const pendingRenders = new Map(), jobs = new Map(), pendingRefreshes = new Map(), refreshBudgets = new Map();
    let renderScheduled = false;
    const clock = () => global.performance && global.performance.now ? global.performance.now() : Date.now();
    function refreshRead(key, reload, identity) {
        if (!key || typeof reload !== 'function' || !identity || identity !== scope()) return;
        const refreshKey = identity + ':' + key;
        if (pendingRefreshes.has(refreshKey)) return;
        let budget = refreshBudgets.get(refreshKey);
        if (!budget || Date.now() - budget.since > 30000) {
            budget = {since:Date.now(),count:0,warned:false}; refreshBudgets.set(refreshKey,budget);
        }
        if (budget.count >= 3) {
            if (!budget.warned && auth() && auth().showToast) auth().showToast('데이터가 계속 변경되고 있습니다. 잠시 후 새로고침해 주세요. 입력은 보존됩니다.', 'warning');
            budget.warned = true; return;
        }
        pendingRefreshes.set(refreshKey, true);
        setTimeout(() => {
            pendingRefreshes.delete(refreshKey);
            if (identity !== scope()) return;
            budget.count++;
            try { Promise.resolve(reload()).catch(() => {}); } catch (_) {}
        }, 250);
    }
    function readGuard(key, reload) {
        const identity = scope(), readRevision = revision(), stamp = generation();
        return () => {
            if (!identity || identity !== scope()) return false;
            if (readRevision !== revision() || stamp !== generation()) {
                refreshRead(key, reload, identity); return false;
            }
            return true;
        };
    }
    function schedule(callback) {
        let finished = false, frame = null, timer = null;
        const run = () => {
            if (finished) return;
            finished = true;
            if (timer !== null) clearTimeout(timer);
            if (frame !== null && global.cancelAnimationFrame) global.cancelAnimationFrame(frame);
            callback();
        };
        if (global.requestAnimationFrame && !global.document.hidden) {
            frame = global.requestAnimationFrame(run);
            // Hidden/throttled frames cannot strand a render promise indefinitely.
            timer = setTimeout(run, 100);
        } else timer = setTimeout(run, 0);
    }
    function flushRenders() {
        renderScheduled = false;
        const batch = Array.from(pendingRenders.values()); pendingRenders.clear();
        batch.forEach(entry => {
            try {
                const element = global.document.getElementById(entry.target);
                const current = entry.scope === scope() && entry.guard();
                if (element && current) element.innerHTML = entry.html;
                entry.resolve(!!element && current);
            } catch (_) { entry.resolve(false); }
        });
    }
    const accelerator = {
        cache,
        readGuard,
        renderReactively(target, html, guard = () => true, options = {}) {
            const currentData = options.readBound ? readGuard(options.key || target, options.onStale) : () => true;
            return new Promise(resolve => {
                const previous = pendingRenders.get(target);
                if (previous) previous.resolve(false);
                pendingRenders.set(target, {target,html,guard:()=>guard() && currentData(),resolve,scope:scope()});
                if (!renderScheduled) { renderScheduled = true; schedule(flushRenders); }
            });
        },
        processInChunks(array, processFn, onComplete, chunkSize = 200, options = {}) {
            const maxItems = Math.max(1, Math.min(200, Number(chunkSize) || 200));
            const budget = 4, identity = scope(), viewGuard = options.isCurrent || (() => true);
            const currentData = options.readBound ? readGuard(options.key, options.onStale) : () => true;
            const guard = () => viewGuard() && currentData();
            const job = {cancelled:false};
            if (options.key) {
                const previous = jobs.get(options.key);
                if (previous) previous.cancelled = true;
                jobs.set(options.key, job);
            }
            return new Promise(resolve => {
                let index = 0, settled = false;
                const finish = completed => {
                    if (settled) return;
                    settled = true;
                    if (options.key && jobs.get(options.key) === job) jobs.delete(options.key);
                    resolve(completed);
                };
                function nextChunk() {
                    try {
                        if (job.cancelled || identity !== scope() || !guard()) return finish(false);
                        const start = clock(), end = Math.min(index + maxItems, array.length);
                        while (index < end) {
                            if (job.cancelled || !viewGuard()) return finish(false);
                            processFn(array[index], index); index++;
                            if (clock() - start >= budget) break;
                        }
                        if (index < array.length) schedule(nextChunk);
                        else {
                            if (identity !== scope() || !guard()) return finish(false);
                            if (onComplete) onComplete();
                            finish(true);
                        }
                    } catch (error) {
                        if (global.console && global.console.error) global.console.error('Y2C render failed', error);
                        if (auth() && auth().showToast) auth().showToast('화면을 표시하지 못했습니다. 다시 불러와 주세요.', 'error');
                        finish(false);
                    }
                }
                schedule(nextChunk);
            });
        }
    };
    global.Y2C_Accelerator = accelerator;
})(window);
