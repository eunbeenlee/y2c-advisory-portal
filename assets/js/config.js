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
    // 💡 백엔드 '새 버전' 배포 후 유지되는 URL
    BASE_URL: "https://script.google.com/macros/s/AKfycbw5wAD2o7DKamZ2o_FN4QsNp20O6wjI4qEu77JmRkVp99dTbKRVC_fe5tEOVJqpP_aQ/exec",
    ENDPOINTS: {
      AUTH: "login", DASHBOARD: "get_dashboard", ITEMS: "get_items", INVOICE: "get_invoice",
      RECIPES: "get_recipes", GET_MASTER: "get_master_data", UPDATE_MASTER: "update_master_data"
    }
  },
  ROLES: {
    MASTER: { id: "MASTER", accessiblePages: ["*"], redirectAfterLogin: "dashboard.html" },
    FRANCHISEE: { id: "FRANCHISEE", accessiblePages: ["dashboard.html", "items.html", "recipes.html"], redirectAfterLogin: "dashboard.html" }
  },
  STORAGE_KEYS: {
    USER_TOKEN: "sinjeon_canada_session", CLIENT_NAME: "sinjeon_client_name", ROLE: "sinjeon_user_role"
  }
};
