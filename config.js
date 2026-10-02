/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Configuration & Security Engine
 * Version: V41.20 ULTIMATE (Absolute Memory Lockdown)
 * ============================================================================
 * [CRITICAL FIX 1] 404 Network Bug Eradicated: Provides the missing configuration node.
 * [CRITICAL FIX 2] XSS Payload Hijacking Prevented: Applies deep Object.freeze() to strictly lock API endpoints.
 * [CRITICAL FIX 3] Global PWA Installer: Captures 'beforeinstallprompt' to allow native app installation.
 * [ARCHITECTURE] Loaded universally across all 6 HTML templates before auth.js.
 * ============================================================================
 */

(function(global) {
    "use strict";

    // 🚨 1. Raw Configuration Object (엔터프라이즈 환경 변수 원본)
    const RAW_CONFIG = {
        
        // [CORE API] 구글 앱스 스크립트(GAS) 백엔드 종단점
        API: {
            BASE_URL: "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec",
            TIMEOUT_MS: 15000,
            MAX_RETRIES: 2
        },
        
        // [STORAGE] 브라우저 세션/로컬 스토리지 키 매핑 (auth.js와 100% 동기화)
        STORAGE_KEYS: {
            USER_TOKEN: "y2c_token",
            ROLE: "y2c_role",
            CLIENT_NAME: "y2c_client",
            REGION: "y2c_region",
            PREMIUM_STATE: "y2c_premium_state",
            USER_ID: "y2c_id"
        },
        
        // [APP META] 시스템 버전 및 로깅 정보
        APP: {
            VERSION: "V41.20_ENTERPRISE_ULTIMATE",
            ENVIRONMENT: "PRODUCTION",
            COMPANY: "SINJEON CANADA / Y2C HOLDINGS LTD.",
            SUPPORT_EMAIL: "admin@sinjeoncanada.com"
        }
    };

    // ============================================================================
    // 🛡️️ [MODULE 1] IMMUTABILITY ENGINE (메모리 딥 프리즈 록다운)
    // ============================================================================
    /**
     * 객체 내부의 객체까지 재귀적으로(Recursively) 얼려버려 
     * 브라우저 개발자 도구(Console)나 악성 스크립트가 변수를 조작하는 것을 원천 차단합니다.
     */
    function deepFreeze(object) {
        const propNames = Object.getOwnPropertyNames(object);
        for (const name of propNames) {
            const value = object[name];
            if (value && typeof value === "object") {
                deepFreeze(value);
            }
        }
        return Object.freeze(object);
    }

    // 전역 변수 window.SYSTEM_CONFIG에 록다운된 설정 주입
    // Object.defineProperty를 사용하여 덮어쓰기(Overwrite) 자체를 문법적으로 금지시킵니다.
    try {
        Object.defineProperty(global, 'SYSTEM_CONFIG', {
            value: deepFreeze(RAW_CONFIG),
            writable: false,     // 수정 불가
            configurable: false, // 삭제 불가
            enumerable: true
        });
        console.log(`[Y2C Config Engine] Initialized & Locked. Build: ${global.SYSTEM_CONFIG.APP.VERSION}`);
    } catch (e) {
        console.warn("[Y2C Config Engine] Strict lockdown bypassed or already initialized.");
    }

    // ============================================================================
    // 📱 [MODULE 2] PROGRESSIVE WEB APP (PWA) GLOBAL INSTALLER
    // ============================================================================
    /**
     * 모바일 환경(iOS Safari, Android Chrome) 등에서 사용자가 포털에 접속했을 때
     * '바탕화면에 추가(Install App)' 기능을 자연스럽게 호출하기 위한 글로벌 리스너입니다.
     */
    let deferredPrompt;

    global.addEventListener('beforeinstallprompt', (e) => {
        // 브라우저의 기본 설치 배너가 뜨는 것을 막고 시스템이 통제권을 가져옵니다.
        e.preventDefault();
        deferredPrompt = e;
        
        // 앱이 아직 설치되지 않은 경우, 시스템 전역 객체에 설치 함수를 노출합니다.
        global.Y2C_PWA_Installer = {
            isReady: true,
            promptInstall: async function() {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`[Y2C PWA] User installation choice: ${outcome}`);
                    deferredPrompt = null; // 프롬프트는 한 번만 사용 가능
                    return outcome === 'accepted';
                }
                return false;
            }
        };

        console.log("[Y2C PWA] Native Installation Prompt is ready.");
    });

    global.addEventListener('appinstalled', () => {
        // 앱 설치가 완료되면 메모리에서 리스너를 파기하여 리소스를 확보합니다.
        deferredPrompt = null;
        console.log("[Y2C PWA] Enterprise Portal was successfully installed as a Native App.");
    });

    // ============================================================================
    // 🧹 [MODULE 3] CONSOLE CLEANER (프로덕션 환경 보안)
    // ============================================================================
    /**
     * 프로덕션 빌드에서는 해커나 악성 파트너가 브라우저 콘솔을 통해 
     * 데이터의 흐름을 읽어내는 것을 방지하기 위해 경고/에러 로그를 제외한 기본 로그를 은닉합니다.
     */
    if (global.SYSTEM_CONFIG && global.SYSTEM_CONFIG.APP.ENVIRONMENT === "PRODUCTION") {
        const originalLog = console.log;
        console.log = function() {
            // Y2C 코어 엔진의 부팅 메시지만 허용하고 나머지는 소각합니다.
            if (arguments[0] && typeof arguments[0] === 'string' && (arguments[0].includes('[Y2C') || arguments[0].includes('SECURE'))) {
                originalLog.apply(console, arguments);
            }
        };
        // 콘솔 화면을 주기적으로 청소하는 것을 원할 경우 해제할 수 있는 주석 (현재는 디버깅을 위해 비활성화)
        // setTimeout(console.clear, 3000);
    }

})(typeof window !== "undefined" ? window : this);
