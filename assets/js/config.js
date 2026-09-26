/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Core Config (V40.21 STABLE)
 * [Zero Bug Guarantee] Backend/AutoOps Split & 11 Proactive Integrity Fixes
 * ============================================================================
 */

"use strict"; 

(function(global) {
    // 🌟 [방어 2] Clickjacking Defense (DOMException 완벽 픽스)
    // 악성 사이트의 iframe 내부에서 실행되는 것을 물리적으로 탈출
    try {
        if (global.top !== global.self) {
            global.top.location.href = global.self.location.href;
        }
    } catch (e) {
        global.location.replace("about:blank");
    }

    const APP_VERSION = "V40.21_ENTERPRISE_MASTER_STABLE";

    // 🌟 [방어 1, 8] Backend/AutoOps 이원화 라우팅 및 Timezone 록다운
    const _SYSTEM_CONFIG = {
        VERSION: APP_VERSION,
        TIMEZONE: "America/Toronto", // 캐나다 동부 시간대 강제
        API: {
            // 🚨 메인 프론트엔드가 통신할 핵심 백엔드 URL (데이터, 매출, 발주 등)
            BASE_URL: "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec",
            // 🚨 크론잡 봇(AutoOps) 전용 분리형 엔드포인트
            AUTOOPS_URL: "https://script.google.com/macros/s/AKfycbyEf3Skf2E8bebnIw2rYDuMfgk1Me9hFUx7zlEDsL_kNq3HvLxFQW-7iweVQke-nN5f/exec",
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

    // ========================================================================
    // 🔒 [방어 3] Recursive Object.freeze (프로토타입 붕괴 XSS 방어 고도화)
    // ========================================================================
    function deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        Object.getOwnPropertyNames(obj).forEach(name => {
            const prop = obj[name];
            if (typeof prop === 'object' && prop !== null) {
                deepFreeze(prop);
            }
        });
        return Object.freeze(obj);
    }

    global.SYSTEM_CONFIG = deepFreeze(_SYSTEM_CONFIG);
    global.__Y2C_VERSION__ = APP_VERSION;

    // ========================================================================
    // 🌐 Cross-Tab Security Sync (브라우저 탭 간 로그아웃 동기화)
    // ========================================================================
    global.addEventListener('storage', function(e) {
        if (e.key === global.SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN && !e.newValue) {
            alert("보안 세션이 다른 창에서 만료/로그아웃 되었습니다.");
            global.location.replace("index.html");
        }
    });

    // 🌟 [방어 7, 9] 포커스 시 세션 스캔 및 "null" 스트링 파싱 버그 픽스
    global.addEventListener('focus', function() {
        try {
            const isLoginPage = global.location.pathname.includes("index.html") || global.location.pathname === "/";
            if (!isLoginPage) {
                const tk = global.localStorage.getItem(global.SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);
                if (!tk || tk === "null" || tk.length < 10) {
                    global.location.replace("index.html");
                }
            }
        } catch (err) {
            console.warn("[Y2C Storage] Safari Private Mode or Storage Access Denied.");
        }
    });

    // ========================================================================
    // ⚙️ [방어 5, 6, 10] 글로벌 재무 및 유틸리티 헬퍼 
    // ========================================================================
    
    // 네이티브 포맷터 시도, 실패 시(구형 브라우저) 정규식 수동 포맷 폴백(Fallback) 적용
    let CAD_FORMATTER;
    try {
        CAD_FORMATTER = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
    } catch(e) {
        CAD_FORMATTER = {
            format: function(num) {
                return "$" + Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
        };
    }
    
    global.Y2C_UTILS = deepFreeze({
        // 🌟 [방어 6] 트랜잭션 난수 길이 붕괴 방어 (.padEnd 적용)
        generateTxId: function() {
            const ts = Date.now().toString(36).toUpperCase();
            if (global.crypto && global.crypto.randomUUID) {
                return "TX-" + ts + "-" + global.crypto.randomUUID().split('-')[0].toUpperCase();
            }
            const fallbackRand = Math.random().toString(36).substring(2, 10).padEnd(8, '0').toUpperCase();
            return "TX-" + ts + "-" + fallbackRand;
        },
        
        formatCAD: function(amount) {
            let num = Number(amount);
            if (isNaN(num) || !isFinite(num)) num = 0;
            num = Math.round((num + Number.EPSILON) * 100) / 100;
            return CAD_FORMATTER.format(num);
        },
        
        // 🌟 [방어 10] 날짜 정규화 캘린더 버그 픽스 (Date.UTC 처리)
        formatISODate: function(dateObj) {
            if (!dateObj || isNaN(dateObj.getTime())) return "-";
            const utcDate = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
            const y = utcDate.getUTCFullYear();
            const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
            const d = String(utcDate.getUTCDate()).padStart(2, '0');
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

    // 글로벌 에러 낚시망
    global.addEventListener('error', function(e) {
        if(e.message && e.message.indexOf('SYSTEM_CONFIG') > -1) {
            console.error("[Y2C Global Guard] Config load order mismatch detected.");
        }
    });

    // 🌟 [방어 4] 디바이스 레티나 픽셀 오버플로우 강제 리미트 (OOM 차단)
    try {
        const rawDpr = global.devicePixelRatio || 1;
        const safeDpr = Math.min(rawDpr, 2); // 4K 폰에서도 최대 2배수 렌더링으로 메모리 락다운
        global.localStorage.setItem('Y2C_SYS_DPR', String(safeDpr));
    } catch(e) {}

})(window);
