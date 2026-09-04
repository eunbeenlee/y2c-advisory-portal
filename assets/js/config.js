// assets/js/config.js

const SYSTEM_CONFIG = {
  BRAND: {
    NAME: "Sinjeon Canada",
    PORTAL_TITLE: "Sinjeon Canada Franchise Portal",
    DOMAIN: "https://partner.sinjeoncanada.com",
    SUPPORT_EMAIL: "support@sinjeoncanada.com",
    OPERATOR: "Y2C Holdings Inc."
  },
  API: {
    // 🌟 알려주신 최신 웹 앱 URL로 완벽 교체 완료
    BASE_URL: "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec",
    ENDPOINTS: {
      AUTH: "login", 
      DASHBOARD: "get_dashboard", 
      ITEMS: "get_items", 
      ORDER: "save_order", 
      INVOICE: "get_invoice", 
      RECIPES: "get_recipes", 
      GET_MASTER: "get_master_data", 
      UPDATE_MASTER: "update_master_data"
    }
  },
  ROLES: {
    MASTER: { id: "MASTER", accessiblePages: ["*"], redirectAfterLogin: "dashboard.html" },
    FRANCHISEE: { id: "FRANCHISEE", accessiblePages: ["dashboard.html", "items.html", "recipes.html"], redirectAfterLogin: "dashboard.html" }
  },
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session_token", // 보안 토큰
    CLIENT_NAME: "sinjeon_client_name", 
    ROLE: "sinjeon_user_role"
  }
};
