// assets/js/config.js

const SYSTEM_CONFIG = {
  // 1. 브랜드 및 시스템 기본 설정
  BRAND: {
    NAME: "Sinjeon Canada",
    PORTAL_TITLE: "Sinjeon Canada Franchise Portal",
    DOMAIN: "https://partner.sinjeoncanada.com",
    SUPPORT_EMAIL: "support@sinjeoncanada.com",
    OPERATOR: "Y2C Holdings Inc."
  },

  // 2. API 엔드포인트 설정 (구글 Apps Script Web App URL)
  API: {
    // 💡 주의: 이 URL은 반드시 구글 앱스 스크립트에서 '새 버전'으로 배포된 최신 URL이어야 합니다.
    BASE_URL: "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec",
    
    // 백엔드의 action 파라미터와 정확히 1:1로 매칭되는 라우팅 키
    ENDPOINTS: {
      AUTH: "login",
      DASHBOARD: "get_dashboard",
      ITEMS: "get_items",
      INVOICE: "get_invoice",              // 🌟 인보이스 데이터 요청 엔드포인트 (오류 방지 검증 완료)
      RECIPES: "get_recipes",              // 조리 레시피 조회 엔드포인트
      GET_MASTER: "get_master_data",       // 마스터 DB 조회 엔드포인트
      UPDATE_MASTER: "update_master_data"  // 마스터 DB 수정 엔드포인트
    }
  },

  // 3. 사용자 권한(Role) 및 라우팅 접근 제어
  ROLES: {
    MASTER: {
      id: "MASTER",
      accessiblePages: ["*"], // 마스터는 admin.html, invoice.html 등 모든 기능 접근 가능
      redirectAfterLogin: "dashboard.html"
    },
    FRANCHISEE: {
      id: "FRANCHISEE",
      accessiblePages: ["dashboard.html", "items.html", "recipes.html"], // 가맹점주는 기본 기능만 접근
      redirectAfterLogin: "dashboard.html"
    }
  },

  // 4. 로컬 스토리지(보안 세션) 키 정의
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session",
    CLIENT_NAME: "sinjeon_client_name",
    ROLE: "sinjeon_user_role"
  }
};
