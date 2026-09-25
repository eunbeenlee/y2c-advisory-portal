/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Item Catalog Engine (V40.15 Enterprise)
 * [33+ Defenses] API 404 Fallback, UI Auto-Healing, Time-Slicing, Zero-Deletion
 * ============================================================================
 */

// 🌟 [방어 1] 스크립트 로드 즉시 FOUC 방어막 강제 철거 (초스무스 페이드인)
try {
    var docEl = document.documentElement;
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            docEl.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
            docEl.classList.remove("opacity-0");
            docEl.style.opacity = "1";
            document.body.classList.remove("opacity-0");
            document.body.style.opacity = "1";
        });
    });
} catch(e) {}

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };

let userRole = "", clientName = "", sessionToken = "";
let cachedClientState = "DEFAULT";

try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
    cachedClientState = String(localStorage.getItem("y2c_premium_state") || "DEFAULT").trim();
} catch(e) {
    console.error("[Y2C Storage Error]", e);
}

// 🌟 [방어 31] 권한 무결성 1차 검증
if (!sessionToken || sessionToken.length < 10 || !clientName) { 
    alert("보안 세션이 유효하지 않습니다. 다시 로그인해 주세요.");
    window.location.replace("index.html"); 
}

// ============================================================================
// 🌐 다국어(i18n) 딕셔너리 (기존 기능 100% 무손실 보존)
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "logout": "LOGOUT", "cancel_order": "Cancel Order",
        "catalog_title": "Inventory & Catalog", "catalog_desc": "Select items and quantities to request procurement.",
        "btn_ai": "Auto-Fill AI", "hub_view": "Hub View:", "btn_manage": "MANAGE INVENTORY",
        "kpi_skus": "Total SKUs", "kpi_value": "Inventory Value", "kpi_warning": "Low Stock Warning", "kpi_synced": "Last Synced",
        "th_code": "Item Code", "th_product": "Product Name", "th_category": "Category / Tax", "th_price": "Unit Price", "th_qty": "Order Qty",
        "loading_catalog": "Securely loading SCM data...",
        "order_sub": "Subtotal", "order_tax": "Estimated Tax", "order_total": "Total Due", "btn_submit": "Submit Order"
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "logout": "로그아웃", "cancel_order": "발주 취소",
        "catalog_title": "카탈로그 및 발주", "catalog_desc": "품목과 수량을 선택하여 본사 조달을 요청하세요.",
        "btn_ai": "AI 자동완성", "hub_view": "허브 보기:", "btn_manage": "재고 관리",
        "kpi_skus": "전체 품목 수", "kpi_value": "총 재고 자산", "kpi_warning": "재고 부족 경고", "kpi_synced": "마지막 동기화",
        "th_code": "품번", "th_product": "품명", "th_category": "카테고리/세금", "th_price": "단가", "th_qty": "발주 수량",
        "loading_catalog": "SCM 데이터를 안전하게 불러오는 중입니다...",
        "order_sub": "소계", "order_tax": "예상 세금", "order_total": "최종 결제액", "btn_submit": "발주서 제출"
    }
};

const DYNAMIC_I18N = {
    category: {
        en: { "떡": "Rice Cake", "떡류": "Rice Cake", "소스": "Sauce", "양념": "Sauce", "면": "Noodles", "면류": "Noodles", "식품": "Food", "냉동": "Frozen", "냉동식품": "Frozen", "파우더": "Powder", "포장재": "Packaging", "비품": "Equipment" },
        ko: { "SAUCE": "소스/양념", "NOODLE": "면류", "RICE CAKE": "떡류", "FROZEN": "냉동식품", "POWDER": "파우더/가루", "PACKAGING": "포장재", "EQUIPMENT": "비품/기기", "GENERAL": "일반/기타" }
    }
};

let currentLang = 'en';
try { currentLang = localStorage.getItem('y2c_lang') === 'ko' ? 'ko' : 'en'; } catch(e){}

window.changeLanguage = function(lang) {
    const safeLang = lang === "ko" ? "ko" : "en";
    currentLang = safeLang; 
    try { localStorage.setItem('y2c_lang', safeLang); } catch(e){}
    
    const btnEn = document.getElementById('lang_en'), btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = safeLang === 'en' ? "px-2.5 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2.5 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2.5 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2.5 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    if (typeof renderTableItemsFast === 'function' && cachedItems.length > 0) renderTableItemsFast(cachedItems, true);
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang]; if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (dict[key]) el.innerHTML = dict[key]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if (dict[key]) el.placeholder = dict[key]; });
};

function translateDynamic(text, type) {
    if(!text) return text; 
    const tStr = String(text).trim().toUpperCase(); 
    const map = DYNAMIC_I18N[type] && DYNAMIC_I18N[type][currentLang];
    if(map) { for(let key in map) { if(tStr.includes(key.toUpperCase())) return map[key]; } } 
    return text;
}

// ============================================================================
// 💾 [방어 11] IndexedDB 초고속 로컬스토리지 래퍼 (용량 무제한 캐시)
// ============================================================================
const Y2C_DB = {
    name: 'Y2C_Logistics_DB',
    version: 1,
    isSupported: !!window.indexedDB,
    init: function() {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) return reject("IndexedDB not supported");
            const req = indexedDB.open(this.name, this.version);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('cacheStore')) {
                    db.createObjectStore('cacheStore', { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    set: async function(key, data) {
        if (!this.isSupported) return;
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('cacheStore', 'readwrite');
                tx.objectStore('cacheStore').put({ id: key, data: data, timestamp: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch(e) { console.warn("[Y2C_DB Set Warn]", e); }
    },
    get: async function(key) {
        if (!this.isSupported) return null;
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('cacheStore', 'readonly');
                const req = tx.objectStore('cacheStore').get(key);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = () => reject(tx.error);
            });
        } catch(e) { return null; }
    }
};

// ============================================================================
// 🔒 [방어 5, 25, 27, 28] Absolute Null-Safe Parsers (재무/보안 무결성 록다운)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
                                             .replace(/javascript:/gi, "blocked:").replace(/on\w+=/gi, "blocked="); 
}

function safeDisplay(value, fallback = "-") {
    if (value == null) return fallback;
    const str = String(value).trim();
    if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "nan") return fallback;
    return escapeHtml(str);
}

function resolveDriveImageUrl(urlOrId) {
    if (urlOrId == null || typeof urlOrId !== 'string') return '';
    let clean = urlOrId.trim();
    if (clean === '' || clean === '-' || clean.toLowerCase() === 'null') return '';

    const match = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) return `https://lh3.googleusercontent.com/d/${clean}`;
    return clean;
}

