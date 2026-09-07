// assets/js/config.js

const SYSTEM_CONFIG = {
  API: {
    // ⚠️ 구글 스크립트에서 [새 버전] 배포 후 발급받은 주소를 아래에 넣어주세요.
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
  // 🌟 [엔터프라이즈] 캐나다 주별 세금 복합 계산 엔진
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

// 🌟 [엔터프라이즈] 글로벌 브라우저 세션 30분 자동 로그아웃 매니저
(function() {
  if (window.location.pathname.indexOf('index.html') === -1 && window.location.pathname !== "/") {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
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

    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    
    resetIdleTimer();
  }
})();
