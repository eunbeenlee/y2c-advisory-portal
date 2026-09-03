// assets/js/config.js
const SYSTEM_CONFIG = {
  BRAND: {
    NAME: "Sinjeon Canada",
    PORTAL_TITLE: "Sinjeon Canada Franchise Portal",
    DOMAIN: "https://partner.sinjeoncanada.com",
  },
  API: {
    // 발급해주신 실제 GAS 백엔드 URL 적용
    BASE_URL: "https://script.google.com/macros/s/AKfycbynnWXqi3qAZf6jHdd-vcnfCe-Xpm7bP4xHr2-1f5ElkZeCCsvnQ6V8vVxeF7elj4uVPg/exec",
    ENDPOINTS: {
      AUTH: "login"
    }
  },
  ROLES: {
    MASTER: { id: "MASTER", redirectAfterLogin: "dashboard.html" },
    FRANCHISEE: { id: "FRANCHISEE", redirectAfterLogin: "dashboard.html" }
  },
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session",
    CLIENT_NAME: "sinjeon_client_name",
    ROLE: "sinjeon_user_role"
  }
};
