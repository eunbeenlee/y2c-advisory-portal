// assets/js/config.js

const SYSTEM_CONFIG = {
  // 1. 브랜드 및 도메인 정보
  BRAND: {
    NAME: "Sinjeon Canada",
    PORTAL_TITLE: "Sinjeon Canada Franchise Portal",
    DOMAIN: "https://partner.sinjeoncanada.com",
    SUPPORT_EMAIL: "support@sinjeoncanada.com"
  },

  // 2. API 엔드포인트 (백엔드 통신 주소)
  API: {
    // 💡 가장 중요한 부분: 웹페이지가 요청을 보낼 최신 GAS 서버 주소입니다.
    BASE_URL: "https://script.google.com/macros/s/AKfycbxECuPPrxlh8FT9L5JUhFPJzck57IEd6JTFlU68k7NvHUXceBnHS9loeIPO5UXjSeMRtw/exec",
    ENDPOINTS: {
      AUTH: "login",
      DASHBOARD: "get_dashboard",
      ITEMS: "get_items"
    }
  },

  // 3. 권한(Role) 및 라우팅 제어
  ROLES: {
    MASTER: {
      id: "MASTER",
      accessiblePages: ["*"], // 마스터는 모든 메뉴 접근 가능
      redirectAfterLogin: "dashboard.html"
    },
    FRANCHISEE: {
      id: "FRANCHISEE",
      accessiblePages: ["dashboard.html", "items.html"],
      redirectAfterLogin: "dashboard.html"
    }
  },

  // 4. 세션 관리 (브라우저 임시 저장소 키 이름)
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session",
    CLIENT_NAME: "sinjeon_client_name",
    ROLE: "sinjeon_user_role"
  }
};