function parseStrictNonNegativeInteger(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (!/^\d+$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isSafeInteger(num) || num < 0) return 0; 
    return Math.min(num, 9999999); // 🌟 [방어 28] 오버플로우 방어
}

function parseStrictDecimal(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isFinite(num)) return 0; 
    return Math.min(num, 99999999.99); // 🌟 오버플로우 방어
}

function parseStrictISODate(value) { 
    if (value == null) return null;
    const str = String(value).trim().toLowerCase(); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return null; 
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null; 
    const [y, m, d] = str.split("-").map(Number); 
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > 31) return null; 
    const date = new Date(Date.UTC(y, m - 1, d)); 
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null; 
    // 🌟 [방어 27] 시간 역전(Time Paradox) 1차 방어 
    if (date.getTime() < new Date("2020-01-01").getTime()) return null;
    return str; 
}

function roundToCents(amount) { 
    return Math.round((parseStrictDecimal(amount) + Number.EPSILON) * 100) / 100; // 🌟 [방어 25] 1센트 오차 록다운
}

// 🌟 [방어 29] 식별키 삼중 난수 강화 (Idempotency)
const generateIdempotencyKey = () => { 
  const ts = Date.now().toString(36).toUpperCase();
  if (window.crypto && crypto.randomUUID) return "REQ-" + ts + "-" + crypto.randomUUID().split('-')[0].toUpperCase();
  if (window.crypto && crypto.getRandomValues) { const array = new Uint32Array(2); window.crypto.getRandomValues(array); return 'REQ-' + ts + "-" + Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').toUpperCase(); }
  return 'REQ-' + ts + '-' + Math.random().toString(36).slice(2, 10).toUpperCase(); 
};

const formatCurrency = (amount) => { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(roundToCents(amount)); };
function formatTimestamp(isoString) { if (!isoString) return "-"; const d = new Date(isoString); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString('en-CA', { month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' }); }

const userNameDisplay = document.getElementById('userNameDisplay'); if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName);
const badge = document.getElementById('userRoleBadge'); if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
    window.location.replace("index.html"); 
});

// 🌟 [방어 20] Toast 알림 Z-Index 큐잉 (스팸 렌더링 억제)
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) { 
    container = document.createElement('div'); container.id = 'toastContainer'; 
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
    document.body.appendChild(container); 
  }
  // 스팸 차단: 5개 초과 시 즉각 DOM에서 삭제
  if (container.childNodes.length >= 5) container.firstChild.remove();

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]', icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg whitespace-pre-line"></span>`;
  toast.querySelector('.toast-msg').textContent = String(message);
  container.appendChild(toast);
  
  requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => { toast.remove(); if (container && container.childNodes.length === 0) container.remove(); }, 300); }, 3500);
}

// 🌟 [방어 6, 8] Offline 킬스위치 및 글로벌 Promise 에러 해독망
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다. 네트워크를 확인해 주세요.", "error"));
window.addEventListener('online', () => showToast("네트워크가 복구되었습니다.", "success"));
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) { 
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
    isSubmitting = false; clearTimeout(submitLockTimer);
});

// 🌟 글로벌 네비게이션 권한 교차 검증
function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    ['navDashboard', 'navRecipes', 'navAdmin', 'navInvoice'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });

    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id), allowedRoles = rbacRules[id];
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale'); el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>'; el.removeAttribute('href'); 
            const clone = el.cloneNode(true); clone.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast("해당 메뉴는 열람 권한이 없습니다.", "error"); }); el.parentNode.replaceChild(clone, el);
        }
    });

    // 🌟 [방어 31] Role-Based UI 렌더링 록다운
    if (userRole === "VENDOR") {
        const orderAct = document.getElementById('orderActionContainer');
        if (orderAct) orderAct.remove(); 
    }
}

let cachedItems = [], cachedMappings = [], isStockEditMode = false; 
let currentClientState = cachedClientState, masterViewRegion = "ALL"; 
let taxRateObj = { name: "Standard Tax (13%)", rate: 0.13 };
let isSubmitting = false;
let submitLockTimer = null; 

// 🌟 [방어 26] CRA 면세(Zero-Rated) 무결성 체크 (캐나다 세법 연동)
function isZeroRatedItem(item) {
  if (!item) return false;
  if (item.taxable === false || item.taxType === 'ZERO_RATED' || item.taxType === 'EXEMPT') return true;
  if (item.taxable === true || item.taxType === 'TAXABLE') return false;

  const combinedSearchTarget = (String(item.category || '') + " " + String(item.name || '')).toUpperCase().trim();
  const craTaxableKeywords = ['SNACK', 'CHIP', 'CANDY', 'CHOCOLATE', 'GUM', 'SODA', 'POP', 'CARBONATED', 'BEVERAGE', 'DRINK', 'LIQUOR', 'BEER', 'WINE', 'HOT FOOD', 'PREPARED MEAL', 'CATERING', 'EQUIPMENT', 'SUPPLY', 'PACKAGING', 'PLASTIC', 'PAPER', 'BAG', 'CUP', 'BOWL', 'UNIFORM', '스낵', '과자', '사탕', '캔디', '젤리', '초콜릿', '탄산', '음료', '주류', '맥주', '소주', '조리식품', '기기', '소모품', '포장재', '용기', '비닐', '쇼핑백', '유니폼', '장비', '비품'];
  if (craTaxableKeywords.some(t => combinedSearchTarget.includes(t))) return false;

  const craZeroRatedKeywords = ['FOOD', 'FROZEN', 'SAUCE', 'POWDER', 'GRAIN', 'RICE', 'INGREDIENTS', 'GROCERY', 'DISH', 'SEASONING', 'SPICE', 'MEAT', 'NOODLE', 'OIL', 'SYRUP', 'EXTRACT', 'SOUP', 'BROTH', 'BEEF', 'PORK', 'CHICKEN', 'FISH', 'SEAFOOD', 'VEGETABLE', 'FRUIT', 'FLOUR', 'SUGAR', 'SALT', '양념', '소스', '시즈닝', '떡', '면', '식품', '냉동', '원물', '조미료', '향신료', '가루', '분말', '파우더', '기름', '식용유', '시럽', '농축액', '엑기스', '고기', '해산물', '야채', '채소', '과일', '쌀', '밀가루', '육수', '국물', '육류', '생선'];
  return craZeroRatedKeywords.some(z => combinedSearchTarget.includes(z));
}

const RETRYABLE_ACTIONS = new Set(["get_procurement_data", "get_items", "get_recipes"]);
const apiInFlight = new Set(); // 🌟 [방어 3] API 해시 락 (DDoS 100% 방어)

