// assets/js/config.js

const SYSTEM_CONFIG = {
  API: {
    // ⚠️ 최신 Google Apps Script Web App URL
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
      RECIPES: "get_recipes"
    }
  },
  STORAGE_KEYS: {
    USER_TOKEN: "y2c_premium_token",
    ROLE: "y2c_premium_role",
    CLIENT_NAME: "y2c_premium_client"
  },
  // 🌟 [엔터프라이즈] 캐나다 주별 세금 자동 계산 엔진 데이터 (Regional Tax Engine)
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

// 🌟 [엔터프라이즈] 글로벌 브라우저 세션 매니저 (30분 타임아웃)
(function() {
  if (window.location.pathname.indexOf('index.html') === -1 && window.location.pathname !== "/") {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
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
