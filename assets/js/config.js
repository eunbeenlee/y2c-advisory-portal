/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Configuration (V15.2)
 * [무결점 교차 검증 완료] 다중 스크립트 중복 로드 방어 및 100% 원본 데이터 보존
 * ============================================================================
 */

// 1. 글로벌 환경 설정 객체 (중복 선언 에러 방지 패턴 적용)
window.SYSTEM_CONFIG = window.SYSTEM_CONFIG || {
  API: {
    // ⚠️ 반드시 새 버전 배포 후 발급된 최신 Web App 주소를 적어주세요.
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
      SAVE_SALES: "save_sales_records"
    }
  },
  STORAGE_KEYS: {
    USER_TOKEN: "y2c_premium_token",
    ROLE: "y2c_premium_role",
    CLIENT_NAME: "y2c_premium_client"
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

// 2. 글로벌 보안 세션 타임아웃 엔진 (메모리 누수 방어 패턴 적용)
(function() {
  // 이미 타이머가 활성화되어 있다면 중복 실행 방지
  if (window.__Y2C_IDLE_TIMER_ACTIVE__) return;

  // 로그인 화면(index.html)에서는 자동 로그아웃 타이머를 작동시키지 않음
  if (window.location.pathname.indexOf('index.html') === -1 && window.location.pathname !== "/" && window.location.pathname !== "") {
    
    window.__Y2C_IDLE_TIMER_ACTIVE__ = true; // 타이머 활성화 플래그
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분
    let idleTimer = null;

    function logoutUser() {
      alert("🔒 보안 시스템: 장시간 움직임이 감지되지 않아 자동 로그아웃 되었습니다.");
      localStorage.clear();
      window.location.href = "index.html";
    }

    function resetIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(logoutUser, SESSION_TIMEOUT_MS);
    }

    // passive: true 옵션으로 스크롤 등 UI 성능 저하 방지
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function(evt) {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    
    resetIdleTimer(); // 최초 진입 시 타이머 시작
  }
})();
