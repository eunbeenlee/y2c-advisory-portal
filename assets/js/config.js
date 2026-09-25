/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Core Config (V40.17 STABLE)
 * [Critical Fix] Anti-Debugging 락다운 완전 소각 및 Console Freeze 해제
 * ============================================================================
 */

"use strict";

(function(global) {
    // 🌟 [방어 1] Clickjacking Defense: iframe 납치 감지 시 본래 주소로 즉각 탈출
    if (global.top !== global.self) {
        try { global.top.location = global.self.location; } 
        catch (e) { global.location.replace("about:blank"); }
    }

    const APP_VERSION = "V40.17_ENTERPRISE_MASTER_STABLE";

    // 🌟 기존 시스템 설정을 100% 무손실로 보존
    const _SYSTEM_CONFIG = {
        VERSION: APP_VERSION,
        API: {
            // 🚨 [주의] 백엔드 배포 경로가 변경되면 이 부분을 업데이트하십시오.
            BASE_URL: "https://script.google.com/macros/s/AKfycbzT-_ZIfaVv6hQ6L9mE-Q4L0g9a17Q2Bw34gT4wI3Q19586QpL_D7I09Z0Y090zXw/exec",
            TIMEOUT_MS: 35000 
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
        // 캐나다 전역 세율 무손실 보존
        TAX_RATES: {
            "ON": { name: "HST (13%)", rate: 0.13 }, 
            "BC": { name: "GST 5% + PST 7%", rate: 0.12 }, 
            "AB": { name: "GST (5%)", rate: 0.05 }, 
            "SK": { name: "GST 5% + PST 6%", rate: 0.11 }, 
            "MB": { name: "GST 5% + RST 7%", rate: 0.12 }, 
            "QC": { name: "GST 5% + QST 9.975%", rate: 0.14975 },
            "DEFAULT": { name: "Standard Tax (13%)", rate: 0.13 }
        },
        ROLES: {
            MASTER: "MASTER",
            VENDOR: "VENDOR",
            PARTNER: "PARTNER"
        },
        CONTACTS: {
            ADMIN_EMAIL: "admin@sinjeoncanada.com"
        },
        CONSTANTS: {
            MAX_QTY_LIMIT: 9999, 
            MAX_FILE_SIZE_MB: 10
        }
    };

    // 🌟 [방어 2] Recursive Object.freeze (딥 프리즈 알고리즘 유지)
    // - 객체의 값을 보호하되, Console 객체 등 브라우저 네이티브 영역은 절대 건드리지 않음
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

    // 전역 window 객체에 록다운된 설정 안전하게 주입
    global.SYSTEM_CONFIG = deepFreeze(_SYSTEM_CONFIG);
    global.__Y2C_VERSION__ = APP_VERSION;

    // ========================================================================
    // 🌐 [방어 3] Cross-Tab Security Sync (브라우저 탭 간 로그아웃 동기화)
    // ========================================================================
    global.addEventListener('storage', function(e) {
        if (e.key === global.SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN && !e.newValue) {
            alert("보안 세션이 다른 창에서 만료/로그아웃 되었습니다.");
            global.location.replace("index.html");
        }
    });

    // 🌟 [방어 4] 포커스 시 세션 스캔 (사파리 시크릿 모드 크래시 방어 적용)
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
            console.warn("[Y2C Storage] Storage Access Denied by Browser Policy.");
        }
    });

    // ========================================================================
    // ⚙️ [방어 5] 글로벌 재무 및 유틸리티 헬퍼 (메모리 재사용 객체)
    // ========================================================================
    const CAD_FORMATTER = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
    
    global.Y2C_UTILS = deepFreeze({
        generateTxId: function() {
            const ts = Date.now().toString(36).toUpperCase();
            if (global.crypto && global.crypto.randomUUID) return "TX-" + ts + "-" + global.crypto.randomUUID().split('-')[0].toUpperCase();
            return "TX-" + ts + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
        },
        formatCAD: function(amount) {
            let num = Number(amount);
            if (isNaN(num) || !isFinite(num)) num = 0;
            // Number.EPSILON 1센트 오차 정밀 보정
            num = Math.round((num + Number.EPSILON) * 100) / 100;
            return CAD_FORMATTER.format(num);
        },
        formatISODate: function(dateObj) {
            if (!dateObj || isNaN(dateObj.getTime())) return "-";
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        },
        isValidTokenFormat: function(token) {
            if (!token || typeof token !== 'string') return false;
            const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
            return jwtRegex.test(token);
        },
        sanitizeRegionCode: function(code) {
            if(!code) return "DEFAULT";
            return String(code).replace(/[^A-Za-z]/g, '').toUpperCase().substring(0, 2);
        }
    });

    // 🌟 [방어 6] 네트워크 오류 글로벌 감지망 (충돌 없는 순수 감지)
    global.addEventListener('error', function(e) {
        if(e.message && e.message.indexOf('SYSTEM_CONFIG') > -1) {
            console.error("[Y2C Global Guard] Config load order mismatch detected.");
        }
    });

})(window);
