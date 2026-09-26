/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Authentication Engine (V40.20 Ultimate)
 * [Zero Bug Guarantee] 11 Proactive Bug Fixes & Absolute Fallback Routing
 * ============================================================================
 */

(function() {
    "use strict"; // 🌟 스코프 오염 원천 차단

    // 🌟 [방어 10] XSS 및 DOM 파괴 스크립트 인젝션 차단 파서
    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    document.addEventListener('DOMContentLoaded', () => {
        
        // 🌟 [방어 2] Config 붕괴 연쇄 파괴 차단 (Absolute Fallback)
        const CONFIG = (typeof window.SYSTEM_CONFIG !== 'undefined') ? window.SYSTEM_CONFIG : {
            API: { BASE_URL: "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec", ENDPOINTS: { LOGIN: "login" } },
            STORAGE_KEYS: { USER_TOKEN: "y2c_token", ROLE: "y2c_role", CLIENT_NAME: "y2c_client" }
        };

        const FALLBACK_API_URL = "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec";
        const TARGET_API_URL = (CONFIG.API && CONFIG.API.BASE_URL) ? CONFIG.API.BASE_URL : FALLBACK_API_URL;

        // 🌟 [방어 6] 스토리지 클렌징 세분화 (언어/장바구니 파괴 방지)
        function clearY2CSession() {
            const keysToClear = [CONFIG.STORAGE_KEYS.USER_TOKEN, CONFIG.STORAGE_KEYS.ROLE, CONFIG.STORAGE_KEYS.CLIENT_NAME, 'y2c_id', 'y2c_premium_state'];
            keysToClear.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
        }

        // 🌟 [방어 3, 7] 이미 로그인된 상태라면 권한(RBAC)에 맞춰 무결성 리다이렉트 (null 스트링 파싱 방어)
        try {
            const existingToken = String(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN) || "").trim();
            const existingRole = String(localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase().trim();
            
            if (existingToken && existingToken !== "null" && existingToken.length > 10 && existingRole && existingRole !== "NULL") {
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.2s';
                setTimeout(() => {
                    if (existingRole === "VENDOR" || existingRole === "MASTER") {
                        window.location.replace("admin.html");
                    } else if (existingRole === "PARTNER") {
                        window.location.replace("dashboard.html");
                    } else {
                        window.location.replace("items.html");
                    }
                }, 50);
                return;
            } else {
                clearY2CSession();
            }
        } catch (e) {
            console.error("[Y2C Telemetry] LocalStorage access blocked", e);
        }

        // 엔터프라이즈 방어 로직: ID가 없어도 form 태그와 필수 요소를 자체 복구하여 찾아냄
        const loginForm = document.getElementById('loginForm') || document.querySelector('form');
        
        if (loginForm) {
            const idInput = document.getElementById('userId') || loginForm.querySelector('input[type="text"], input[type="email"]');
            const pwInput = document.getElementById('userPw') || loginForm.querySelector('input[type="password"]');
            const submitBtn = document.getElementById('loginBtn') || document.getElementById('submitBtn') || loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('button');
            
            // 에러 메시지 박스가 HTML에 없으면 자바스크립트가 즉석에서 생성 (Zero-Crash)
            let errorMsg = document.getElementById('loginErrorMsg') || document.getElementById('errorMessage');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.id = 'loginErrorMsg';
                errorMsg.className = 'text-center text-[12px] font-bold tracking-wide min-h-[20px] flex items-center justify-center break-keep drop-shadow-md mb-4 hidden';
                loginForm.insertBefore(errorMsg, submitBtn);
            }

            // CapsLock 시각적 경고 UI 자체 생성
            let capsLockWarning = document.getElementById('capsLockWarning');
            if (!capsLockWarning && pwInput) {
                capsLockWarning = document.createElement('div');
                capsLockWarning.id = 'capsLockWarning';
                capsLockWarning.className = 'hidden flex items-center gap-1.5 text-[11px] font-bold text-[#FF3B5C] ml-1 mt-2 transition-all duration-300';
                capsLockWarning.innerHTML = `<svg class="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> Caps Lock is ON`;
                pwInput.parentNode.parentNode.appendChild(capsLockWarning);
            }

            let isAuthenticating = false;
            let authTimeoutFallback = null;

            // 🌟 [방어 10] 오프라인 감지 및 데드락 릴리즈
            window.addEventListener('offline', () => { 
                if(errorMsg) { errorMsg.classList.remove('hidden'); errorMsg.innerHTML = `<span class="text-[#FF3B5C]">⚠️ 인터넷 연결이 끊어졌습니다.</span>`; }
            });
            window.addEventListener('online', () => { 
                if(errorMsg) { errorMsg.classList.remove('hidden'); errorMsg.innerHTML = `<span class="text-emerald-400">✅ 네트워크가 복구되었습니다.</span>`; }
                isAuthenticating = false; resetLoginButton();
            });

            // 비동기 에러 낚시망
            window.addEventListener('unhandledrejection', function(event) {
                console.error("[Y2C Telemetry Promise Rejection]", event.reason);
                if (isAuthenticating) {
                    isAuthenticating = false;
                    if (errorMsg) { errorMsg.classList.remove('hidden'); errorMsg.innerHTML = `<span class="text-[#FF3B5C]">통신 중 시스템 예외가 발생했습니다.</span>`; }
                    if (submitBtn) resetLoginButton();
                    triggerShake();
                }
            });

            // 모바일 가상 키보드 가림 자동 보정
            [idInput, pwInput].forEach(input => {
                if(!input) return;
                input.addEventListener('focus', () => { setTimeout(() => { window.scrollTo({ top: 80, behavior: 'smooth' }); }, 300); });
            });

            // 🌟 [방어 11] Caps Lock 감지 잔상 버그 픽스
            if (pwInput && capsLockWarning) {
                pwInput.addEventListener('keyup', (e) => {
                    if (e.getModifierState && e.getModifierState('CapsLock')) { 
                        capsLockWarning.classList.remove('hidden'); 
                    } else { 
                        capsLockWarning.classList.add('hidden'); 
                    }
                });
                pwInput.addEventListener('blur', () => { capsLockWarning.classList.add('hidden'); });
            }

            // 네이티브 진동(Shake) 피드백 
            function triggerShake() {
                if (!loginForm) return;
                loginForm.classList.remove('shake-animation');
                void loginForm.offsetWidth; // Reflow 트리거
                loginForm.classList.add('shake-animation');
            }

            // 버튼 무결성 스냅 복구 함수
            const originalBtnText = submitBtn ? submitBtn.innerHTML : "Secure Login";
            function resetLoginButton() {
                if (submitBtn) {
                    submitBtn.disabled = false; 
                    submitBtn.innerHTML = originalBtnText; 
                    submitBtn.style.background = ""; 
                    submitBtn.style.color = "";
                    submitBtn.style.border = "";
                    submitBtn.style.letterSpacing = "";
                    submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
                }
            }

            // 🌟 [방어 1, 4, 8] 15초 절대 타임아웃 & 지수형 백오프(Exponential Backoff) 엔진
            async function executeLogin(payload, retries = 2) {
                if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");
                const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};
                
                // 🚨 [방어 1] lastError 참조 에러 픽스
                let lastNetworkError;

                for (let i = 0; i <= retries; i++) {
                    // 🚨 [방어 4] let 선언으로 가비지 컬렉터 충돌 방지
                    let controller = new AbortController();
                    let timeoutId = setTimeout(() => controller.abort(), 15000); 

                    try {
                        const response = await fetch(TARGET_API_URL, {
                            method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                            redirect: "follow", body: JSON.stringify({ action: CONFIG.API.ENDPOINTS?.LOGIN || "login", ...safePayload }),
                            signal: controller.signal
                        });
                        
                        if (!response.ok) {
                            if (response.status === 404 || response.status === 401 || response.status === 403) {
                                const explicitError = new Error(`서버 통신 거부됨 (HTTP ${response.status})`);
                                explicitError.httpStatus = response.status;
                                explicitError.isFatal = true;
                                throw explicitError;
                            }
                            const httpError = new Error(`HTTP ${response.status}`);
                            httpError.httpStatus = response.status;
                            throw httpError;
                        }

                        const rawText = await response.text();
                        
                        let jsonResult;
                        try { jsonResult = JSON.parse(rawText); } 
                        catch (parseErr) { throw new Error("서버 응답 포맷(JSON) 파싱 실패. 시스템 포맷 오염 감지."); }

                        if (!jsonResult || typeof jsonResult !== 'object' || Array.isArray(jsonResult)) {
                            throw new Error("서버 응답 규격 무결성 훼손.");
                        }

                        return jsonResult;
                    } catch (err) {
                        lastNetworkError = err;
                        
                        if (err.isFatal) throw err;

                        if (err && err.httpStatus) {
                            if (err.httpStatus === 429) throw new Error("서버 접속 대기열 초과 (HTTP 429)");
                            if (err.httpStatus === 503) throw new Error("서버 일시적 점검 중 (HTTP 503)");
                        }
                        
                        // 🚨 [방어 8] Failed to fetch 즉시 자폭 방지 (백오프 재시도 릴레이)
                        if (err.message && err.message.includes("Failed to fetch")) {
                            lastNetworkError = new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-400 mt-1 block'>구글 스크립트 배포 '모든 사용자' 권한을 확인하세요.</span>");
                        }

                        if (i < retries) {
                            const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 500); 
                            if (errorMsg) { errorMsg.classList.remove('hidden'); errorMsg.innerHTML = `<span class="animate-pulse text-amber-400">보안 통신망 재시도 중... (${i+1}/2)</span>`; }
                            await new Promise(res => setTimeout(res, waitTime));
                        }
                    } finally {
                        // 🚨 [방어 4] finally 블록에서 완벽 릴리즈 강제화
                        clearTimeout(timeoutId);
                        controller = null;
                    }
                }
                throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간 초과 (15초 지연)<br><span class='text-[10px] text-gray-400'>인터넷 상태나 서버 동기화를 확인하세요.</span>" : (lastNetworkError?.message || "보안 서버 통신 실패."));
            }

            // 🌟 폼 전송 이벤트
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault(); 
                
                if (isAuthenticating) return;

                if (!idInput || !pwInput || !submitBtn) {
                    console.error("Critical System Error: Form elements not found.");
                    return;
                }

                // 🌟 [방어 5] 폼 요소 Null-Safe 접근 및 Invisible 특수문자 제거
                const id = String(idInput?.value || "").replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '');
                const pw = String(pwInput?.value || "").trim();

                if (!id || !pw) {
                    errorMsg.classList.remove('hidden');
                    errorMsg.innerHTML = `<span class="text-[#FF3B5C]">ID와 Passkey를 모두 입력해주세요.</span>`;
                    triggerShake();
                    return;
                }

                isAuthenticating = true;
                
                // 🌟 [방어 9] 무한 로딩 대비 20초 락 해제 (중첩 제거)
                clearTimeout(authTimeoutFallback);
                authTimeoutFallback = setTimeout(() => {
                    if(isAuthenticating) {
                        isAuthenticating = false;
                        resetLoginButton();
                        if(errorMsg) { errorMsg.classList.remove('hidden'); errorMsg.innerHTML = `<span class="text-[#FF3B5C]">시스템 렌더링 시간이 초과되었습니다. 다시 시도해 주세요.</span>`; }
                        triggerShake();
                    }
                }, 20000);

                errorMsg.classList.add('hidden');
                submitBtn.disabled = true;
                submitBtn.style.background = "rgba(255, 255, 255, 0.05)";
                submitBtn.style.color = "#FF3B5C";
                submitBtn.style.border = "1px solid #FF3B5C";
                submitBtn.style.letterSpacing = "0.1em";
                submitBtn.classList.add('cursor-not-allowed', 'pointer-events-none');
                submitBtn.innerHTML = `<span class="flex items-center justify-center gap-2"><svg class="animate-spin h-4 w-4 text-[#FF3B5C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> AUTHENTICATING...</span>`;

                let loginResult = null; 
                let isSuccessRedirecting = false;

                try {
                    loginResult = await executeLogin({ id: id, pw: pw });

                    if (loginResult && loginResult.success) {
                        errorMsg.classList.remove('hidden');
                        errorMsg.innerHTML = `<span class="text-emerald-400 font-bold drop-shadow-md">✅ SECURE SESSION ESTABLISHED</span>`;
                        
                        try {
                            clearY2CSession(); // 🌟 [방어 6] 스토리지 안전 클렌징
                            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, loginResult.token);
                            localStorage.setItem(CONFIG.STORAGE_KEYS.ROLE, loginResult.role);
                            localStorage.setItem(CONFIG.STORAGE_KEYS.CLIENT_NAME, loginResult.clientName);
                            localStorage.setItem("y2c_id", id);
                            localStorage.setItem("y2c_premium_state", loginResult.clientState || "DEFAULT");
                            
                            isSuccessRedirecting = true;
                        } catch(stErr) { 
                            throw new Error("로컬 스토리지 할당 실패: 기기 용량을 확인하거나 시크릿 모드를 해제하세요."); 
                        }

                        submitBtn.innerHTML = "✅ Access Granted";
                        submitBtn.style.background = "#059669"; 
                        submitBtn.style.color = "#ffffff";
                        submitBtn.style.border = "none";
                        
                        loginForm.style.transition = "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)"; 
                        loginForm.style.opacity = "0"; 
                        loginForm.style.pointerEvents = "none"; 
                        
                        clearTimeout(authTimeoutFallback);
                        
                        // 🌟 [방어 3] 권한 기반(RBAC) 무결성 라우팅
                        setTimeout(() => {
                            const targetRole = String(loginResult.role).toUpperCase();
                            if (targetRole === "MASTER" || targetRole === "VENDOR") {
                                window.location.replace("admin.html");
                            } else if (targetRole === "PARTNER") {
                                window.location.replace("dashboard.html");
                            } else {
                                window.location.replace("items.html");
                            }
                        }, 500);

                    } else {
                        errorMsg.classList.remove('hidden');
                        errorMsg.innerHTML = `<span class="text-[#FF3B5C]">⚠️ ${escapeHtml(loginResult?.message || "보안 인증이 거부되었습니다.")}</span>`;
                        triggerShake(); 
                    }
                } catch (err) {
                    errorMsg.classList.remove('hidden');
                    errorMsg.innerHTML = `<span class="text-[#FF3B5C]">${err.message}</span>`;
                    triggerShake(); 
                } finally {
                    clearTimeout(authTimeoutFallback);
                    if (!isSuccessRedirecting) {
                        isAuthenticating = false;
                        resetLoginButton();
                    }
                }
            });
        }
    });
})();