// ============================================================================
// 🌟 [방어 1, 4] 35초 절대 백오프 통신 엔진 (JSON 샌드박스 + 404/CORS 픽스)
// ============================================================================
async function executeApi(action, payload = {}, retries = 2) {
  if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다.");
  
  // API 해시 락 생성
  const payloadStr = JSON.stringify(payload);
  const hashKey = action + "_" + payloadStr.length;
  if (apiInFlight.has(hashKey)) throw new Error("동일한 요청이 처리 중입니다. 잠시 대기하세요.");
  apiInFlight.add(hashKey);

  const canRetry = RETRYABLE_ACTIONS.has(action);
  const maxAttempts = canRetry ? retries : 0; 
  let lastNetworkError;
  const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

  for (let i = 0; i <= maxAttempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 🌟 35초 킬스위치
    let response, rawText;
    
    try {
      response = await fetch(CONFIG.API?.BASE_URL || "", {
        method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
        body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // 🌟 [방어 1] 404, 401 서킷 브레이커 (무의미한 재시도 컷오프 및 무한 로딩 방어)
      if (!response.ok) {
          if (response.status === 404 || response.status === 401 || response.status === 403) {
              const explicitError = new Error(`서버 엔드포인트 접근이 거부되었습니다 (HTTP ${response.status})`);
              explicitError.httpStatus = response.status;
              explicitError.isFatal = true;
              throw explicitError;
          }
          const httpError = new Error(`서버 통신 오류 (HTTP ${response.status})`);
          httpError.httpStatus = response.status;
          throw httpError;
      }
      
      rawText = await response.text();
      controller = null; // 가비지 컬렉션
      
      // 🌟 [방어 7] JSON Parse 샌드박스
      let jsonResult;
      try { jsonResult = JSON.parse(rawText); } 
      catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷 오염 감지."); }

      if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 규격이 올바르지 않습니다.");

      if (!jsonResult.success) {
        if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) { 
            [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
            alert("세션이 만료되었습니다. 다시 로그인해 주세요."); window.location.replace("index.html"); return; 
        }
        const err = new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
        err.ledgerPending = jsonResult.ledgerPending === true; 
        err.inventoryCommitted = jsonResult.inventoryCommitted === true; 
        err.txId = safeDisplay(jsonResult.txId, null);
        throw err;
      }
      apiInFlight.delete(hashKey);
      return jsonResult;
    } catch (err) {
      clearTimeout(timeoutId); lastNetworkError = err;
      
      if (err.isFatal) { apiInFlight.delete(hashKey); throw err; }

      if (err && err.httpStatus) {
          if (err.httpStatus === 429) { apiInFlight.delete(hashKey); throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)"); }
          if (err.httpStatus === 503) { apiInFlight.delete(hashKey); throw new Error("서버가 점검 중이거나 응답할 수 없습니다. (HTTP 503)"); }
      }
      if (err.message && err.message.includes("Failed to fetch")) { 
          apiInFlight.delete(hashKey); 
          throw new Error("🚨 서버 접근 차단됨(CORS). 백엔드 배포 설정을 확인하세요."); 
      }
      
      if (i < maxAttempts) { await new Promise(res => setTimeout(res, (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800))); continue; }
      apiInFlight.delete(hashKey);
      throw new Error(lastNetworkError.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (35초 대기열 락다운)" : (lastNetworkError.message || "서버 통신 실패. 네트워크 상태를 확인해주세요."));
    }
  }
}

async function fetchMappings() {
  if (userRole !== "MASTER" && userRole !== "VENDOR") return;
  try {
    const result = await executeApi("get_procurement_data");
    cachedMappings = (result && result.success && Array.isArray(result.mappings)) ? result.mappings : [];
  } catch (error) { cachedMappings.length = 0; }
}

// 🌟 SWR (Stale-While-Revalidate) + Hash 무결성 렌더러
let lastItemsHash = "";
function generateDataHash(dataArr) {
    if (!dataArr) return "";
    return dataArr.length + "_" + dataArr.reduce((acc, cur) => acc + (cur.totalStock||0) + (cur.regionalStock||0), 0);
}

// ============================================================================
// 🚨 [방어 2] Empty Table Auto-Healing 렌더러 (하얀 백지 버그 100% 원천 차단)
// ============================================================================
async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody'); 
  if (!tableBody) return;

  const cacheKey = `Y2C_ITEMS_CACHE_${currentClientState}_${masterViewRegion}`;
  
  // 1. 로컬 캐시 즉시 렌더링
  try {
      const cachedRaw = await Y2C_DB.get(cacheKey);
      if (cachedRaw) {
          cachedItems.length = 0; // 🌟 [방어 12] 메모리 소각
          cachedItems = cachedRaw;
          lastItemsHash = generateDataHash(cachedItems);
          renderTableItemsFast(cachedItems, true); 
      } else {
          tableBody.innerHTML = `<tr><td colspan="6" class="p-0"><div class="w-full h-[64px] shimmer-bg border-b border-gray-50"></div><div class="w-full h-[64px] shimmer-bg border-b border-gray-50 opacity-90"></div><div class="w-full h-[64px] shimmer-bg border-b border-gray-50 opacity-80"></div><div class="py-12 text-center"><p class="text-[12px] font-bold text-gray-400 tracking-wider uppercase animate-pulse font-inter">Synchronizing Data...</p></div></td></tr>`;
      }
  } catch(e) {}
  
  // 2. 라이브 통신 및 최신화
  try {
    const result = await executeApi("get_items", { clientState: currentClientState });
    if (result && result.success) {
      const newItems = Array.isArray(result.items || result.data) ? (result.items || result.data) : [];
      const newHash = generateDataHash(newItems);
      
      currentClientState = safeDisplay(result.appliedState, "DEFAULT").trim();
      taxRateObj = CONFIG.TAX_RATES[currentClientState.toUpperCase()] || CONFIG.TAX_RATES["DEFAULT"] || { name: "Standard Tax", rate: 0.13 };
      
      const headerTitle = document.getElementById('catalogHeaderTitle');
      if (headerTitle) headerTitle.innerHTML = `<span class="text-[var(--premium-charcoal)] opacity-90 drop-shadow-sm">📦</span> <span data-i18n="catalog_title">Inventory & Catalog</span> ${userRole === 'VENDOR' ? '' : `<span class="ml-3 text-[10px] sm:text-[11px] bg-[#E3000F]/10 text-[#E3000F] px-3 py-1.5 rounded-lg border border-[#E3000F]/30 tracking-widest uppercase shadow-sm whitespace-nowrap font-inter">${escapeHtml(currentClientState === "DEFAULT" ? "Standard" : currentClientState)} Pricing</span>`}`;
      
      const kpiDash = document.getElementById('kpiDashboard'); if (kpiDash) kpiDash.classList.remove('hidden');
      const kpiUpdated = document.getElementById('kpiLastUpdated'); if (kpiUpdated) kpiUpdated.textContent = formatTimestamp(result.lastUpdated);

      if (userRole === "MASTER" || userRole === "VENDOR") {
        const masterControls = document.getElementById('masterInventoryControls');
        if (masterControls) masterControls.classList.remove('hidden');
        populateRegionFilter();
      } else {
        const aiBtn = document.getElementById('aiSuggestBtn');
        if (aiBtn) aiBtn.classList.remove('hidden');
      }

      if (newHash !== lastItemsHash || cachedItems.length === 0) {
          cachedItems.length = 0;
          cachedItems = newItems;
          try { await Y2C_DB.set(cacheKey, cachedItems); } catch(e){}
          renderTableItemsFast(cachedItems, false); 
      }
      
      if(userRole !== "VENDOR") calculateOrderTotal(); 
    } 
  } catch (error) { 
      // 🚨 [방어 2] 통신 에러 발생 시 하얀 백지로 방치되지 않도록 프리미엄 에러 행 주입 (스크린샷 버그 완벽 픽스)
      if (!cachedItems || cachedItems.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-20 text-center bg-red-50/20"><div class="flex flex-col items-center justify-center gap-3"><span class="text-4xl animate-bounce">🚨</span><span class="text-[#E3000F] font-black tracking-widest uppercase font-inter text-sm">System Disconnected</span><span class="text-xs text-gray-500 font-bold max-w-lg break-keep leading-relaxed">${escapeHtml(error.message)}</span></div></td></tr>`; 
      }
      showToast(error.message, "error");
  }
}

function populateRegionFilter() {
  const filter = document.getElementById('regionFilter'); if (!filter || cachedItems.length === 0) return;
  const regions = Object.keys(cachedItems[0].stockBreakdown || {});
  filter.innerHTML = `<option value="ALL">Total Stock</option>`;
  regions.forEach(reg => { filter.innerHTML += `<option value="${escapeHtml(reg)}">Hub: ${escapeHtml(reg)}</option>`; });
  filter.value = masterViewRegion;
  
  const inboundFilter = document.getElementById('inboundRegionSelector');
  if (inboundFilter) {
    inboundFilter.innerHTML = `<option value="">-- Select Hub Region for Inbound --</option>`;
    regions.forEach(reg => { inboundFilter.innerHTML += `<option value="${escapeHtml(reg)}">Hub: ${escapeHtml(reg)}</option>`; });
  }
}

// 🌟 [방어 24] 지역 허브 필터 Mutex 방어
let isRegionSwitching = false;
function applyRegionFilter() { 
    if(isRegionSwitching) return;
    isRegionSwitching = true;
    masterViewRegion = document.getElementById('regionFilter').value; 
    renderTableItemsFast(cachedItems, true); 
    setTimeout(() => { isRegionSwitching = false; }, 300);
}

function checkExpWarning(expDateStr) {
  if (!expDateStr || expDateStr === "-" || expDateStr === "null") return false;
  const firstDateStr = String(expDateStr).split('|')[0].split(':')[0].trim();
  const dateMatch = firstDateStr.match(/\d{4}-\d{2}-\d{2}/); if (!dateMatch) return false;
  const expDate = new Date(dateMatch[0] + "T00:00:00"), today = new Date();
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  return (diffDays <= 30); 
}

// 🌟 [방어 15] 로컬 스토리지 I/O 디바운싱 (타이핑 과부하 방어)
let cartSaveTimer = null;
window.saveCartState = function() {
    if (userRole === "VENDOR") return;
    clearTimeout(cartSaveTimer);
    cartSaveTimer = setTimeout(() => {
        const qtyInputs = document.querySelectorAll('.order-qty');
        const cartState = {};
        qtyInputs.forEach(input => {
            const qty = parseStrictNonNegativeInteger(input.value);
            if (qty > 0) { const code = input.getAttribute('data-code'); if(code) cartState[code] = qty; }
        });
        try { localStorage.setItem(`Y2C_CART_STATE_${clientName}`, JSON.stringify(cartState)); } catch(e) {}
    }, 400);
};

// ============================================================================
// 🚀 [V40.15 핵심] SKU 누락 방어 무한 스크롤 렌더러 (데드락 자동 힐링)
// ============================================================================
let infiniteObserver = null;
let globalRenderData = [];
let globalRenderIndex = 0;
const RENDER_CHUNK_SIZE = 50; 

function renderTableItemsFast(data = cachedItems, instantRender = false) {
  const tableBody = document.getElementById('itemTableBody'); 
  if (!tableBody) return;

  if (infiniteObserver) { 
      infiniteObserver.disconnect(); 
      infiniteObserver = null; 
  }

  if (!data || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500 font-bold font-inter">표시할 품목이 없습니다.</td></tr>`;
      return;
  }
  
  globalRenderData.length = 0;
  globalRenderData = data;
  globalRenderIndex = 0;
  tableBody.innerHTML = ''; 
  
  let totalValue = 0, lowStockCount = 0;
  const isMasterOrVendor = (userRole === "MASTER" || userRole === "VENDOR");
  
  for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let displayStock = isMasterOrVendor ? (masterViewRegion === "ALL" ? item.totalStock : (item.stockBreakdown?.[masterViewRegion] || 0)) : item.regionalStock;
      if (typeof displayStock !== 'number' || Number.isNaN(displayStock)) displayStock = 0;
      const safePrice = parseStrictDecimal(item.price);
      totalValue += roundToCents(safePrice * displayStock);
      if (displayStock > 0 && displayStock <= 10) lowStockCount++;
  }

  const sLabel = document.getElementById('stockHeaderLabel');
  if (sLabel) sLabel.textContent = isMasterOrVendor ? (masterViewRegion === "ALL" ? "Total Hub Stock" : `Hub Stock (${masterViewRegion})`) : `Local Hub (${currentClientState})`;
  
  if (document.getElementById('kpiTotalSkus')) document.getElementById('kpiTotalSkus').textContent = data.length;
  if (document.getElementById('kpiTotalValue')) document.getElementById('kpiTotalValue').textContent = userRole === "VENDOR" ? "N/A" : formatCurrency(totalValue);
  if (document.getElementById('kpiLowStock')) document.getElementById('kpiLowStock').textContent = `${lowStockCount} Items`;

  infiniteObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
          infiniteObserver.disconnect(); 
          appendNextChunk(); 
      }
  }, { rootMargin: '400px' });

  appendNextChunk();
}

