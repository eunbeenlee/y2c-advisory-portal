// assets/js/config.js

const SYSTEM_CONFIG = {
  API: {
    // ⚠️ 아래 주소는 반드시 방금 새로 배포하신 V6.0 웹앱 URL로 교체해 주세요!
    BASE_URL: "https://script.google.com/macros/s/AKfycby1h2Yw2Q_f29c6N1lS8X0ZzZf4E8X0ZzZf4E8X0ZzZf4E8X0/exec",
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
  // 로그인 화면(index.html)이 아닐 때만 작동
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

    // 마우스 움직임, 키보드 입력, 클릭, 스크롤 감지 시 타이머 초기화
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // 페이지 로드 시 타이머 시작
    resetIdleTimer();
  }
})();
