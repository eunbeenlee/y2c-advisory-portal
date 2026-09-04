// assets/js/config.js

const SYSTEM_CONFIG = {
  // 1. 브랜드 및 도메인 정보 설정
  BRAND: {
    NAME: "Sinjeon Canada",
    PORTAL_TITLE: "Sinjeon Canada Franchise Portal",
    DOMAIN: "https://partner.sinjeoncanada.com",
    SUPPORT_EMAIL: "support@sinjeoncanada.com",
    OPERATOR: "Y2C Holdings Inc."
  },

  // 2. API 엔드포인트 (백엔드 구글 Apps Script 통신 주소)
  API: {
    BASE_URL: "https://script.google.com/macros/s/AKfycbw5wAD2o7DKamZ2o_FN4QsNp20O6wjI4qEu77JmRkVp99dTbKRVC_fe5tEOVJqpP_aQ/exec",
    ENDPOINTS: {
      AUTH: "login",
      DASHBOARD: "get_dashboard",
      ITEMS: "get_items",
      INVOICE: "get_invoice",
      RECIPES: "get_recipes",
      GET_MASTER: "get_master_data",       // 마스터 데이터 조회 엔드포인트
      UPDATE_MASTER: "update_master_data"  // 마스터 데이터 수정 엔드포인트
    }
  },

  // 3. 사용자 권한(Role) 및 라우팅 제어 맵핑
  ROLES: {
    MASTER: {
      id: "MASTER",
      accessiblePages: ["*"], // 마스터 관리자는 모든 메뉴 접근 가능
      redirectAfterLogin: "dashboard.html"
    },
    FRANCHISEE: {
      id: "FRANCHISEE",
      accessiblePages: ["dashboard.html", "items.html", "recipes.html"],
      redirectAfterLogin: "dashboard.html"
    }
  },

  // 4. 세션 관리 키 이름 정의
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session",
    CLIENT_NAME: "sinjeon_client_name",
    ROLE: "sinjeon_user_role"
  }
};
