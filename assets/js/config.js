// assets/js/config.js

const SYSTEM_CONFIG = {
  // 1. 브랜드 및 도메인 정보
  BRAND: {
    NAME: "Sinjeon Canada",
    PORTAL_TITLE: "Sinjeon Canada Franchise Portal",
    DOMAIN: "https://partner.sinjeoncanada.com",
    SUPPORT_EMAIL: "support@sinjeoncanada.com" // 에러 발생 시 가맹점주에게 노출될 연락처
  },

  // 2. API 엔드포인트 (백엔드)
  API: {
    // 구글 Apps Script 웹앱 배포 URL
    BASE_URL: "https://script.google.com/macros/s/여기에_GAS_배포_키를_입력하세요/exec",
    ENDPOINTS: {
      AUTH: "login",
      SALES_REPORT: "get_sales",
      ITEM_LIST: "get_items"
    }
  },

  // 3. 권한(Role) 및 라우팅 제어
  ROLES: {
    MASTER: {
      id: "MASTER",
      accessiblePages: ["*"], // 모든 페이지 접근 가능
      redirectAfterLogin: "dashboard_master.html" // 마스터 전용 대시보드
    },
    FRANCHISEE: {
      id: "FRANCHISEE",
      accessiblePages: ["dashboard_franchise.html", "items.html"],
      redirectAfterLogin: "dashboard_franchise.html" // 가맹점 전용 대시보드
    }
  },

  // 4. 세션 관리 키 (브라우저 LocalStorage에 저장될 키 이름)
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session",
    CLIENT_NAME: "sinjeon_client_name"
  }
};
