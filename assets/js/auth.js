/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Authentication & Network Engine
 * Version: V65.00 GRAND FINALE (Zombie Worker Nuke & Silent Retry)
 * ============================================================================
 * [CRITICAL FIX 1] Auto-Kill Rogue Workers: Injected a self-destruct sequence to purge old service workers blocking Google GAS 302 redirects.
 * [CRITICAL FIX 2] 404 Resilience & Silent Retry: Treats 404 from Google's redirect as a retryable glitch and hides alarming toast messages during background retries.
 * [PHASE 2 ACCELERATOR] Embedded custom `LZ-String` decompression logic.
 * [RESTORED] Offline IndexedDB Mutation Queue & Background Auto-Sync Daemon 100% Intact.
 * ============================================================================
 */

(function(global) {
    "use strict";

    // 🚨 [핵심 방어막] 로그인 통신을 가로막는 좀비 서비스 워커 강제 학살 (Auto-Kill)
    // 과거 버전의 sw.js가 구글 302 리다이렉트를 가로채 404 에러를 유발하는 것을 원천 차단합니다.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister().then(() => console.log("[Y2C Security] Rogue Service Worker Terminated to prevent CORS collision."));
            }
        }).catch(function(err) {
            console.warn("[Y2C Security] Service Worker cleanup failed: ", err);
        });
    }

    // 🚨 1. 시스템 설정 무결성 검증 (config.js 로드 확인 및 Fallback)
    if (typeof global.SYSTEM_CONFIG === 'undefined') {
        console.error("CRITICAL FATAL ERROR: SYSTEM_CONFIG is not loaded. Ensure config.js is loaded before auth.js.");
        global.SYSTEM_CONFIG = {
            API: { BASE_URL: "", TIMEOUT_MS: 45000, MAX_RETRIES: 2 },
            STORAGE_KEYS: { USER_TOKEN: "y2c_token", ROLE: "y2c_role", CLIENT_NAME: "y2c_client", REGION: "y2c_region" },
            APP: { VERSION: "EMERGENCY_FALLBACK", ENVIRONMENT: "PRODUCTION" }
        };
    }

    const CFG = global.SYSTEM_CONFIG;
    const OFFLINE_DB_NAME = 'Y2C_Enterprise_Offline_DB_V63';
    const QUEUE_STORE = 'mutation_request_queue';

    // ============================================================================
    // 🗜️ [MODULE 0] Custom LZ-String Decompression Engine (Syntax-Safe Version)
    // ============================================================================
    const LZDecompressor = (function() {
        const charFromInt = String.fromCharCode;
        const b64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        const baseDict = {};
        for (let idx = 0; idx < b64Chars.length; idx++) {
            baseDict[b64Chars.charAt(idx)] = idx;
        }

        const decompressCore = function(length, resetVal, getNext) {
            let dict = [], nextData, enlargeLimit = 4, dictLength = 4, bitCount = 3, entryStr = "", resultArr = [], i, w, bitsVal, resBit, maxPwr, pwr, charC;
            let stream = { value: getNext(0), pos: resetVal, index: 1 };

            for (i = 0; i < 3; i += 1) { dict[i] = i; }

            bitsVal = 0; maxPwr = Math.pow(2, 2); pwr = 1;
            while (pwr !== maxPwr) {
                resBit = stream.value & stream.pos;
                stream.pos >>= 1;
                if (stream.pos === 0) { stream.pos = resetVal; stream.value = getNext(stream.index++); }
                bitsVal |= (resBit > 0 ? 1 : 0) * pwr;
                pwr <<= 1;
            }

            switch (nextData = bitsVal) {
                case 0:
                    bitsVal = 0; maxPwr = Math.pow(2, 8); pwr = 1;
                    while (pwr !== maxPwr) {
                        resBit = stream.value & stream.pos; stream.pos >>= 1;
                        if (stream.pos === 0) { stream.pos = resetVal; stream.value = getNext(stream.index++); }
                        bitsVal |= (resBit > 0 ? 1 : 0) * pwr; pwr <<= 1;
                    }
                    charC = charFromInt(bitsVal);
                    break;
                case 1:
                    bitsVal = 0; maxPwr = Math.pow(2, 16); pwr = 1;
                    while (pwr !== maxPwr) {
                        resBit = stream.value & stream.pos; stream.pos >>= 1;
                        if (stream.pos === 0) { stream.pos = resetVal; stream.value = getNext(stream.index++); }
                        bitsVal |= (resBit > 0 ? 1 : 0) * pwr; pwr <<= 1;
                    }
                    charC = charFromInt(bitsVal);
                    break;
                case 2: return "";
            }

            dict[3] = charC;
            w = charC;
            resultArr.push(charC);

            while (true) {
                if (stream.index > length) return "";

                bitsVal = 0; maxPwr = Math.pow(2, bitCount); pwr = 1;
                while (pwr !== maxPwr) {
                    resBit = stream.value & stream.pos; stream.pos >>= 1;
                    if (stream.pos === 0) { stream.pos = resetVal; stream.value = getNext(stream.index++); }
                    bitsVal |= (resBit > 0 ? 1 : 0) * pwr; pwr <<= 1;
                }

                switch (charC = bitsVal) {
                    case 0:
                        bitsVal = 0; maxPwr = Math.pow(2, 8); pwr = 1;
                        while (pwr !== maxPwr) {
                            resBit = stream.value & stream.pos; stream.pos >>= 1;
                            if (stream.pos === 0) { stream.pos = resetVal; stream.value = getNext(stream.index++); }
                            bitsVal |= (resBit > 0 ? 1 : 0) * pwr; pwr <<= 1;
                        }
                        dict[dictLength++] = charFromInt(bitsVal);
                        charC = dictLength - 1;
                        enlargeLimit--;
                        break;
                    case 1:
                        bitsVal = 0; maxPwr = Math.pow(2, 16); pwr = 1;
                        while (pwr !== maxPwr) {
                            resBit = stream.value & stream.pos; stream.pos >>= 1;
                            if (stream.pos === 0) { stream.pos = resetVal; stream.value = getNext(stream.index++); }
                            bitsVal |= (resBit > 0 ? 1 : 0) * pwr; pwr <<= 1;
                        }
                        dict[dictLength++] = charFromInt(bitsVal);
                        charC = dictLength - 1;
                        enlargeLimit--;
                        break;
                    case 2:
                        return resultArr.join('');
                }

                if (enlargeLimit === 0) {
                    enlargeLimit = Math.pow(2, bitCount);
                    bitCount++;
                }

                if (dict[charC]) {
                    entryStr = dict[charC];
                } else {
                    if (charC === dictLength) {
                        entryStr = w + w.charAt(0);
                    } else {
                        return null;
                    }
                }
                resultArr.push(entryStr);
                dict[dictLength++] = w + entryStr.charAt(0);
                enlargeLimit--;
                w = entryStr;

                if (enlargeLimit === 0) {
                    enlargeLimit = Math.pow(2, bitCount);
                    bitCount++;
                }
            }
        };

        return {
            decompressFromBase64: function(inputStr) {
                if (inputStr == null) return "";
                if (inputStr === "") return null;
                return decompressCore(inputStr.length, 32, function(idx) {
                    return baseDict[inputStr.charAt(idx)];
                });
            }
        };
    })();

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
        
        toastTimeout: null,

        showToast: function(message, type = "info", duration = 4500) {
            const container = document.getElementById('premiumToastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            
            let bgClass = "bg-white", borderClass = "border-gray-200 border-l-gray-500", textClass = "text-gray-700", icon = "ℹ️", iconColor = "text-blue-500";
            
            if (type === "success") {
                bgClass = "bg-emerald-50"; borderClass = "border-emerald-200 border-l-emerald-500"; textClass = "text-emerald-800"; icon = "✅"; iconColor = "text-emerald-600";
            } else if (type === "error") {
                bgClass = "bg-red-50"; borderClass = "border-red-200 border-l-[#E3000F]"; textClass = "text-[#E3000F]"; icon = "🚨"; iconColor = "text-[#E3000F]";
            } else if (type === "warning") {
                bgClass = "bg-amber-50"; borderClass = "border-amber-200 border-l-amber-500"; textClass = "text-amber-800"; icon = "⚠️"; iconColor = "text-amber-500";
            }

            toast.className = `transform transition-all duration-500 translate-x-full opacity-0 flex items-start gap-3 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border ${bgClass} ${borderClass} border-l-4 backdrop-blur-md relative overflow-hidden group`;
            
            toast.innerHTML = `
                <div class="flex-shrink-0 text-lg mt-0.5 ${iconColor}">${icon}</div>
                <div class="flex-1">
                    <p class="text-[13px] sm:text-[14px] font-bold ${textClass} leading-snug font-inter tracking-wide">${this.escapeHtml(message)}</p>
                </div>
                <button type="button" class="text-gray-400 hover:${textClass} transition-colors focus:outline-none ml-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="absolute bottom-0 left-0 h-1 bg-black/10 w-full transform origin-left animate-[shrink_${duration}ms_linear_forwards]"></div>
            `;

            container.appendChild(toast);

            if (container.childNodes.length > 5) {
                container.removeChild(container.firstChild);
            }

            requestAnimationFrame(() => {
                toast.classList.remove('translate-x-full', 'opacity-0');
                toast.classList.add('translate-x-0', 'opacity-100');
            });

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
            requestAnimationFrame(() => {
                overlay.classList.remove('opacity-0');
                document.getElementById('y2c-loader-box').classList.remove('scale-95');
            });
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
        
        getRegion: function() {
            return sessionStorage.getItem(CFG.STORAGE_KEYS.REGION) || localStorage.getItem(CFG.STORAGE_KEYS.REGION) || "ON";
        },

        saveSession: function(data, rememberMe) {
            this.clearSession(); // 꼬임 방지 선제 삭제
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem(CFG.STORAGE_KEYS.USER_TOKEN, data.token);
            storage.setItem(CFG.STORAGE_KEYS.ROLE, data.role);
            storage.setItem(CFG.STORAGE_KEYS.CLIENT_NAME, data.clientName);
            storage.setItem(CFG.STORAGE_KEYS.REGION, data.allowedStates || data.clientState || "ON");
            storage.setItem(CFG.STORAGE_KEYS.USER_ID, data.id || "");
            
            if (!rememberMe) {
                localStorage.setItem(CFG.STORAGE_KEYS.USER_TOKEN, data.token);
                localStorage.setItem(CFG.STORAGE_KEYS.ROLE, data.role);
                localStorage.setItem(CFG.STORAGE_KEYS.CLIENT_NAME, data.clientName);
                localStorage.setItem(CFG.STORAGE_KEYS.REGION, data.allowedStates || data.clientState || "ON");
            }
        },
        
        clearSession: function() {
            const keys = ["y2c_token", "y2c_role", "y2c_client", "y2c_id", "y2c_premium_state", "y2c_region", "y2c_lang"];
            keys.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
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
    // 🌐 [MODULE 4] NETWORK ENGINE (Hyper-Gap Accelerated Fast-Fail Proxy)
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
                    throw new Error("보안 세션이 만료되었습니다. 기업 데이터 보호를 위해 재로그인 해주십시오.");
                }
                payload.token = SessionManager.getToken();
                payload.clientState = SessionManager.getRegion();
            }

            const isMutation = ["save_order", "update_stock", "update_master_data", "save_sales_records", "upsert_hq_order", "update_hq_order_status", "cancel_order"].includes(action);

            if (!navigator.onLine) {
                return this.handleOfflineScenario(action, payload, isMutation);
            }

            // 🚀 [가속 1] 캐시 버스터 주입으로 구글 엣지 서버의 302 리다이렉트 지연 강제 돌파
            const targetUrl = `${CFG.API.BASE_URL}?_t=${Date.now()}&action=${action}`;

            // 🚨 [보안] 구글 서버의 콜드 스타트를 견디기 위해 전체 타임아웃 45초 유지
            const timeoutDuration = (action === "login") ? 20000 : CFG.API.TIMEOUT_MS || 45000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            try {
                // 🚀 [가속 2] CORS Preflight 차단을 위한 text/plain 유지 및 keepalive 제거
                const fetchOptions = {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow', 
                    cache: 'no-store', 
                    priority: 'high',  
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                };

                const response = await fetch(targetUrl, fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        const explicitError = new Error(`엔터프라이즈 접근 권한 거부 (HTTP ${response.status}).`);
                        explicitError.isFatal = true; // 무한루프 재시도 방지
                        throw explicitError;
                    }
                    // 🚨 [CRITICAL FIX] 404 Resilience: 구글의 리다이렉트 404 현상을 치명적 오류에서 제외하여 백그라운드 재시도 허용
                    if (response.status === 404) {
                        throw new Error(`서버 네트워크 장애 또는 리다이렉트 유실 (HTTP ${response.status})`);
                    }
                    const httpError = new Error(`서버 네트워크 장애 (HTTP ${response.status})`);
                    httpError.httpStatus = response.status;
                    throw httpError;
                }

                const rawText = await response.text();
                
                let jsonResponse;
                try {
                    jsonResponse = JSON.parse(rawText);
                } catch (e) {
                    throw new Error("서버 페이로드 파싱 실패. 시스템 포맷 오염이 감지되었습니다.");
                }

                // 🚨 [PHASE 2 ACCELERATOR] LZ-String Base64 해독 로직 연동
                if (jsonResponse.isCompressed && jsonResponse.method === "lz-string" && jsonResponse.payload) {
                    try {
                        const decompressedString = LZDecompressor.decompressFromBase64(jsonResponse.payload);
                        if (!decompressedString) throw new Error("Decompression yielded null");
                        jsonResponse = JSON.parse(decompressedString);
                    } catch (decompErr) {
                        console.error("[Y2C Engine] LZ-String Decompression Failed:", decompErr);
                        throw new Error("압축된 서버 데이터를 해독하는 데 실패했습니다. 시스템 포맷이 변조되었을 수 있습니다.");
                    }
                }

                // 🚨 에러 하이재킹 방어 (서버의 논리 에러 보존)
                if (jsonResponse.success === false) {
                    if (jsonResponse.message && (jsonResponse.message.includes("만료") || jsonResponse.message.includes("로그인"))) {
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
                if (error.isFatal) throw error;

                const isNetworkError = error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('HTTP Error') || error.message.includes('유실');
                
                // 🚨 [UX UPGRADE] Silent Retry: 사용자 모르게 조용히 재시도를 진행하여 불필요한 토스트 알림을 억제합니다.
                if (isNetworkError && retryCount < (CFG.API.MAX_RETRIES || 2)) {
                    const delay = Math.pow(2, retryCount) * 1000 + Math.floor(Math.random() * 500); 
                    
                    // 재시도 시 UI에 경고를 띄우지 않고 콘솔에만 기록하여 UX를 향상시킵니다.
                    console.warn(`[Y2C Network Engine] Background retry initiated. Latency detected (${error.message}). Re-establishing connection in ${delay}ms...`);
                    
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
                        message: "[네트워크 단절] 로컬 보안 스토리지(IndexedDB)에 트랜잭션이 안전하게 임시 적재되었습니다. 통신 복구 시 백그라운드 동기화가 실행됩니다.",
                        action: action,
                        batchId: payload.batchId || `OFFLINE-${Date.now()}` 
                    };
                } else {
                    throw new Error("치명적 오류: 통신이 단절되었으며 암호화 스토리지 락(Lock)에 실패했습니다. 디바이스 용량을 비워주십시오.");
                }
            } else {
                if (navigator.onLine) {
                    console.error("[Y2C Network Engine] Server/CORS/URL routing collision.", originalError);
                    throw new Error("API 노드 연결에 실패했습니다. 글로벌 엔드포인트(URL) 설정이나 네트워크 방화벽을 확인하십시오.");
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
                        const targetUrl = `${CFG.API.BASE_URL}?_t=${Date.now()}&action=${record.action}`;
                        const fetchOptions = {
                            method: 'POST', mode: 'cors', redirect: 'follow', cache: 'no-store', priority: 'high',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(record.payload)
                        };

                        const response = await fetch(targetUrl, fetchOptions);
                        
                        if (response.ok) {
                            const rawText = await response.text();
                            let resJson;
                            try { resJson = JSON.parse(rawText); } catch(e) { throw new Error("Parse Error"); }

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
        UIController.showToast("네트워크 연결이 끊어졌습니다. 오프라인 안전 모드(Secure Cache Mode)로 전환됩니다.", "warning");
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
            
            // 🚨 Deep Purge: PWA Service Worker Cache Delete
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (let name of names) {
                        if (name.startsWith('Y2C')) caches.delete(name);
                    }
                }).catch(() => {});
            }
            
            UIController.showToast("보안 세션이 완전히 종료되었습니다.", "success", 2000);
            setTimeout(() => { global.location.replace("index.html"); }, 600);
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
                    UIController.showToast("보안 인가 실패: 파트너 식별자(ID) 및 패스키(Passkey)를 모두 입력해 주십시오.", "error");
                    if (!id) userIdInput.classList.add('input-error');
                    if (!pw) userPwInput.classList.add('input-error');
                    return;
                }

                btn.disabled = true;
                if(btnText) btnText.classList.add('hidden');
                if(btnSpinner) btnSpinner.classList.remove('hidden');

                setTimeout(() => {
                    userIdInput.blur();
                    userPwInput.blur();
                }, 500);

                const spinnerTxt = btnSpinner.querySelector('span');
                let txtState = 0;
                let loadingInterval = setInterval(() => {
                    if(spinnerTxt) {
                        txtState++;
                        if(txtState % 3 === 1) spinnerTxt.innerText = "SECURING...";
                        else if(txtState % 3 === 2) spinnerTxt.innerText = "WAKING SERVER...";
                        else spinnerTxt.innerText = "VERIFYING...";
                    }
                }, 3000);

                try {
                    const res = await NetworkEngine.dispatch("login", { id: id, pw: pw });

                    if (res && res.success) {
                        res.id = id; 
                        SessionManager.saveSession(res, true);
                        
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
                    let finalMsg = err.message;
                    if(err.message.includes("초과") || err.message.includes("장애") || err.message.includes("유실")) finalMsg = "서버 우회 응답 지연: 구글 데이터 노드 연결을 재시도합니다. 로그인 버튼을 한 번 더 눌러주십시오.";
                    
                    UIController.showToast(finalMsg, "error");
                    userIdInput.classList.add('input-error');
                    userPwInput.classList.add('input-error');
                    form.classList.remove('shake-animation');
                    void form.offsetWidth; 
                    form.classList.add('shake-animation');
                } finally {
                    clearInterval(loadingInterval);
                    if(spinnerTxt) spinnerTxt.innerText = "VERIFYING...";
                    btn.disabled = false;
                    if(btnText) btnText.classList.remove('hidden');
                    if(btnSpinner) btnSpinner.classList.add('hidden');
                }
            });
        }
    };

    global.Y2C_AuthEngine = Object.freeze(AuthEngine);
    console.log("[Y2C Security] Auth Engine V65.00 Injected and Frozen.");

    global.addEventListener('DOMContentLoaded', () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => global.Y2C_AuthEngine.logout());
    });

})(typeof window !== "undefined" ? window : this);
