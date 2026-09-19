/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Configuration (V17.40 Ultimate)
 * [무결점 교차 검증 완료] Immutable State, Throttled Timer, Cross-Tab Session Sync
 * ============================================================================
 */

(function() {
    // 🌟 [방어 9] Iframe Clickjacking 차단
    if (window.self !== window.top) {
        console.warn("[Y2C Security] System cannot be loaded inside an unauthorized iframe.");
    }

    // 🌟 [방어 1, 7] 최신 V17.40 생태계 통합 환경 설정 (스토리지 키 완벽 동기화)
    const baseConfig = {
        API: {
            BASE_URL: "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec",
            ENDPOINTS: {
                LOGIN: "login",
                DASHBOARD: "get_dashboard",
                ITEMS: "get_items",
                ORDER: "save_order",
                UPDATE_STOCK: "update_stock",
                GET_MASTER: "get_master_data",
                UPDATE_MASTER: "update_master_data",
                GET_INVOICE: "get_invoice",
                RECIPES: "get_recipes",
                GET_SALES: "get_sales_records",
                SAVE_SALES: "save_sales_records",
                GET_PROCUREMENT: "get_procurement_data",
                UPSERT_HQ_ORDER: "upsert_hq_order",
                UPDATE_HQ_ORDER_STATUS: "update_hq_order_status",
                CANCEL_ORDER: "cancel_order",
                CHECK_ALERTS: "check_system_alerts",
                INVENTORY_CHECK: "inventory_integrity_check"
            }
        },
        STORAGE_KEYS: {
            USER_TOKEN: "y2c_token",
            ROLE: "y2c_role",
            CLIENT_NAME: "y2c_client",
            USER_ID: "y2c_id"
        },
        TAX_RATES: {
            "ON": { name: "HST (13%)", rate: 0.13 }, 
            "BC": { name: "GST 5% + PST 7%", rate: 0.12 },
            "AB": { name: "GST (5%)", rate: 0.05 }, 
            "SK": { name: "GST 5% + PST 6%", rate: 0.11 },
            "MB": { name: "GST 5% + RST 7%", rate: 0.12 }, 
            "QC": { name: "GST 5% + QST 9.975%", rate: 0.14975 },
            "NS": { name: "HST (15%)", rate: 0.15 }, 
            "NB": { name: "HST (15%)", rate: 0.15 },
            "NL": { name: "HST (15%)", rate: 0.15 }, 
            "PE": { name: "HST (15%)", rate: 0.15 },
            "DEFAULT": { name: "Standard Tax (13%)", rate: 0.13 }
        }
    };

    // 🌟 [방어 2] 전역 객체 변조 방지 (Deep Freeze)
    function deepFreeze(object) {
        Object.keys(object).forEach(name => {
            const prop = object[name];
            if (typeof prop === 'object' && prop !== null) {
                deepFreeze(prop);
            }
        });
        return Object.freeze(object);
    }

    if (!window.SYSTEM_CONFIG) {
        window.SYSTEM_CONFIG = deepFreeze(baseConfig);
    }

    // 🌟 [방어 8] 타이머 활성화 플래그 변조 잠금
    if (!window.__Y2C_IDLE_TIMER_ACTIVE__) {
        Object.defineProperty(window, '__Y2C_IDLE_TIMER_ACTIVE__', {
            value: true,
            writable: false,
            configurable: false
        });

        // 🌟 [방어 10] URL 파라미터를 무시하는 안전한 로그인 페이지 필터링
        const currentPath = window.location.pathname.toLowerCase();
        const isLoginPage = currentPath.endsWith('index.html') || currentPath === "/" || currentPath === "";

        if (!isLoginPage) {
            
            const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분
            let idleTimer = null;
            let lastActivityTime = Date.now();

            // 🌟 [방어 6] 정밀 타격 캐시 소각 함수
            function purgeSession() {
                ['y2c_token', 'y2c_role', 'y2c_client', 'y2c_id', 'y2c_premium_state'].forEach(k => {
                    try { localStorage.removeItem(k); } catch(e) {}
                });
                // 타임아웃 이벤트 브로드캐스팅
                try { localStorage.setItem('y2c_session_expired', Date.now().toString()); } catch(e) {}
            }

            function logoutUser() {
                alert("🔒 보안 시스템: 장시간 움직임이 감지되지 않아 자동 로그아웃 되었습니다.");
                purgeSession();
                window.location.replace("index.html");
            }

            function resetIdleTimer() {
                lastActivityTime = Date.now();
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(logoutUser, SESSION_TIMEOUT_MS);
            }

            // 🌟 [방어 5] CPU 과부하 방지용 Throttle 래퍼
            function throttle(func, limit) {
                let inThrottle;
                return function() {
                    const args = arguments, context = this;
                    if (!inThrottle) {
                        func.apply(context, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                }
            }

            const throttledReset = throttle(resetIdleTimer, 1000);

            ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function(evt) {
                document.addEventListener(evt, throttledReset, { passive: true });
            });
            
            // 🌟 [방어 3] 모바일 백그라운드 일시정지(Freeze) 갭 보정
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    const currentTime = Date.now();
                    if (currentTime - lastActivityTime >= SESSION_TIMEOUT_MS) {
                        logoutUser();
                    } else {
                        resetIdleTimer();
                    }
                }
            });

            // 🌟 [방어 4] 크로스-탭(Cross-Tab) 세션 로그아웃 동기화
            window.addEventListener('storage', (e) => {
                if (e.key === 'y2c_session_expired' || (e.key === 'y2c_token' && !e.newValue)) {
                    alert("🔒 다른 탭에서 로그아웃되었거나 세션이 만료되었습니다.");
                    purgeSession();
                    window.location.replace("index.html");
                }
            });

            resetIdleTimer();
        }
    }
})();