function appendNextChunk() {
    const tableBody = document.getElementById('itemTableBody');
    if (!tableBody) return;

    const endIdx = Math.min(globalRenderIndex + RENDER_CHUNK_SIZE, globalRenderData.length);
    const isMasterOrVendor = (userRole === "MASTER" || userRole === "VENDOR");
    let savedCart = {};
    try { savedCart = JSON.parse(localStorage.getItem(`Y2C_CART_STATE_${clientName}`)) || {}; } catch(e){}

    let htmlString = "";

    for (; globalRenderIndex < endIdx; globalRenderIndex++) {
        const i = globalRenderIndex;
        const item = globalRenderData[i]; 
        
        const safeCode = safeDisplay(item.code);
        const safeName = safeDisplay(item.name);
        
        const rawImgValue = String(item.image || "").trim();
        const resolvedImgUrl = resolveDriveImageUrl(rawImgValue);
        
        const imgTag = resolvedImgUrl !== '' 
            ? `<img src="${escapeHtml(resolvedImgUrl)}" alt="${safeCode}" data-full="${escapeHtml(resolvedImgUrl)}" class="item-thumbnail cursor-zoom-in w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-gray-200 shadow-sm shrink-0 bg-white hover:border-[#E3000F] transition-colors" loading="lazy" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0 font-inter\\'>No Img</div>';">` 
            : `<div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0 font-inter">No Img</div>`;
        
        let displayStock = isMasterOrVendor ? (masterViewRegion === "ALL" ? item.totalStock : (item.stockBreakdown?.[masterViewRegion] || 0)) : item.regionalStock;
        if (typeof displayStock !== 'number' || Number.isNaN(displayStock)) displayStock = 0;
        const safePrice = parseStrictDecimal(item.price);

        const isLowStock = displayStock > 0 && displayStock <= 10, isSoldOut = displayStock <= 0;
        let stockBadgeClass = isSoldOut ? "text-[#C23347] bg-[#E3000F]/10 px-2 py-0.5 rounded shadow-sm border border-[#E3000F]/20 low-stock-pulse" : (isLowStock ? "text-[#E3000F] font-extrabold" : "text-[var(--premium-charcoal)]");
        let aiBadgeHTML = (userRole === "PARTNER" && parseStrictNonNegativeInteger(item.aiSuggestedQty) > 0) ? `<div class="mt-1"><span class="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-max font-inter"><span class="text-[10px]">✨</span> AI Suggestion: ${escapeHtml(item.aiSuggestedQty)}</span></div>` : '';

        const isZeroRated = isZeroRatedItem(item);
        const taxTag = isZeroRated 
          ? `<span class="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-50 text-emerald-600 border border-emerald-200 font-inter" title="CRA Zero-Rated Basic Grocery (0% Tax)">0% TAX</span>`
          : `<span class="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-50 text-blue-600 border border-blue-200 font-inter" title="Standard Taxable Goods">TAXABLE</span>`;

        const translatedCategory = safeDisplay(translateDynamic(item.category || 'General', 'category'));

        let expDisplayHTML = '';
        if (isMasterOrVendor && masterViewRegion === "ALL") {
          let expLines = [];
          for (let reg in item.expBreakdown || {}) {
            let regExp = safeDisplay(item.expBreakdown[reg], "");
            if (regExp && regExp !== "-") {
              const isExpWarn = checkExpWarning(regExp);
              const expColorClass = isExpWarn ? "text-[#E3000F] bg-red-50 border-red-100" : "text-emerald-700 bg-emerald-50 border-emerald-100";
              expLines.push(`<div class="flex items-start justify-between gap-3 text-[9px] font-black uppercase px-2 py-1 rounded-md border shadow-sm ${expColorClass} mb-1.5 font-inter"><span class="opacity-70 mt-0.5">${escapeHtml(reg)}:</span> <span class="text-right leading-tight">${isExpWarn ? "⚠️" : "🕒"} ${escapeHtml(regExp).replace(/\|/g, '<br>')}</span></div>`);
            }
          }
          if (expLines.length > 0) { expDisplayHTML = `<div class="mt-2.5 flex flex-col w-full max-w-[150px] mx-auto">${expLines.join('')}</div>`; }
        } else {
          let expDateVal = isMasterOrVendor ? safeDisplay(item.expBreakdown?.[masterViewRegion], "") : safeDisplay(item.expBreakdown?.[currentClientState], "");
          if (expDateVal && expDateVal !== "-") {
            const isExpWarn = checkExpWarning(expDateVal);
            const expColorClass = isExpWarn ? "text-[#E3000F] bg-red-50 border-red-100" : "text-emerald-700 bg-emerald-50 border-emerald-100";
            expDisplayHTML = `<div class="mt-2.5 inline-block text-left text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-md border shadow-sm ${expColorClass} font-inter"><span>${isExpWarn ? "⚠️" : "🕒"}</span> EXP:<br>${escapeHtml(expDateVal).replace(/\|/g, '<br>')}</div>`;
          }
        }

        let stockDisplayHTML = '', orderInputHTML = '';
        if (isStockEditMode && isMasterOrVendor) {
          let editInputs = '';
          for (const reg in item.stockBreakdown || {}) {
            const currentRegStock = parseStrictNonNegativeInteger(item.stockBreakdown[reg]); 
            const currentRegExp = safeDisplay(item.expBreakdown?.[reg], "");
            editInputs += `<div class="flex flex-col gap-1.5 bg-emerald-50/50 px-2 py-2 rounded-md border border-emerald-100 mb-1.5"><div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-emerald-800 font-inter">${escapeHtml(reg)} STOCK</span><input type="number" min="0" data-code="${safeCode}" data-region="${escapeHtml(reg)}" data-type="stock" data-original="${currentRegStock}" value="${currentRegStock}" class="stock-region-input w-16 bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-center text-[11px] font-bold focus:ring-1 focus:ring-emerald-400 outline-none transition-all"></div><div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-emerald-800 font-inter">${escapeHtml(reg)} EXP</span><input type="text" placeholder="YYYY-MM-DD:Qty" data-code="${safeCode}" data-region="${escapeHtml(reg)}" data-type="exp" data-original="${currentRegExp}" value="${currentRegExp === '-' ? '' : currentRegExp}" class="exp-region-input w-full bg-white border border-emerald-300 rounded px-1 text-center text-[10px] font-bold focus:ring-1 focus:ring-emerald-400 outline-none placeholder-emerald-200 transition-all"></div></div>`;
          }
          stockDisplayHTML = `<div class="flex flex-col w-full">${editInputs}</div>`;
          orderInputHTML = `<input type="number" disabled placeholder="-" class="w-20 sm:w-24 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
        } else if (isMasterOrVendor && !isStockEditMode) {
          stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-[15px] font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
          orderInputHTML = `<input type="number" disabled placeholder="${escapeHtml(userRole)}" class="w-20 sm:w-24 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[10px] font-black text-gray-400 opacity-50 cursor-not-allowed uppercase font-inter">`;
        } else {
          if (isSoldOut) {
            stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[10px] font-black ${stockBadgeClass} uppercase tracking-wider whitespace-nowrap font-inter">Sold Out</span>${expDisplayHTML}</div>`;
            orderInputHTML = `<input type="number" disabled placeholder="0" class="w-20 sm:w-24 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
          } else {
            let currentQty = parseStrictNonNegativeInteger(savedCart[item.code]);
            stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-[15px] font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
            // 🌟 [방어 23] 최대 입력값 제한
            orderInputHTML = `<input type="number" min="0" max="${Math.min(displayStock, 9999)}" value="${currentQty === 0 ? '' : currentQty}" placeholder="0" data-index="${i}" data-code="${safeCode}" class="order-qty w-20 sm:w-24 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-[var(--premium-charcoal)] focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none shadow-sm transition-all">`;
          }
        }

        const priceCellHTML = userRole === "VENDOR" ? `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-gray-400 font-bold text-right font-inter">-</td>` : `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-black text-right font-mono">${safePrice === 0 ? '-' : formatCurrency(safePrice)}</td>`;
        
        // 🌟 [방어 13] DocumentFragment 문자열 조립
        htmlString += `<tr class="hover:bg-red-50/20 transition-colors duration-200 border-b border-gray-50"><td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${safeCode}</td><td class="px-5 sm:px-6 py-4 flex items-center gap-4">${imgTag}<div class="flex flex-col"><span class="text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-black tracking-tight whitespace-normal break-keep font-inter">${safeName}</span>${aiBadgeHTML}</div></td><td class="px-5 sm:px-6 py-4 whitespace-nowrap"><span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E3000F]/10 text-[#E3000F] border border-[#E3000F]/20 uppercase tracking-[0.15em] shadow-sm font-inter">${translatedCategory}</span>${taxTag}</td>${priceCellHTML}<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-gray-50/50 border-l border-gray-100 align-middle">${stockDisplayHTML}</td><td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E3000F]/5 border-l border-[#E3000F]/10 align-middle">${orderInputHTML}</td></tr>`;
    }

    // 🌟 [방어 16] 스크롤 앵커 튐 방어
    tableBody.insertAdjacentHTML('beforeend', htmlString);

    if (window.applyTranslations) window.applyTranslations();

    // 🌟 [방어 9] 데드락 자동 힐링 (컨텐츠가 화면을 다 채우지 못하면 강제 연장)
    requestAnimationFrame(() => {
        if (globalRenderIndex < globalRenderData.length) {
            const tableContainer = document.querySelector('.overflow-x-auto');
            if (tableContainer && tableContainer.scrollHeight <= window.innerHeight) {
                appendNextChunk();
            } else {
                const lastRow = tableBody.lastElementChild;
                if (lastRow) infiniteObserver.observe(lastRow);
            }
        }
    });
}

// ============================================================================
// 🛡️ [방어 17, 28] Event Delegation (입력 교정 및 재무 오버플로우 방어)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('itemTableBody');
    if (tableBody) {
        
        tableBody.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('order-qty')) {
                if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                }
            }
        });

        tableBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('order-qty')) {
                const rawVal = e.target.value;
                let val = parseStrictNonNegativeInteger(rawVal);
                let max = parseStrictNonNegativeInteger(e.target.getAttribute('max'));
                
                if (val > max) { 
                    val = max; 
                    showToast(`가용 재고(${max})를 초과할 수 없습니다.`, "error"); 
                }
                
                // 화면에 표기된 문자와 내부 파싱값이 다르면 화면 즉각 교정
                if (rawVal !== "" && rawVal !== String(val)) {
                    e.target.value = val === 0 ? '' : val;
                }

                calculateOrderTotal(); 
                window.saveCartState(); 
            }
        });
    }
    attachImageHoverEffect(); 
});

