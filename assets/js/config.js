// assets/js/config.js

const SYSTEM_CONFIG = {
  API: {
    // 🌟 새로 발급해주신 최신 Google Apps Script Web App URL 적용 완료
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
  }
};

// 🌟 [엔터프라이즈 기능] 글로벌 브라우저 세션 매니저 (30분 타임아웃)
(function() {
  if (window.location.pathname.indexOf('index.html') === -1 && window.location.pathname !== "/") {
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

    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
  }
})();
