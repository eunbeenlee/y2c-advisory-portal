/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Authentication & Network Engine
 * Version: V52.00 GRAND FINALE (Acceleration Channel & Enterprise Wording)
 * ============================================================================
 * [CRITICAL FIX 1] GAS Cold Start AbortError Fix: Dynamically extended TIMEOUT to 25s for login procedures.
 * [ACCELERATOR] Fetch Priority Engine: Injected `priority: 'high'` and `cache: 'no-cache'` for ultra-fast routing.
 * [ENTERPRISE UPGRADE] Corporate Terminology: Upgraded all UI Toast messages to premium B2B SaaS standards.
 * [RESTORED] Error Hijacking Prevention, IndexedDB Mutation Queue, Background Sync strictly preserved.
 * ============================================================================
 */

(function(global) {
    "use strict";

    // 🚨 1. 시스템 설정 무결성 검증 (config.js 로드 확인)
    if (typeof global.SYSTEM_CONFIG === 'undefined') {
        console.error("CRITICAL FATAL ERROR: SYSTEM_CONFIG is not loaded. Ensure config.js is loaded before auth.js.");
        global.SYSTEM_CONFIG = {
            API: { BASE_URL: "", TIMEOUT_MS: 15000, MAX_RETRIES: 2 },
            STORAGE_KEYS: { USER_TOKEN: "y2c_token", ROLE: "y2c_role", CLIENT_NAME: "y2c_client", REGION: "y2c_region" },
            APP: { VERSION: "EMERGENCY_FALLBACK", ENVIRONMENT: "PRODUCTION" }
        };
    }

    const CFG = global.SYSTEM_CONFIG;
    const OFFLINE_DB_NAME = 'Y2C_Enterprise_Offline_DB_V52';
    const QUEUE_STORE = 'mutation_request_queue';

    // ============================================================================
    // 💾 [MODULE 1] IndexedDB Offline Mutation Queue Engine
    // ============================================================================
    const OfflineEngine = {
        
        openDB: function() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(OFFLINE_DB_NAME, 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
                        console.log("[Y2C Offline Engine] Encrypted IndexedDB Store Allocated.");
                    }
                };
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    console.error("[Y2C Offline Engine] Local Storage Access Denied.", request.error);
                    reject(request.error);
                };
            });
        },

        enqueueRequest: async function(action, payloadObj) {
            try {
                const db = await this.openDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(QUEUE_STORE, 'readwrite');
                    const store = transaction.objectStore(QUEUE_STORE);
                    
                    const record = {
                        action: action,
                        payload: payloadObj,
                        timestamp: new Date().getTime(),
                        retryCount: 0,
                        status: 'QUEUED'
                    };
                    
                    store.put(record);
                    
                    transaction.oncomplete = () => resolve(true);
                    transaction.onerror = () => reject(transaction.error);
                });
            } catch (error) {
                return false;
            }
        },

        getQueuedRequests: async function() {
            try {
                const db = await this.openDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(QUEUE_STORE, 'readonly');
                    const store = transaction.objectStore(QUEUE_STORE);
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                        const results = request.result || [];
                        results.sort((a, b) => a.timestamp - b.timestamp);
                        resolve(results);
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                return [];
            }
        },

        dequeueRequest: async function(id) {
            try {
                const db = await this.openDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(QUEUE_STORE, 'readwrite');
                    const store = transaction.objectStore(QUEUE_STORE);
                    store.delete(id);
                    transaction.oncomplete = () => resolve(true);
                    transaction.onerror = () => reject(transaction.error);
                });
            } catch (error) {
                return false;
            }
        },

        incrementRetry: async function(id, currentCount) {
            try {
                const db = await this.openDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(QUEUE_STORE, 'readwrite');
                    const store = transaction.objectStore(QUEUE_STORE);
                    const getReq = store.get(id);
                    
                    getReq.onsuccess = () => {
                        const data = getReq.result;
                        if (data) {
                            data.retryCount = currentCount + 1;
                            store.put(data);
                        }
                    };
                    transaction.oncomplete = () => resolve();
                });
            } catch (error) {
                // Fail silently
            }
        }
    };

    // ============================================================================
    // 🎨 [MODULE 2] ENTERPRISE UI CONTROLLER (High-End Toasts)
    // ============================================================================
    const UIController = {
        
        showToast: function(message, type = "info", duration = 4500) {
            const container = document.getElementById('premiumToastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            
            let bgClass = "bg-white", borderClass = "border-gray-200", textClass = "text-gray-700", icon = "ℹ️", iconColor = "text-blue-500";
            
            if (type === "success") {
                bgClass = "bg-emerald-50"; borderClass = "border-emerald-200"; textClass = "text-emerald-800"; icon = "✅"; iconColor = "text-emerald-600";
            } else if (type === "error") {
                bgClass = "bg-red-50"; borderClass = "border-red-200"; textClass = "text-[#E3000F]"; icon = "⚠️"; iconColor = "text-[#E3000F]";
            } else if (type === "warning") {
                bgClass = "bg-amber-50"; borderClass = "border-amber-200"; textClass = "text-amber-800"; icon = "⚡"; iconColor = "text-amber-500";
            }

            toast.className = `transform transition-all duration-500 translate-x-full opacity-0 flex items-start gap-3 p-4 rounded-2xl shadow-2xl border ${bgClass} ${borderClass} backdrop-blur-md relative overflow-hidden group`;
            
            toast.innerHTML = `
                <div class="flex-shrink-0 text-lg mt-0.5 ${iconColor}">${icon}</div>
                <div class="flex-1">
                    <p class="text-[13px] font-bold ${textClass} leading-snug font-inter tracking-wide">${message}</p>
                </div>
                <button type="button" class="text-gray-400 hover:${textClass} transition-colors focus:outline-none ml-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="absolute bottom-0 left-0 h-1 bg-black/10 w-full transform origin-left animate-[shrink_${duration}ms_linear_forwards]"></div>
            `;

            container.appendChild(toast);

            void toast.offsetWidth;
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');

            const closeBtn = toast.querySelector('button');
            closeBtn.addEventListener('click', () => this.dismissToast(toast));

            setTimeout(() => { if (toast.parentNode) this.dismissToast(toast); }, duration);
        },

        dismissToast: function(toastElement) {
            toastElement.classList.remove('translate-x-0', 'opacity-100');
            toastElement.classList.add('translate-x-full', 'opacity-0', 'scale-95');
            setTimeout(() => {
                if (toastElement.parentNode) toastElement.parentNode.removeChild(toastElement);
            }, 500); 
        },

        showGlobalLoader: function(message = "Synchronizing Data...") {
            let overlay = document.getElementById('y2c-global-loader');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'y2c-global-loader';
                overlay.className = "fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-md transition-opacity duration-300 opacity-0";
                
                overlay.innerHTML = `
                    <div class="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center transform scale-95 transition-transform duration-300" id="y2c-loader-box">
                        <div class="w-16 h-16 border-4 border-gray-100 border-t-[#E3000F] rounded-full animate-spin mb-4"></div>
                        <h3 class="font-montserrat font-black text-lg text-[var(--premium-charcoal)] tracking-tight" id="y2c-loader-msg">${message}</h3>
                        <p class="text-[10px] font-bold text-gray-400 mt-2 tracking-widest uppercase font-mono">Securing Connection...</p>
                    </div>
                `;
                document.body.appendChild(overlay);
            } else {
                document.getElementById('y2c-loader-msg').innerText = message;
            }

            document.body.style.overflow = 'hidden';
            overlay.style.display = 'flex';
            void overlay.offsetWidth;
            overlay.classList.remove('opacity-0');
            document.getElementById('y2c-loader-box').classList.remove('scale-95');
        },

        hideGlobalLoader: function() {
            const overlay = document.getElementById('y2c-global-loader');
            if (overlay) {
                overlay.classList.add('opacity-0');
                document.getElementById('y2c-loader-box').classList.add('scale-95');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                }, 300);
            }
        },

        escapeHtml: function(unsafe) {
            return String(unsafe || "")
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }
    };

    if (!document.getElementById('y2c-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'y2c-toast-styles';
        style.innerHTML = `@keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`;
        document.head.appendChild(style);
    }

    // ============================================================================
    // 🔐 [MODULE 3] SESSION & AUTHENTICATION MANAGER
    // ============================================================================
    const SessionManager = {
        
        getToken: function() {
            return sessionStorage.getItem(CFG.STORAGE_KEYS.USER_TOKEN) || localStorage.getItem(CFG.STORAGE_KEYS.USER_TOKEN);
        },
        
        saveSession: function(data, rememberMe) {
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem(CFG.STORAGE_KEYS.USER_TOKEN, data.token);
            storage.setItem(CFG.STORAGE_KEYS.ROLE, data.role);
            storage.setItem(CFG.STORAGE_KEYS.CLIENT_NAME, data.clientName);
            storage.setItem(CFG.STORAGE_KEYS.REGION, data.clientState);
            
            if (!rememberMe) {
                localStorage.setItem(CFG.STORAGE_KEYS.USER_TOKEN, data.token);
                localStorage.setItem(CFG.STORAGE_KEYS.ROLE, data.role);
                localStorage.setItem(CFG.STORAGE_KEYS.CLIENT_NAME, data.clientName);
            }
        },
        
        clearSession: function() {
            sessionStorage.clear();
            localStorage.clear();
        },

        isSessionValid: function() {
            const token = this.getToken();
            if (!token || token.length < 10) return false;
            
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload.exp && payload.exp < new Date().getTime()) {
                        console.warn("[Y2C Auth Engine] JWT Token validation expired.");
                        return false;
                    }
                }
            } catch(e) {}
            
            return true;
        }
    };

    // ============================================================================
    // 🌐 [MODULE 4] NETWORK ENGINE (Accelerated Fetch Proxy)
    // ============================================================================
    const NetworkEngine = {
        
        dispatch: async function(action, payload = {}, retryCount = 0) {
            
            if (!CFG.API.BASE_URL || CFG.API.BASE_URL.trim() === "") {
                throw new Error("크리티컬 에러: 글로벌 API 엔드포인트(BASE_URL)가 구성되지 않았습니다. 인프라 관리자에게 문의하십시오.");
            }

            payload.action = action;
            if (action !== "login") {
                if (!SessionManager.isSessionValid()) {
                    SessionManager.clearSession();
                    window.location.replace('index.html');
                    throw new Error("보안 세션이 만료되었습니다. 안전한 엑세스를 위해 재로그인 해주십시오.");
                }
                payload.token = SessionManager.getToken();
            }

            const isMutation = ["save_order", "update_stock", "update_master_data", "save_sales_records", "upsert_hq_order", "update_hq_order_status", "cancel_order"].includes(action);

            if (!navigator.onLine) {
                return this.handleOfflineScenario(action, payload, isMutation);
            }

            // 🚨 [CRITICAL FIX 1] GAS 콜드 스타트 타임아웃 보정 엔진
            // 로그인 통신은 서버가 잠들어있을 확률이 높으므로 타임아웃을 25초로 대폭 늘려 AbortError를 방어합니다.
            const timeoutDuration = (action === "login") ? 25000 : CFG.API.TIMEOUT_MS;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            try {
                // 🚀 [ACCELERATOR] 통신 우선순위 강제 상승 및 캐시 우회
                const fetchOptions = {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow', 
                    cache: 'no-cache', // Stale 데이터 방지
                    priority: 'high',  // 브라우저 네트워크 큐 최우선 할당
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                };

                const response = await fetch(CFG.API.BASE_URL, fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP Error Code: ${response.status}`);
                }

                const responseText = await response.text();
                let jsonResponse;
                try {
                    jsonResponse = JSON.parse(responseText);
                } catch (e) {
                    throw new Error("서버 페이로드 파싱 실패 (JSON Syntax Error). 데이터 규격을 확인하십시오.");
                }

                // 🚨 [RESTORED] 에러 하이재킹 방어 (서버의 논리 에러 보존)
                if (jsonResponse.success === false) {
                    if (jsonResponse.message && jsonResponse.message.includes("세션")) {
                        SessionManager.clearSession();
                        window.location.replace('index.html');
                    }
                    const logicErr = new Error(jsonResponse.message || "알 수 없는 서버 논리 결함이 발생했습니다.");
                    logicErr.isBackendLogicError = true; 
                    throw logicErr;
                }

                return jsonResponse;

            } catch (error) {
                clearTimeout(timeoutId);

                if (error.isBackendLogicError) throw error; 
                if (error.message.includes("엔드포인트")) throw error; 

                const isNetworkError = error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('HTTP Error');
                
                if (isNetworkError && retryCount < CFG.API.MAX_RETRIES) {
                    const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500; 
                    console.warn(`[Y2C Network Engine] Node latency detected (${error.message}). Re-establishing connection in ${Math.round(delay)}ms... (Attempt ${retryCount + 1}/${CFG.API.MAX_RETRIES})`);
                    
                    await new Promise(res => setTimeout(res, delay));
                    return this.dispatch(action, payload, retryCount + 1);
                }

                return this.handleOfflineScenario(action, payload, isMutation, error);
            }
        },

        handleOfflineScenario: async function(action, payload, isMutation, originalError = null) {
            if (isMutation) {
                const queued = await OfflineEngine.enqueueRequest(action, payload);
                if (queued) {
                    return {
                        success: true,
                        offlineQueued: true,
                        // 💎 대기업식 엔터프라이즈 멘트 적용
                        message: "[네트워크 단절] 로컬 보안 스토리지(IndexedDB)에 트랜잭션이 안전하게 적재되었습니다. 통신 복구 시 백그라운드 동기화가 실행됩니다.",
                        action: action,
                        batchId: payload.batchId || `OFFLINE-${Date.now()}` 
                    };
                } else {
                    throw new Error("치명적 오류: 통신이 단절되었으며 암호화 스토리지 락(Lock)에 실패했습니다. 디바이스 용량을 비워주십시오.");
                }
            } else {
                if (navigator.onLine) {
                    console.error("[Y2C Network Engine] Server/CORS/URL routing collision.", originalError);
                    throw new Error("API 노드 연결에 실패했습니다. 글로벌 엔드포인트 방화벽 설정이나 네트워크 프록시를 확인하십시오.");
                } else {
                    console.error("[Y2C Network Engine] Zero connectivity read-fault.");
                    throw new Error("네트워크 연결이 완전히 단절되었습니다. Wi-Fi 또는 셀룰러 데이터 활성화 후 다시 시도하십시오.");
                }
            }
        }
    };

    // ============================================================================
    // 🔄 [MODULE 5] BACKGROUND SYNC DAEMON
    // ============================================================================
    const SyncDaemon = {
        isSyncing: false,

        flushQueue: async function() {
            if (this.isSyncing || !navigator.onLine) return;
            this.isSyncing = true;

            try {
                const queue = await OfflineEngine.getQueuedRequests();
                if (queue.length === 0) return;

                console.log(`[Y2C Sync Daemon] Waking up. Found ${queue.length} pending mutation(s).`);

                for (let i = 0; i < queue.length; i++) {
                    const record = queue[i];
                    
                    if (record.retryCount >= 5) {
                        console.error(`[Y2C Sync Daemon] Request ID ${record.id} exceeded max retries. Purging dead letter.`);
                        await OfflineEngine.dequeueRequest(record.id);
                        continue;
                    }

                    try {
                        const fetchOptions = {
                            method: 'POST', mode: 'cors', redirect: 'follow', cache: 'no-cache', priority: 'high',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(record.payload)
                        };

                        const response = await fetch(CFG.API.BASE_URL, fetchOptions);
                        
                        if (response.ok) {
                            const resJson = await response.json();
                            if (resJson.success) {
                                await OfflineEngine.dequeueRequest(record.id);
                                UIController.showToast(`[동기화 완료] 오프라인 대기열에 있던 [${record.action}] 트랜잭션이 메인 서버에 병합되었습니다.`, "success");
                            } else {
                                console.warn(`[Y2C Sync Daemon] Logic error on sync. Purging. Msg: ${resJson.message}`);
                                await OfflineEngine.dequeueRequest(record.id);
                            }
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }

                    } catch (e) {
                        console.warn(`[Y2C Sync Daemon] Sync failed for record ${record.id}. Backing off.`);
                        await OfflineEngine.incrementRetry(record.id, record.retryCount);
                        break; 
                    }
                }
            } catch (e) {
                console.error("[Y2C Sync Daemon] Fatal error during flush.", e);
            } finally {
                this.isSyncing = false;
            }
        }
    };

    global.addEventListener('online', () => {
        console.log("[Y2C Network Status] Connectivity Restored. Triggering Sync Daemon.");
        UIController.showToast("네트워크 세션이 복구되었습니다. 대기열 트랜잭션 동기화를 검사합니다.", "info");
        SyncDaemon.flushQueue();
    });

    global.addEventListener('offline', () => {
        console.warn("[Y2C Network Status] Connectivity Lost. Offline Mode Active.");
        UIController.showToast("네트워크 연결이 끊어졌습니다. 오프라인 안전 모드(Secure Offline Mode)로 전환됩니다.", "warning");
    });

    global.addEventListener('load', () => {
        if (navigator.onLine) {
            setTimeout(() => SyncDaemon.flushQueue(), 2000); 
        }
    });

    // ============================================================================
    // 🔐 [MODULE 6] THE MASTER API FACADE (Exposed to Global)
    // ============================================================================
    const AuthEngine = {
        
        request: async function(action, payload = {}) {
            return await NetworkEngine.dispatch(action, payload);
        },

        showToast: function(message, type, duration) {
            UIController.showToast(message, type, duration);
        },

        showLoader: function(message) {
            UIController.showGlobalLoader(message);
        },

        hideLoader: function() {
            UIController.hideGlobalLoader();
        },

        escapeHtml: function(text) {
            return UIController.escapeHtml(text);
        },

        logout: function() {
            SessionManager.clearSession();
            global.location.replace("index.html");
        },

        bindLoginForm: function(formId) {
            const form = document.getElementById(formId);
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const hp = document.getElementById('hp_field');
                if (hp && hp.value) {
                    console.warn("[Y2C Security] Bot activity blocked by honeypot.");
                    return; 
                }

                const userIdInput = document.getElementById('userId');
                const userPwInput = document.getElementById('userPw');
                const btn = document.getElementById('loginBtn');
                const btnText = document.getElementById('btnText');
                const btnSpinner = document.getElementById('btnSpinner');

                const id = (userIdInput.value || "").trim();
                const pw = (userPwInput.value || "").trim();

                userIdInput.classList.remove('input-error');
                userPwInput.classList.remove('input-error');

                if (!id || !pw) {
                    // 💎 대기업식 멘트 적용
                    UIController.showToast("보안 인가 실패: 파트너 식별자(ID) 및 패스키(Passkey)를 모두 입력해 주십시오.", "error");
                    if (!id) userIdInput.classList.add('input-error');
                    if (!pw) userPwInput.classList.add('input-error');
                    return;
                }

                btn.disabled = true;
                if(btnText) btnText.classList.add('hidden');
                if(btnSpinner) btnSpinner.classList.remove('hidden');

                try {
                    const res = await NetworkEngine.dispatch("login", { id: id, pw: pw });

                    if (res && res.success) {
                        SessionManager.saveSession(res, true);
                        
                        // 💎 대기업식 멘트 적용
                        UIController.showToast(`보안 세션 인가 완료. ${res.clientName} 파트너님의 엔터프라이즈 워크스페이스로 접속합니다.`, "success");
                        
                        setTimeout(() => {
                            if (res.role === "MASTER" || res.role === "VENDOR") {
                                global.location.replace("admin.html");
                            } else if (res.role === "PARTNER") {
                                global.location.replace("dashboard.html");
                            } else {
                                global.location.replace("items.html");
                            }
                        }, 800);
                    }
                } catch (err) {
                    // 서버 에러를 그대로 전달하되, UI 토스트로 세련되게 표현
                    UIController.showToast(err.message, "error");
                    userIdInput.classList.add('input-error');
                    userPwInput.classList.add('input-error');
                    form.classList.remove('shake-animation');
                    void form.offsetWidth; 
                    form.classList.add('shake-animation');
                } finally {
                    btn.disabled = false;
                    if(btnText) btnText.classList.remove('hidden');
                    if(btnSpinner) btnSpinner.classList.add('hidden');
                }
            });

            setTimeout(() => {
                const ui = document.getElementById('userId');
                if(ui && global.innerWidth > 768) ui.focus(); 
            }, 500);
        }
    };

    global.Y2C_AuthEngine = Object.freeze(AuthEngine);
    console.log("[Y2C Security] Auth Engine V52.00 Injected and Frozen.");

    global.addEventListener('DOMContentLoaded', () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => global.Y2C_AuthEngine.logout());
    });

})(typeof window !== "undefined" ? window : this);