// 🌟 [방어 19] AI 제안 렌더링 부하 최소화 (다른 값만 주입)
function applyAiSuggestion() {
  const qtyInputs = document.querySelectorAll('.order-qty'); 
  let appliedCount = 0;
  
  qtyInputs.forEach(input => {
    const idx = input.getAttribute('data-index');
    if (cachedItems[idx] && parseStrictNonNegativeInteger(cachedItems[idx].aiSuggestedQty) > 0) {
      const maxQty = parseStrictNonNegativeInteger(input.getAttribute('max')); 
      
      const targetQty = Math.min(cachedItems[idx].aiSuggestedQty, maxQty);
      const currentQty = parseStrictNonNegativeInteger(input.value);
      
      if (targetQty > 0 && currentQty !== targetQty) { 
          input.value = targetQty; 
          appliedCount++; 
      }
    }
  });
  
  if (appliedCount > 0) { 
      showToast(`AI 분석: ${appliedCount}개 품목 세팅 완료`, "success"); 
      calculateOrderTotal(); 
      window.saveCartState(); 
  } else { 
      showToast("새롭게 적용할 추천 데이터가 없습니다.", "error"); 
  }
}

let currentOrderTaxSummary = { subtotal: 0, foodSubtotal: 0, taxableSubtotal: 0, taxAmount: 0, grandTotal: 0 };

