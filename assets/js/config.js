// assets/js/config.js (API 영역 업데이트)
const SYSTEM_CONFIG = {
  // ... 기존 코드 유지 ...
  API: {
    BASE_URL: "https://script.google.com/macros/s/여기에_GAS_배포_키를_입력하세요/exec",
    ENDPOINTS: {
      AUTH: "login",
      DASHBOARD: "get_dashboard", // 신규 추가됨
      ITEMS: "get_items"         // 신규 추가됨
    }
  },
  // ... 기존 코드 유지 ...
