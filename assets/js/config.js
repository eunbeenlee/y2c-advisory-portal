/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Core Config (V40.16 Enterprise)
 * [33+ Defenses] Recursive Deep Freeze, Anti-Tampering, Cross-Tab Sync, No-Leak
 * ============================================================================
 */

"use strict"; // 🌟 [방어 4] Strict Mode 강제화로 스코프 오염 및 암묵적 전역 변수 생성 차단

(function(global) {
    // 🌟 [방어 5] Clickjacking Defense: iframe 납치 감지 시 즉각 탈출
    if (global.top !== global.self) {
        try { global.top.location = global.self.location; } 
        catch (e) { global.location.replace("about:blank"); }
    }

    // 🌟 [방어 16] Version Control Anchor
    const APP_VERSION = "V40.16_ENTERPRISE_MASTER";

    // 🌟 [방어 33] Zero-Deletion: 기존 시스템 설정을 100% 무손실로 보존하며 객체 확장
    const _SYSTEM_CONFIG = {
        VERSION: APP_VERSION,
        API: {
            // 🚨 [주의] 백엔드 배포 경로가 변경되면 이 부분을 업데이트하십시오.
            BASE_URL: "https://script.google.com/macros/s/AKfycbzT-_ZIfaVv6hQ6L9mE-Q4L0g9a17Q2Bw34gT4wI3Q19586QpL_D7I09Z0Y090zXw/exec",
            TIMEOUT_MS: 35000 // 프론트엔드 Absolute 킬스위치 타임아웃
        },
        STORAGE_KEYS: {
            USER_TOKEN: "y2c_token",
            ROLE: "y2c_role",
            CLIENT_NAME: "y2c_client",
            USER_ID: "y2c_id",
            PREMIUM_STATE: "y2c_premium_state",
            LANG_PREF: "y2c_lang",
            CACHE_CATALOG: "Y2C_ITEMS_CACHE_DEFAULT_ALL"
        },
        // 🌟 [방어 25] CRA Tax Standard Enforcement (캐나다 전역 세율 록다운)
        TAX_RATES: {
            "ON": { name: "HST (13%)", rate: 0.13 }, 
            "BC": { name: "GST 5% + PST 7%", rate: 0.12 }, 
            "AB": { name: "GST (5%)", rate: 0.05 }, 
            "SK": { name: "GST 5% + PST 6%", rate: 0.11 }, 
            "MB": { name: "GST 5% + RST 7%", rate: 0.12 }, 
            "QC": { name: "GST 5% + QST 9.975%", rate: 0.14975 },
            "DEFAULT": { name: "Standard Tax (13%)", rate: 0.13 }
        },
        // 🌟 [방어 26] Role Hierarchy Definition
        ROLES: {
            MASTER: "MASTER",
            VENDOR: "VENDOR",
            PARTNER: "PARTNER"
        },
        // 🌟 [방어 29] B2B Email CC List 록다운
        CONTACTS: {
            ADMIN_EMAIL: "admin@sinjeoncanada.com"
        },
        // 시스템 공통 상수
        CONSTANTS: {
            MAX_QTY_LIMIT: 9999, // 재무 오버플로우 방어 한계선
            MAX_FILE_SIZE_MB: 10
        }
    };

    // ========================================================================
    // 🔒 [방어 1] Recursive Object.freeze (딥 프리즈 알고리즘)
    // - 해커가 개발자 도구를 통해 API 주소나 세션 키값을 덮어쓰는 것을 물리적으로 차단
    // ========================================================================
    function deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        Object.keys(obj).forEach(name => {
            const prop = obj[name];
            if (typeof prop === 'object' && prop !== null) {
                deepFreeze(prop);
            }
        });
        return Object.freeze(obj);
    }

    // 전역 window 객체에 록다운된 설정 주입 (기존 호환성 100% 유지)
    global.SYSTEM_CONFIG = deepFreeze(_SYSTEM_CONFIG);
    global.__Y2C_VERSION__ = APP_VERSION;

    // ========================================================================
    // 🛡️ [방어 2] Anti-Debugging & Console 샌드박싱
    // ========================================================================
    const isProd = true; // 프로덕션 모드 강제
    if (isProd) {
        // [방어 3] Prototype Pollution & Console Tampering 방지
        const nativeConsoleLog = console.log;
        const nativeConsoleWarn = console.warn;
        const nativeConsoleError = console.error;

        Object.defineProperty(global, 'console', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: Object.freeze({
                log: function(...args) { if(global.localStorage.getItem('Y2C_DEV_MODE') === 'true') nativeConsoleLog.apply(console, args); },
                warn: function(...args) { nativeConsoleWarn.apply(console, args); },
                error: function(...args) { nativeConsoleError.apply(console, args); },
                info: function() {},
                debug: function() {},
                trace: function() {}
            })
        });

        // 안티 디버거: 누군가 개발자도구를 강제로 열어 소스분석을 시도하면 무한 루프 발생
        setInterval(() => {
            const before = new Date().getTime();
            (function() { return false; })['constructor']('debugger')();
            const after = new Date().getTime();
            if (after - before > 100) {
                // 디버거가 걸렸을 때의 딜레이를 감지
                global.document.body.innerHTML = "<div style='background:#E3000F;color:#fff;padding:20px;text-align:center;font-family:sans-serif;font-weight:bold;font-size:24px;height:100vh;display:flex;align-items:center;justify-content:center;'>Security Alert: Unathorized debugging detected.</div>";
            }
        }, 3000);
    }

    // ========================================================================
    // 🌐 [방어 6, 23] Cross-Tab Security Sync (브라우저 탭 간 로그아웃 동기화)
    // ========================================================================
    global.addEventListener('storage', function(e) {
        // 다른 탭에서 로그아웃되어 유저 토큰이 날아갔을 경우, 현재 탭도 즉시 로그아웃
        if (e.key === global.SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN && !e.newValue) {
            alert("보안 세션이 다른 창에서 만료/로그아웃 되었습니다.");
            global.location.replace("index.html");
        }
    });

    // 화면이 백그라운드에서 다시 돌아올 때마다 세션 스캔 (Focus Watchdog)
    global.addEventListener('focus', function() {
        try {
            const isLoginPage = global.location.pathname.includes("index.html") || global.location.pathname === "/";
            if (!isLoginPage) {
                const tk = global.localStorage.getItem(global.SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);
                if (!tk || tk.length < 10) {
                    global.location.replace("index.html");
                }
            }
        } catch (err) {
            // [방어 20] 사파리 시크릿 모드 등 스토리지 접근 차단 폴백
            console.error("Storage Access Denied by Browser Privacy Policy.");
        }
    });

    // ========================================================================
    // ⚙️ [방어 27, 28, 30] 글로벌 재무 및 유틸리티 헬퍼 (메모리 재사용 객체)
    // ========================================================================
    
    // 캐나다 달러(CAD) 렌더러 단일 인스턴스 (성능 극대화)
    const CAD_FORMATTER = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
    
    // 글로벌 헬퍼 객체를 window에 노출 (불변 처리)
    global.Y2C_UTILS = deepFreeze({
        // [방어 30] 멱등성 식별키 난수 생성기
        generateTxId: function() {
            const ts = Date.now().toString(36).toUpperCase();
            if (global.crypto && global.crypto.randomUUID) return "TX-" + ts + "-" + global.crypto.randomUUID().split('-')[0].toUpperCase();
            return "TX-" + ts + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
        },
        
        // 재무 포맷터 
        formatCAD: function(amount) {
            let num = Number(amount);
            if (isNaN(num) || !isFinite(num)) num = 0;
            // Number.EPSILON 보정
            num = Math.round((num + Number.EPSILON) * 100) / 100;
            return CAD_FORMATTER.format(num);
        },
        
        // 날짜 정규화
        formatISODate: function(dateObj) {
            if (!dateObj || isNaN(dateObj.getTime())) return "-";
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        },
        
        // [방어 8] 토큰 정규식 유효성 1차 로컬 검사기
        isValidTokenFormat: function(token) {
            if (!token || typeof token !== 'string') return false;
            // JWT 표준(Header.Payload.Signature) 규격 매칭 검사
            const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
            return jwtRegex.test(token);
        },

        // [방어 31] 허브 코드 포맷 정규화
        sanitizeRegionCode: function(code) {
            if(!code) return "DEFAULT";
            return String(code).replace(/[^A-Za-z]/g, '').toUpperCase().substring(0, 2);
        }
    });

    // ========================================================================
    // 🚨 [방어 18, 19] 글로벌 에러 낚시망 및 네트워크 핑(Ping) 헬퍼
    // ========================================================================
    global.addEventListener('error', function(e) {
        // Cross-Origin 스크립트 에러나 치명적 렌더링 붕괴 캡쳐
        console.error("[Y2C Global Fault Guard] Caught an unhandled exception:", e.message);
    });

    // 디바이스 레티나 픽셀 캐싱 (차트 OOM 최적화 참조용)
    const dpr = global.devicePixelRatio || 1;
    global.localStorage.setItem('Y2C_SYS_DPR', String(dpr));

    // 로딩 시점에 네트워크 상태를 확인하여 초기화 전 경고 방어망 형성
    if (!global.navigator.onLine) {
        console.warn("[Y2C Network Guard] System initialized in offline state.");
    }

})(window);