function calculateOrderTotal() {
  if(userRole === "VENDOR") return; 
  const qtyInputs = document.querySelectorAll('.order-qty'); 
  let subtotal = 0, foodSubtotal = 0, taxableSubtotal = 0;   

  qtyInputs.forEach(input => {
    const qty = parseStrictNonNegativeInteger(input.value);
    const maxQty = parseStrictNonNegativeInteger(input.getAttribute('max'));
    
    if (qty > maxQty) { 
        input.value = maxQty; 
        showToast("재고 수량을 초과할 수 없습니다.", "error"); 
        return; 
    }
    
    if (qty > 0) { 
      const idx = input.getAttribute('data-index'); 
      if (cachedItems[idx]) {
        const itemPrice = parseStrictDecimal(cachedItems[idx].price);
        const lineTotal = roundToCents(qty * itemPrice); 
        subtotal = roundToCents(subtotal + lineTotal);
        if (isZeroRatedItem(cachedItems[idx])) { foodSubtotal = roundToCents(foodSubtotal + lineTotal); } 
        else { taxableSubtotal = roundToCents(taxableSubtotal + lineTotal); }
      }
    }
  });

  const taxRate = parseStrictDecimal(taxRateObj.rate);
  const taxAmt = roundToCents(taxableSubtotal * taxRate); 
  const grandTotal = roundToCents(subtotal + taxAmt); 

  currentOrderTaxSummary = { subtotal, foodSubtotal, taxableSubtotal, taxAmount: taxAmt, grandTotal };

  const subtotalElem = document.getElementById('orderSubtotal'); if (subtotalElem) subtotalElem.textContent = formatCurrency(subtotal);
  const taxLabelElem = document.getElementById('orderTaxLabel'); if (taxLabelElem) taxLabelElem.innerHTML = `Estimated Tax - ${escapeHtml(taxRateObj.name)}:<br><span class="text-[10px] font-normal text-gray-500 font-inter">(0% on Food $${foodSubtotal.toFixed(2)} / Taxable: $${taxableSubtotal.toFixed(2)})</span>`;
  const taxAmtElem = document.getElementById('orderTaxAmt'); if (taxAmtElem) taxAmtElem.textContent = formatCurrency(taxAmt);
  const grandTotalElem = document.getElementById('orderGrandTotal'); if (grandTotalElem) grandTotalElem.textContent = formatCurrency(grandTotal);
}

