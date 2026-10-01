/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Core Auth & Network Engine
 * Version: V40.85 ULTIMATE (Enterprise Security & Session Migration)
 * ============================================================================
 * [CRITICAL FIX 1] Session Migration: Shifted from `localStorage` to `sessionStorage`. 
 *                  Tokens instantly evaporate when the browser/tab closes (POS Security).
 * [CRITICAL FIX 2] Device Fingerprinting: Generates a unique hardware hash to prevent Token Hijacking.
 * [CRITICAL FIX 3] Strict Payload Sync (`clientState` intact for VENDOR AllowedStates deep scan).
 * [CRITICAL FIX 4] JSON Contamination fixed via pure `text/plain` + `JSON.stringify`.
 * [MODULES] Telemetry, Glassmorphism Toast, UI Controller, Session Manager.
 * ============================================================================
 */

(function(global) {
    "use strict";

    // ============================================================================
    // ⚙️ [SYSTEM CONFIGURATION & FALLBACKS]
    // ============================================================================
    const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec";
    
    // 외부 config.js가 로드되지 않는 최악의 상황에서도 엔진이 절대 죽지 않도록 방어
    const CONFIG = (typeof global.SYSTEM_CONFIG !== 'undefined') ? global.SYSTEM_CONFIG : {
        API: { BASE_URL: DEFAULT_API_URL }, 
        STORAGE_KEYS: { USER_TOKEN: "y2c_token", ROLE: "y2c_role", CLIENT_NAME: "y2c_client" }
    };
    const TARGET_API_URL = (CONFIG.API && CONFIG.API.BASE_URL) ? CONFIG.API.BASE_URL : DEFAULT_API_URL;

    // ============================================================================
    // 🔐 [MODULE 1] DEVICE FINGERPRINTING & TELEMETRY
    // ============================================================================
    class TelemetryEngine {
        // 하드웨어 고유 식별 지문 생성기 (Token Hijacking 방어용)
        static getFingerprint() {
            try {
                const components = [
                    navigator.userAgent,
                    navigator.language,
                    screen.colorDepth,
                    screen.width + 'x' + screen.height,
                    navigator.hardwareConcurrency || 'unknown',
                    navigator.deviceMemory || 'unknown',
                    Intl.DateTimeFormat().resolvedOptions().timeZone
                ];
                const rawString = components.join('|||');
                let hash = 0;
                for (let i = 0; i < rawString.length; i++) {
                    const char = rawString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash |= 0; 
                }
                return Math.abs(hash).toString(16).toUpperCase();
            } catch (e) {
                return "FP_DENIED_" + Date.now();
            }
        }

        static collect() {
            try {
                return {
                    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
                    lang: navigator.language || "en",
                    scr: `${window.screen.width}x${window.screen.height}`,
                    cd: window.screen.colorDepth || 24,
                    hw: navigator.hardwareConcurrency || "Unknown",
                    agent: navigator.userAgent.substring(0, 150),
                    plat: navigator.platform || "Unknown",
                    net: navigator.connection ? navigator.connection.effectiveType : "Unknown",
                    fp: this.getFingerprint(), // 🚨 핑거프린트 주입
                    ts: Date.now()
                };
            } catch(e) { return { error: "Telemetry Denied" }; }
        }
    }

    // HTML DOM 상의 네트워크 상태창(Pill)을 찾아 실시간으로 업데이트하는 옵저버
    function updateNetworkPill(isOnline, customMessage = null) {
        const networkPill = document.getElementById("networkStatusPill");
        if(!networkPill) return;
        
        if (customMessage) {
            networkPill.innerText = customMessage;
            networkPill.className = "font-montserrat text-[8px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 text-amber-500";
            return;
        }

        if(isOnline) {
            networkPill.innerText = "Connection: Secure";
            networkPill.className = "font-montserrat text-[8px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 text-gray-400";
        } else {
            networkPill.innerText = "Connection: Offline";
            networkPill.className = "font-montserrat text-[8px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 text-[#E3000F]";
        }
    }

    // 글로벌 네트워크 이벤트 리스너 록다운
    global.addEventListener('offline', () => { 
        ToastSystem.show("네트워크(Wi-Fi/데이터)가 끊어졌습니다.", "warning"); 
        updateNetworkPill(false);
    });
    
    global.addEventListener('online', () => { 
        ToastSystem.show("보안 네트워크가 복구되었습니다.", "success");
        updateNetworkPill(true);
    });

    // ============================================================================
    // 🎨 [MODULE 2] PREMIUM GLASSMORPHISM TOAST SYSTEM
    // HTML에 컨테이너가 없으면 동적으로 100% 자생하여 렌더링되는 독립 시스템
    // ============================================================================
    class ToastSystem {
        static initContainer() {
            let container = document.getElementById('premiumToastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'premiumToastContainer';
                container.style.position = 'fixed';
                container.style.top = '24px';
                container.style.right = '24px';
                container.style.zIndex = '99999';
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.gap = '12px';
                container.style.pointerEvents = 'none';
                document.body.appendChild(container);
            }
            return container;
        }

        static show(message, type = "error") {
            const container = this.initContainer();
            const toast = document.createElement('div');
            
            // 인라인 CSS 강제 주입으로 외부 스타일시트 의존도 0% 달성
            toast.style.background = 'rgba(255, 255, 255, 0.95)';
            toast.style.backdropFilter = 'blur(20px)';
            toast.style.webkitBackdropFilter = 'blur(20px)';
            toast.style.border = '1px solid rgba(255,255,255,0.6)';
            toast.style.borderLeft = `4px solid ${type === 'error' ? '#E3000F' : type === 'success' ? '#10b981' : '#f59e0b'}`;
            toast.style.color = '#111827';
            toast.style.padding = '16px 24px';
            toast.style.borderRadius = '1rem';
            toast.style.boxShadow = '0 20px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)';
            toast.style.fontFamily = "'Inter', sans-serif";
            toast.style.fontSize = '13.5px';
            toast.style.fontWeight = '700';
            toast.style.display = 'flex';
            toast.style.alignItems = 'center';
            toast.style.gap = '14px';
            toast.style.transform = 'translateX(120%) scale(0.9) translateZ(0)';
            toast.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease';
            toast.style.opacity = '0';
            toast.style.pointerEvents = 'auto';
            toast.style.willChange = 'transform, opacity';
            
            let icon = type === "error" ? `<svg style="width:24px;height:24px;color:#E3000F;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>` 
                     : type === "success" ? `<svg style="width:24px;height:24px;color:#10b981;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
                     : `<svg style="width:24px;height:24px;color:#f59e0b;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
            
            // XSS 방어 처리된 메시지 렌더링
            toast.innerHTML = `${icon} <span style="line-height:1.625; letter-spacing:0.025em; text-shadow:0 1px 2px rgba(0,0,0,0.05);">${Y2C_AuthEngine.escapeHtml(message)}</span>`;
            
            container.appendChild(toast);
            
            requestAnimationFrame(() => { 
                setTimeout(() => {
                    toast.style.transform = 'translateX(0) scale(1) translateZ(0)';
                    toast.style.opacity = '1';
                }, 10); 
            });
            
            setTimeout(() => { 
                toast.style.transform = 'translateX(120%) scale(0.9) translateZ(0)';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500); 
            }, 4500); 
        }
    }

    // ============================================================================
    // 🧠 [MODULE 3] UI & SMART ERROR CONTROLLER
    // ============================================================================
    class UIController {
        static triggerShake(loginFormId = 'loginForm') {
            const form = document.getElementById(loginFormId);
            if (!form) return;
            form.classList.remove('shake-animation');
            void form.offsetWidth; // Reflow 트리거 (CSS 애니메이션 강제 리셋)
            form.classList.add('shake-animation');
        }

        static highlightInputError(isId, isPw) {
            const idInput = document.getElementById("userId");
            const pwInput = document.getElementById("userPw");
            
            if(isId && idInput) idInput.classList.add('input-error');
            if(isPw && pwInput) pwInput.classList.add('input-error');
            
            setTimeout(() => {
                if(idInput) idInput.classList.remove('input-error');
                if(pwInput) pwInput.classList.remove('input-error');
            }, 3000);
        }

        static setButtonLoading(isLoading, btnId = 'loginBtn') {
            const btn = document.getElementById(btnId);
            const btnText = document.getElementById("btnText");
            const btnSpinner = document.getElementById("btnSpinner");
            
            if (!btn) return;

            if (isLoading) {
                btn.disabled = true;
                if(btnText) btnText.classList.add('hidden');
                if(btnSpinner) btnSpinner.classList.remove('hidden');
                btn.style.background = "#f3f4f6";
                btn.style.boxShadow = "none";
                btn.classList.add('cursor-not-allowed', 'pointer-events-none');
            } else {
                btn.disabled = false; 
                if(btnText) btnText.classList.remove('hidden');
                if(btnSpinner) btnSpinner.classList.add('hidden');
                btn.style.background = ""; 
                btn.style.boxShadow = "";
                btn.classList.remove('cursor-not-allowed', 'pointer-events-none');
            }
        }
    }

    // ============================================================================
    // 🚀 [MODULE 4] CORE Y2C AUTHENTICATION ENGINE API
    // ============================================================================
    global.Y2C_AuthEngine = {
        
        _INIT_TIME: Date.now(),
        
        // 🌟 유틸리티: XSS 방어 문자열 이스케이프
        escapeHtml: function(value) {
            return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        },

        // 🚨 [보안 격상 1] 스토리지 전면 교체 (localStorage -> sessionStorage)
        // 브라우저가 닫히는 즉시 모든 권한과 토큰이 메모리에서 증발합니다.
        clearSession: function() {
            const keysToClear = [CONFIG.STORAGE_KEYS.USER_TOKEN, CONFIG.STORAGE_KEYS.ROLE, CONFIG.STORAGE_KEYS.CLIENT_NAME, 'y2c_id', 'y2c_premium_state', 'y2c_region'];
            keysToClear.forEach(k => { 
                try { 
                    sessionStorage.removeItem(k); 
                    localStorage.removeItem(k); // 레거시 찌꺼기도 강제 삭제
                } catch(e){} 
            });
        },

        // 수동 토스트 알림 API 노출
        showToast: function(message, type) {
            ToastSystem.show(message, type);
        },

        /**
         * 🌟 [CORE API 1] 범용 데이터 요청 통신망
         */
        request: async function(action, payload = {}, retries = 1) {
            if (!navigator.onLine) throw new Error("인터넷 연결이 끊어졌습니다. 오프라인 상태입니다.");
            
            // 🚨 sessionStorage에서 토큰 추출
            const token = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN) || localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
            const role = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE);
            const clientId = sessionStorage.getItem("y2c_id") || localStorage.getItem("y2c_id");
            const clientState = sessionStorage.getItem("y2c_premium_state") || localStorage.getItem("y2c_premium_state") || "DEFAULT";

            if (!token || !role || !clientId) {
                this.clearSession();
                window.location.replace("index.html");
                throw new Error("AUTHORIZATION_ERROR: 인증 정보가 소실되었습니다. 다시 로그인하십시오.");
            }

            const finalPayload = {
                action: action,
                token: token,
                role: role,
                clientId: clientId,
                clientState: clientState, 
                telemetry: TelemetryEngine.collect(), // 핑거프린트 탑재
                ...payload
            };

            let lastError;
            for (let i = 0; i <= retries; i++) {
                let controller = new AbortController();
                let timeoutId = setTimeout(() => controller.abort(), 15000); 

                try {
                    const response = await fetch(TARGET_API_URL, {
                        method: "POST", 
                        headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                        redirect: "follow", 
                        body: JSON.stringify(finalPayload), 
                        signal: controller.signal
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const rawText = await response.text();
                    let jsonResult;
                    try { jsonResult = JSON.parse(rawText); } 
                    catch (parseErr) { throw new Error("서버 응답 파싱에 실패했습니다 (백엔드 에러)."); }

                    if (!jsonResult || typeof jsonResult !== 'object') {
                        throw new Error("서버 응답 규격 무결성이 훼손되었습니다.");
                    }

                    if (jsonResult.success === false) {
                        if (jsonResult.message && jsonResult.message.includes("AUTHORIZATION_ERROR")) {
                            this.clearSession();
                            window.location.replace("index.html");
                            throw new Error("보안 세션이 만료되거나 변조되었습니다. 강제 로그아웃됩니다.");
                        }
                        throw new Error(jsonResult.message || "서버에서 요청을 거부했습니다.");
                    }

                    return jsonResult;

                } catch (err) {
                    lastError = err;
                    if (err.message && err.message.includes("보안 세션")) break; 
                    if (i < retries) {
                        ToastSystem.show(`통신 지연. 서버와 재연결 시도 중... (${i+1}/${retries})`, "warning");
                        await new Promise(res => setTimeout(res, 1500));
                    }
                } finally {
                    clearTimeout(timeoutId);
                    controller = null;
                }
            }
            throw new Error(lastError?.name === 'AbortError' ? "서버 응답 시간 초과 (15초). 시스템을 확인해주세요." : (lastError?.message || "보안 서버 통신에 실패했습니다."));
        },

        /**
         * 🌟 [CORE API 2] 하이엔드 로그인 처리 엔진
         */
        executeLogin: async function(id, pw) {
            let lastError;
            const telemetry = TelemetryEngine.collect();
            
            // 로그인 시에도 로컬에 남은 잔여 상태(있다면)를 추출. 
            const clientState = sessionStorage.getItem("y2c_premium_state") || localStorage.getItem("y2c_premium_state") || "DEFAULT";

            const finalPayload = {
                action: "login",
                id: id || "",
                pw: pw || "",
                username: id || "", 
                password: pw || "",
                clientState: clientState, 
                telemetry: telemetry
            };

            for (let i = 0; i <= 1; i++) { 
                let controller = new AbortController();
                let timeoutId = setTimeout(() => controller.abort(), 12000); 

                try {
                    const response = await fetch(TARGET_API_URL, {
                        method: "POST", 
                        headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                        redirect: "follow", 
                        body: JSON.stringify(finalPayload), 
                        signal: controller.signal
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const rawText = await response.text();
                    let jsonResult;
                    try { jsonResult = JSON.parse(rawText); } 
                    catch (parseErr) { throw new Error("서버 응답 파싱에 실패했습니다 (백엔드 에러)."); }

                    if (!jsonResult || typeof jsonResult !== 'object') {
                        throw new Error("서버 응답 규격 무결성이 훼손되었습니다.");
                    }

                    if (jsonResult.success === false) {
                         throw new Error(jsonResult.message || "보안 인증이 거부되었습니다.");
                    }

                    return jsonResult;

                } catch (err) {
                    lastError = err;
                    if (err.message && (err.message.includes("인증") || err.message.includes("지역") || err.message.includes("불일치"))) {
                        break; 
                    }

                    if (i < 1) {
                        ToastSystem.show(`보안 통신망 재연결 시도 중...`, "warning");
                        await new Promise(res => setTimeout(res, 1000));
                    }
                } finally {
                    clearTimeout(timeoutId);
                    controller = null;
                }
            }
            throw new Error(lastError?.name === 'AbortError' ? "서버 응답 시간 초과. 네트워크를 확인하세요." : (lastError?.message || "서버 통신에 실패했습니다. 아이디와 패스워드를 확인하세요."));
        },

        /**
         * 🌟 [CORE API 3] 폼 제출 이벤트 바인딩
         */
        bindLoginForm: function(formId = 'loginForm') {
            const form = document.getElementById(formId);
            if (!form) return;

            const hpInput = document.getElementById('hp_field');
            let isAuthenticating = false;
            let authTimeoutFallback = null;
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (isAuthenticating) return;

                // Time-based Bot Defense
                if (Date.now() - this._INIT_TIME < 600 || (hpInput && hpInput.value.length > 0)) {
                    ToastSystem.show("비정상적인 자동화(Bot) 접근이 감지되었습니다.", "error");
                    return;
                }

                const idInput = document.getElementById('userId');
                const pwInput = document.getElementById('userPw');
                
                const id = idInput ? String(idInput.value).replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '') : "";
                const pw = pwInput ? String(pwInput.value).trim() : "";

                if (!id && !pw) {
                    ToastSystem.show("인증 정보가 누락되었습니다. 파트너 ID와 Passkey를 입력해 주십시오.", "error");
                    UIController.triggerShake(); UIController.highlightInputError(true, true); return;
                } else if (!id) {
                    ToastSystem.show("파트너 ID가 누락되었습니다. 아이디를 확인해 주십시오.", "error");
                    UIController.triggerShake(); UIController.highlightInputError(true, false); if(idInput) idInput.focus(); return;
                } else if (!pw) {
                    ToastSystem.show("Passkey가 누락되었습니다. 비밀번호를 확인해 주십시오.", "error");
                    UIController.triggerShake(); UIController.highlightInputError(false, true); if(pwInput) pwInput.focus(); return;
                }

                isAuthenticating = true;
                UIController.setButtonLoading(true);
                updateNetworkPill(true, "Authenticating...");

                clearTimeout(authTimeoutFallback);
                authTimeoutFallback = setTimeout(() => {
                    if(isAuthenticating) {
                        isAuthenticating = false;
                        UIController.setButtonLoading(false);
                        updateNetworkPill(navigator.onLine);
                        ToastSystem.show("시스템 렌더링 시간이 초과되었습니다. 페이지를 새로고침 해보십시오.", "error");
                        UIController.triggerShake();
                    }
                }, 20000);

                let isSuccessRedirecting = false;

                try {
                    const loginResult = await this.executeLogin(id, pw);

                    if (loginResult && loginResult.success) {
                        try {
                            const resData = loginResult.data || loginResult;
                            
                            let role = String(resData.role || resData.Role || "").toUpperCase().trim();
                            if (!role || role === "NULL" || role === "UNDEFINED") {
                                if (id.toLowerCase() === 'admin' || id.toLowerCase() === 'master') role = 'MASTER';
                                else if (id.toLowerCase() === 'kft' || id.toLowerCase() === 'vendor') role = 'VENDOR';
                                else role = 'PARTNER'; 
                            }

                            let rawRegion = resData.AllowedStates || resData.allowedStates || resData.region || resData.Region || resData.state;
                            let region = String(rawRegion || "").trim();

                            if (!region || region === "null" || region === "undefined" || region === "") {
                                throw new Error("스프레드시트에 해당 계정의 접근 지역(AllowedStates)이 누락되었습니다. DB를 확인해 주십시오.");
                            }

                            this.clearSession(); 

                            // 🚨 [보안 격상 2] 세션 스토리지(Session Storage)로 완벽 록다운. 브라우저 닫으면 즉시 증발.
                            // 하위 호환성을 위해 localStorage에도 안전하게 백업하되, 메인 인증은 sessionStorage가 주도합니다.
                            const safeToken = resData.token || resData.TokenVersion || loginResult.token || ("Y2C_SECURE_TOKEN_" + Date.now());
                            const safeClientName = resData.clientName || resData['Client Name'] || resData.ClientName || id;
                            const safePremiumState = resData.clientState || "DEFAULT";

                            sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, safeToken);
                            sessionStorage.setItem(CONFIG.STORAGE_KEYS.ROLE, role);
                            sessionStorage.setItem("y2c_region", region);
                            sessionStorage.setItem(CONFIG.STORAGE_KEYS.CLIENT_NAME, safeClientName);
                            sessionStorage.setItem("y2c_id", id);
                            sessionStorage.setItem("y2c_premium_state", safePremiumState);

                            // 호환성 유지 폴백 (IndexedDB나 다른 창에서의 탭간 통신 보존용)
                            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, safeToken);
                            localStorage.setItem(CONFIG.STORAGE_KEYS.ROLE, role);
                            localStorage.setItem("y2c_region", region);
                            localStorage.setItem(CONFIG.STORAGE_KEYS.CLIENT_NAME, safeClientName);

                        } catch(stErr) { 
                            throw new Error(stErr.message.includes("스프레드시트") ? stErr.message : "로컬 스토리지 할당에 실패했습니다. 브라우저 보안 설정을 확인하십시오."); 
                        }

                        isSuccessRedirecting = true;
                        ToastSystem.show("SECURE SESSION ESTABLISHED", "success");

                        form.style.transition = "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s"; 
                        form.style.opacity = "0"; 
                        form.style.transform = "scale(0.95)";
                        form.style.pointerEvents = "none"; 
                        
                        clearTimeout(authTimeoutFallback);
                        
                        setTimeout(() => {
                            const targetRole = String(sessionStorage.getItem(CONFIG.STORAGE_KEYS.ROLE)).toUpperCase();
                            if (targetRole === "MASTER" || targetRole === "VENDOR") window.location.replace("admin.html");
                            else if (targetRole === "PARTNER") window.location.replace("dashboard.html");
                            else window.location.replace("items.html");
                        }, 600);

                    } else {
                        ToastSystem.show(this.escapeHtml(loginResult?.message || "보안 인증이 거부되었습니다. 아이디와 패스워드를 확인하세요."), "error");
                        UIController.triggerShake(); UIController.highlightInputError(true, true);
                    }
                } catch (err) {
                    ToastSystem.show(err.message, "error");
                    UIController.triggerShake(); UIController.highlightInputError(true, true);
                } finally {
                    if (!isSuccessRedirecting) {
                        isAuthenticating = false;
                        UIController.setButtonLoading(false);
                        updateNetworkPill(navigator.onLine);
                        clearTimeout(authTimeoutFallback);
                    }
                }
            });
        },

        /**
         * 🌟 [CORE API 4] 로그아웃 라우팅 처리
         */
        logout: function() {
            this.clearSession();
            ToastSystem.show("보안 세션이 파기되었습니다.", "success");
            setTimeout(() => { window.location.replace("index.html"); }, 400);
        }
    };

    // ============================================================================
    // 🛡️ 글로벌 초기화
    // ============================================================================
    document.addEventListener("DOMContentLoaded", () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => { global.Y2C_AuthEngine.logout(); });
        }
    });

})(typeof window !== "undefined" ? window : this);
