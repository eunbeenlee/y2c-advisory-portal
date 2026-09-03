// 시스템 전체를 통제하는 환경 설정(레지스트리) 객체
const Y2C_REGISTRY = {
  // 1. API 엔드포인트 설정 (백엔드 주소)
  API: {
    // 구글 Apps Script를 배포하고 얻은 웹앱 URL을 여기에 입력
    BASE_URL: "https://script.google.com/macros/s/여기에_키_입력/exec",
    ENDPOINTS: {
      LOGIN: "login",
      GET_SALES: "get_sales_data",
      GET_ITEMS: "get_items_list"
    }
  },

  // 2. 권한(Role)별 접근 가능 메뉴 제어
  ROLES: {
    MASTER: {
      level: 99,
      accessiblePages: ["dashboard.html", "items.html", "admin.html"], // 마스터는 모든 메뉴 접근
      homePage: "dashboard.html"
    },
    FRANCHISE: {
      level: 1,
      accessiblePages: ["dashboard.html", "items.html"], // 가맹점은 본인 매장 메뉴만 접근
      homePage: "dashboard.html"
    }
  },

  // 3. 차트 기본 색상 테마 (신전 떡볶이 & Y2C 홀딩스 톤앤매너)
  UI_THEME: {
    colors: {
      primary: "#E53935", // 신전 레드 포인트
      secondary: "#1E88E5", // Y2C 블루
      background: "#F5F5F6"
    }
  }
};