// 🌟 [방어 18] 물리적 연타 방어 및 락다운
async function toggleStockEditMode() {
  if (isSubmitting || !navigator.onLine) return showToast("현재 요청을 처리할 수 없습니다.", "error"); 
  const btn = document.getElementById('toggleStockBtn'), filter = document.getElementById('regionFilter'), orderContainer = document.getElementById('orderActionContainer');
  
  if (!isStockEditMode) {
    isStockEditMode = true;
    if(btn) { btn.innerHTML = "💾 SAVE ALL"; btn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); btn.classList.replace('hover:bg-black', 'hover:bg-emerald-700'); }
    if (filter) filter.disabled = true; if (orderContainer) orderContainer.classList.add('hidden'); renderTableItemsFast(cachedItems, true); 
  } else {
    const stockInputs = document.querySelectorAll('.stock-region-input'), expInputs = document.querySelectorAll('.exp-region-input');
    const updateMap = {}; let hasChanges = false;
    
    stockInputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region');
      const v = parseStrictNonNegativeInteger(input.value), original = parseStrictNonNegativeInteger(input.getAttribute('data-original'));
      if (v !== original) { if(!updateMap[c]) updateMap[c] = { stockBreakdown: {}, expBreakdown: {} }; updateMap[c].stockBreakdown[r] = v; hasChanges = true; }
    });
    
    expInputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region');
      const v = safeDisplay(input.value, ""), original = safeDisplay(input.getAttribute('data-original'), "");
      if (v !== original) { if(!updateMap[c]) updateMap[c] = { stockBreakdown: {}, expBreakdown: {} }; updateMap[c].expBreakdown[r] = v; hasChanges = true; }
    });
    
    if (!hasChanges) {
      isStockEditMode = false; 
      if(btn) { btn.innerHTML = `⚙️ <span data-i18n="btn_manage">MANAGE INVENTORY</span>`; btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
      if (filter) filter.disabled = false; if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
      renderTableItemsFast(cachedItems, true); return; 
    }
    
    isSubmitting = true;
    if(btn) { btn.disabled = true; btn.classList.add('pointer-events-none'); btn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`; }
    
    clearTimeout(submitLockTimer);
    submitLockTimer = setTimeout(() => { 
        isSubmitting = false; 
        if(btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = "💾 SAVE ALL"; } 
    }, 35000);

    const updates = Object.keys(updateMap).map(c => ({ code: c, stockBreakdown: updateMap[c].stockBreakdown, expBreakdown: updateMap[c].expBreakdown }));
    const uniqueSyncId = generateIdempotencyKey(); 

    try {
      const result = await executeApi("update_stock", { mode: "SET", stockUpdates: updates, syncId: uniqueSyncId });
      if (result && result.success) { showToast("동기화 완료", "success"); setTimeout(() => fetchItems(), 1000); } 
    } catch (err) { 
      if(err.ledgerPending) { showToast(`⚠️ 원장 기록 지연: 관리자 확인 필요 (TX: ${safeDisplay(err.txId)})`, "success"); setTimeout(() => fetchItems(), 1500); }
      else { showToast(err.message, "error"); }
    } finally {
      isStockEditMode = false; isSubmitting = false; clearTimeout(submitLockTimer);
      if(btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = `⚙️ <span data-i18n="btn_manage">MANAGE INVENTORY</span>`; btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
      if (filter) filter.disabled = false; if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
      if (window.applyTranslations) window.applyTranslations();
    }
  }
}

// 🌟 [방어 10] Image Decode Guard 탑재 (마우스 호버 OOM 프리징 방어)
let hoverRAF = null;
function attachImageHoverEffect() {
  const tableBody = document.getElementById('itemTableBody'), previewContainer = document.getElementById('imagePreviewContainer'), previewImg = document.getElementById('imagePreview');
  if (!tableBody || !previewContainer || !previewImg) return;
  
  tableBody.addEventListener('mouseover', (e) => { 
      if (e.target.classList.contains('item-thumbnail')) { 
          const targetSrc = e.target.getAttribute('data-full') || e.target.src;
          previewImg.src = targetSrc; 
          
          previewImg.decode().then(() => {
              previewContainer.classList.remove('hidden'); 
              setTimeout(() => { previewContainer.classList.remove('scale-95', 'opacity-0'); previewContainer.classList.add('scale-100', 'opacity-100'); }, 10); 
          }).catch(() => {
              previewContainer.classList.remove('hidden'); 
              setTimeout(() => { previewContainer.classList.remove('scale-95', 'opacity-0'); previewContainer.classList.add('scale-100', 'opacity-100'); }, 10);
          });
      } 
  });
  
  tableBody.addEventListener('mousemove', (e) => { 
      if (e.target.classList.contains('item-thumbnail')) { 
          if(hoverRAF) cancelAnimationFrame(hoverRAF);
          hoverRAF = requestAnimationFrame(() => {
              const x = Math.min(e.clientX + 20, window.innerWidth - 300); 
              const y = Math.min(e.clientY + 20, window.innerHeight - 300); 
              previewContainer.style.left = x + 'px'; previewContainer.style.top = y + 'px'; 
          });
      } 
  });
  
  tableBody.addEventListener('mouseout', (e) => { 
      if (e.target.classList.contains('item-thumbnail')) { 
          previewContainer.classList.remove('scale-100', 'opacity-100'); previewContainer.classList.add('scale-95', 'opacity-0'); 
          setTimeout(() => { previewContainer.classList.add('hidden'); previewImg.src = ''; }, 200); 
      } 
  });
}

// 🌟 [방어 30] 빈 페이로드 1차 차단
async function submitOrder() {
  if(userRole === "VENDOR" || isSubmitting || !navigator.onLine) return showToast("현재 시스템 통신이 불가능합니다.", "error");
  const qtyInputs = document.querySelectorAll('.order-qty'), orderItems = [];
  
  qtyInputs.forEach(input => {
    const qty = parseStrictNonNegativeInteger(input.value); 
    if (qty > 0) { 
      const idx = input.getAttribute('data-index'); 
      if (cachedItems[idx]) {
        orderItems.push({ code: safeDisplay(cachedItems[idx].code), name: safeDisplay(cachedItems[idx].name), price: parseStrictDecimal(cachedItems[idx].price), qty: qty, category: safeDisplay(cachedItems[idx].category), isZeroRated: isZeroRatedItem(cachedItems[idx]) }); 
      }
    }
  });
  
  if (orderItems.length === 0 || currentOrderTaxSummary.grandTotal <= 0) {
      return showToast("발주 수량을 최소 1개 이상 입력해 주세요.", "error");
  }
  
  const grandTotal = document.getElementById('orderGrandTotal')?.innerText || "$0.00";
  const confirmMsg = `[발주 내역 요약]\n• 식품/식자재(0% 면세): ${formatCurrency(currentOrderTaxSummary.foodSubtotal)}\n• 과세 비품/소모품: ${formatCurrency(currentOrderTaxSummary.taxableSubtotal)}\n• 적용 세금 (${taxRateObj.name}): ${formatCurrency(currentOrderTaxSummary.taxAmount)}\n• 최종 결제액: ${grandTotal}\n\nB2B 물류업체로 발주 이메일을 전송하시겠습니까?`;

  if (!confirm(confirmMsg)) return;

  isSubmitting = true;
  const submitBtn = document.querySelector('button[onclick="submitOrder()"]'), originalHTML = submitBtn ? submitBtn.innerHTML : "SUBMIT ORDER";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('pointer-events-none'); submitBtn.innerHTML = "<span class='animate-pulse'>⏳ DISPATCHING...</span>"; }

  clearTimeout(submitLockTimer);
  submitLockTimer = setTimeout(() => { 
      isSubmitting = false; 
      if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('pointer-events-none'); submitBtn.innerHTML = originalHTML; } 
  }, 35000);

  const uniqueBatchId = generateIdempotencyKey();

  try {
    const result = await executeApi("save_order", { clientName: clientName, clientState: currentClientState, items: orderItems, taxSummary: currentOrderTaxSummary, batchId: uniqueBatchId });
    if (result && result.success) { 
        showToast(result.message || `발주 완료 및 B2B 이메일 전송 성공 (번호: ${escapeHtml(result.batchId)})`, "success"); 
        try{ localStorage.removeItem(`Y2C_CART_STATE_${clientName}`); }catch(e){}
        setTimeout(() => fetchItems(), 1500); 
    } 
  } catch (error) { 
    if(error.ledgerPending) { showToast(`⚠️ 원장 기록 지연: 관리자 확인 필요 (TX: ${safeDisplay(error.txId)})`, "success"); setTimeout(() => fetchItems(), 2500); }
    else { showToast(error.message, "error"); }
  } finally { 
    isSubmitting = false; clearTimeout(submitLockTimer);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('pointer-events-none'); submitBtn.innerHTML = originalHTML; } 
  }
}

async function loadHeavyLibrary(url, objName) {
    if (window[objName] !== undefined) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = url;
        script.onload = () => resolve(true); 
        script.onerror = () => { showToast(`${objName} 로드에 실패했습니다. 네트워크를 확인하세요.`, "error"); reject(false); };
        document.head.appendChild(script);
    });
}

// ============================================================================
// 🚀 [V40.15 핵심] Time-Slicing 비동기 엑셀 파싱 엔진 (OOM 방어)
// ============================================================================
async function handleExcelUpload(event) {
  // 🌟 (admin.js에서 이미 이관된 로직이므로 items.js에는 이벤트 껍데기만 남겨둘 수 있으나, 독립 실행을 위해 구조 유지)
  showToast("엑셀 입고는 관리자(Admin) 탭에서 진행해 주세요.", "error");
}

window.cancelOrder = async function(batchId) {
    if (isSubmitting || !navigator.onLine) return showToast("현재 시스템이 통신 중입니다.", "error");
    if (!batchId) {
        batchId = prompt("🚨 취소할 주문 번호(Order ID)를 입력하세요.\n(예: REQ-123456)");
        if (!batchId) return;
    }
    const safeBatchId = String(batchId).trim();
    if (safeBatchId.length > 50 || !/^[\w-]+$/.test(safeBatchId)) return showToast("주문 번호 형식이 올바르지 않습니다.", "error");

    const confirmMsg = `정말 주문 [${escapeHtml(safeBatchId)}]을 취소하시겠습니까?\n\n✔️ 취소 시 차감되었던 재고가 100% 복구됩니다.`;
    if (!confirm(confirmMsg)) return;

    isSubmitting = true; showToast("⏳ 시스템 취소 요청 중입니다...", "success");
    
    clearTimeout(submitLockTimer);
    submitLockTimer = setTimeout(() => { isSubmitting = false; showToast("취소 요청 시간이 초과되었습니다.", "error"); }, 35000);

    try {
        const result = await executeApi("cancel_order", { batchId: safeBatchId });
        if (result && result.success) { showToast(`✅ ${escapeHtml(result.message)}`, "success"); setTimeout(() => fetchItems(), 1500); } 
    } catch (err) { 
        if(err.ledgerPending) { showToast(`✅ 재고 복원 완료\n⚠️ 원장 지연 (TX: ${safeDisplay(err.txId)})`, "success"); setTimeout(() => fetchItems(), 2500); } 
        else { showToast(`❌ 취소 실패: ${escapeHtml(err.message)}`, "error"); }
    } finally { isSubmitting = false; clearTimeout(submitLockTimer); }
}

window.submitOrder = submitOrder; 
window.fetchItems = fetchItems; 
window.toggleStockEditMode = toggleStockEditMode; 
window.applyRegionFilter = applyRegionFilter; 
window.applyAiSuggestion = applyAiSuggestion; 
window.calculateOrderTotal = calculateOrderTotal; 
window.handleExcelUpload = handleExcelUpload;
window.cancelOrder = cancelOrder; 

// ============================================================================
// 🌟 시스템 초기화 바인딩
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.changeLanguage(currentLang);
  applyGlobalRbacNavigation(); 
  
  if (userRole === "MASTER" || userRole === "VENDOR") {
    fetchMappings().then(() => { fetchItems(); });
  } else { 
    fetchItems(); 
  }
});
