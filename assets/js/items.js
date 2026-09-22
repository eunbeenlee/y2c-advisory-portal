/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Item Catalog Engine (V17.50 Turbo)
 * [Absolute Null-Safe] 빈칸, 오염 데이터 방어 & 초스무스(DocumentFragment) 렌더링
 * ============================================================================
 */

// 🌟 스크립트 로드 즉시 FOUC 방어막 강제 철거 (부드러운 페이드인 연동)
try {
    var docEl = document.documentElement;
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            docEl.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
            docEl.classList.remove("opacity-0");
            docEl.style.opacity = "1";
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

if (!sessionToken || !clientName) { window.location.replace("index.html"); }

// ============================================================================
// 🌐 다국어(i18n) 딕셔너리
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
        btnEn.className = safeLang === 'en' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    if (typeof renderTableItems === 'function' && cachedItems.length > 0) renderTableItems();
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
// 🔒 [방어 V17.50] Absolute Null-Safe Parsers (빈칸, 특수문자, NaN 완벽 치환)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
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
    return num; 
}

function parseStrictDecimal(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isFinite(num)) return 0; 
    return num; 
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
    return str; 
}

function roundToCents(amount) { 
    return Math.round(parseStrictDecimal(amount) * 100) / 100; 
}

const generateIdempotencyKey = () => { 
  if (window.crypto && crypto.randomUUID) return "REQ-" + crypto.randomUUID().toUpperCase();
  if (window.crypto && crypto.getRandomValues) { const array = new Uint32Array(4); window.crypto.getRandomValues(array); return 'REQ-' + Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').toUpperCase(); }
  return 'REQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 10).toUpperCase(); 
};

const formatCurrency = (amount) => { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(parseStrictDecimal(amount)); };
function formatTimestamp(isoString) { if (!isoString) return "Never"; const d = new Date(isoString); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString('en-CA', { month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' }); }

const userNameDisplay = document.getElementById('userNameDisplay'); if (userNameDisplay) userNameDisplay.innerText = safeDisplay(clientName);
const badge = document.getElementById('userRoleBadge'); if(badge) { badge.classList.remove('hidden'); badge.innerText = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
    window.location.replace("index.html"); 
});

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) { 
    container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container); 
  }
  if (container.childNodes.length >= 5) container.firstChild.remove();

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]', icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg whitespace-pre-line"></span>`;
  toast.querySelector('.toast-msg').textContent = String(message);
  container.appendChild(toast);
  
  requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => { toast.remove(); if (container && container.childNodes.length === 0) container.remove(); }, 300); }, 3500);
}

window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다. 네트워크를 확인해 주세요.", "error"));
window.addEventListener('online', () => showToast("네트워크가 복구되었습니다.", "success"));
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) { 
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
    isSubmitting = false; clearTimeout(submitLockTimer);
});

// 🌟 [방어] 글로벌 네비게이션 권한 교차 검증 (HTML과 동일 록다운 유지)
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

// 🌟 CRA 면세(Zero-Rated) 무결성 체크 (기능 무손실 보존)
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

// 🌟 백오프 2.0 통신 엔진
async function executeApi(action, payload = {}, retries = 2) {
  if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다. 연결을 확인하세요.");
  
  const canRetry = RETRYABLE_ACTIONS.has(action);
  const maxAttempts = canRetry ? retries : 0; 
  let lastNetworkError;
  const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

  for (let i = 0; i <= maxAttempts; i++) {
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), 25000);
    
    try {
      const response = await fetch(CONFIG.API?.BASE_URL || "", {
        method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
        body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
          const httpError = new Error(`HTTP ${response.status}`);
          httpError.httpStatus = response.status;
          throw httpError;
      }
      
      const rawText = await response.text();
      controller = null;
      
      let jsonResult;
      try { jsonResult = JSON.parse(rawText); } 
      catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷과 일치하지 않습니다."); }

      if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 형식이 올바르지 않습니다.");

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
      return jsonResult;
    } catch (err) {
      clearTimeout(timeoutId); lastNetworkError = err;
      
      if (err && err.httpStatus) {
          if (err.httpStatus === 429) throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)");
          if (err.httpStatus === 503) throw new Error("서버가 일시적으로 점검 중입니다. (HTTP 503)");
          throw err; 
      }
      if (err.message && err.message.includes("Failed to fetch")) throw new Error("🚨 서버 접근 차단됨(CORS). 백엔드 배포를 확인하세요.");
      
      if (i < maxAttempts) { 
          const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800);
          await new Promise(res => setTimeout(res, waitTime)); 
      }
    }
  }
  throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (25초 대기열 초과)" : (lastNetworkError?.message || "서버 통신 실패. 네트워크 상태를 확인해주세요."));
}

async function fetchMappings() {
  if (userRole !== "MASTER" && userRole !== "VENDOR") return;
  try {
    const result = await executeApi("get_procurement_data");
    cachedMappings = (result && result.success && Array.isArray(result.mappings)) ? result.mappings : [];
  } catch (error) { cachedMappings = []; }
}

async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody'); if (!tableBody) return;
  
  // HTML 영역의 Shimmer 애니메이션과 100% 동기화 (깜빡임 차단)
  if (tableBody.innerHTML.trim() === "") {
      tableBody.innerHTML = `<tr><td colspan="6" class="p-0"><div class="w-full h-[64px] shimmer-bg border-b border-gray-100"></div><div class="w-full h-[64px] shimmer-bg border-b border-gray-100 opacity-90"></div><div class="w-full h-[64px] shimmer-bg border-b border-gray-100 opacity-80"></div><div class="py-12 text-center"><p class="text-[12px] font-bold text-gray-400 tracking-wider uppercase animate-pulse">Synchronizing Data...</p></div></td></tr>`;
  }
  
  try {
    const result = await executeApi("get_items", { clientState: currentClientState });
    if (result && result.success) {
      cachedItems = Array.isArray(result.items || result.data) ? (result.items || result.data) : [];
      currentClientState = safeDisplay(result.appliedState, "DEFAULT").trim();
      taxRateObj = CONFIG.TAX_RATES[currentClientState.toUpperCase()] || CONFIG.TAX_RATES["DEFAULT"] || { name: "Standard Tax", rate: 0.13 };
      
      const headerTitle = document.getElementById('catalogHeaderTitle');
      if (headerTitle) headerTitle.innerHTML = `<span class="text-[#E84C60] drop-shadow-md">📦</span> <span data-i18n="catalog_title">Inventory & Catalog</span> ${userRole === 'VENDOR' ? '' : `<span class="ml-3 text-[10px] sm:text-[11px] bg-[#E84C60]/10 text-[#E84C60] px-3 py-1.5 rounded-lg border border-[#E84C60]/30 tracking-widest uppercase shadow-sm whitespace-nowrap">${escapeHtml(currentClientState === "DEFAULT" ? "Standard" : currentClientState)} Pricing</span>`}`;
      
      const kpiDash = document.getElementById('kpiDashboard'); if (kpiDash) kpiDash.classList.remove('hidden');
      const kpiUpdated = document.getElementById('kpiLastUpdated'); if (kpiUpdated) kpiUpdated.innerText = formatTimestamp(result.lastUpdated);

      if (userRole === "MASTER" || userRole === "VENDOR") {
        const masterControls = document.getElementById('masterInventoryControls');
        if (masterControls) masterControls.classList.remove('hidden');
        populateRegionFilter();
      } else {
        const aiBtn = document.getElementById('aiSuggestBtn');
        if (aiBtn) aiBtn.classList.remove('hidden');
      }

      renderTableItemsFast(); 
      if(userRole !== "VENDOR") calculateOrderTotal(); 
    } 
  } catch (error) { tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">Failed to load catalog data: ${escapeHtml(error.message)}</td></tr>`; }
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

function applyRegionFilter() { masterViewRegion = document.getElementById('regionFilter').value; renderTableItemsFast(); }

function checkExpWarning(expDateStr) {
  if (!expDateStr || expDateStr === "-" || expDateStr === "null") return false;
  const firstDateStr = String(expDateStr).split('|')[0].split(':')[0].trim();
  const dateMatch = firstDateStr.match(/\d{4}-\d{2}-\d{2}/); if (!dateMatch) return false;
  const expDate = new Date(dateMatch[0] + "T00:00:00"), today = new Date();
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  return (diffDays <= 30); 
}

window.saveCartState = function() {
    if (userRole === "VENDOR") return;
    const qtyInputs = document.querySelectorAll('.order-qty');
    const cartState = {};
    qtyInputs.forEach(input => {
        const qty = parseStrictNonNegativeInteger(input.value);
        if (qty > 0) { const code = input.getAttribute('data-code'); if(code) cartState[code] = qty; }
    });
    try { localStorage.setItem(`Y2C_CART_STATE_${clientName}`, JSON.stringify(cartState)); } catch(e) {}
};

// ============================================================================
// ⚡ [V17.50 Turbo] 초고속 DOM 메모리 렌더러 (렉 방지 & 문자열 일괄 주입 엔진)
// ============================================================================
function renderTableItemsFast(data = cachedItems) {
  const tableBody = document.getElementById('itemTableBody'); if (!tableBody) return;

  if (!data || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500 font-bold">표시할 품목이 없습니다.</td></tr>`;
      return;
  }
  
  let totalValue = 0, lowStockCount = 0;
  const isMasterOrVendor = (userRole === "MASTER" || userRole === "VENDOR");
  const sLabel = document.getElementById('stockHeaderLabel');
  if (sLabel) sLabel.innerText = isMasterOrVendor ? (masterViewRegion === "ALL" ? "Total Hub Stock" : `Hub Stock (${masterViewRegion})`) : `Local Hub (${currentClientState})`;

  let savedCart = {};
  try { savedCart = JSON.parse(localStorage.getItem(`Y2C_CART_STATE_${clientName}`)) || {}; } catch(e){}

  // 브라우저 렌더 트리를 건드리지 않는 거대한 HTML 문자열 조립
  let htmlString = "";

  for (let i = 0; i < data.length; i++) {
      const item = data[i]; 
      
      const safeCode = safeDisplay(item.code);
      const safeName = safeDisplay(item.name);
      
      const rawImgValue = String(item.image || "").trim();
      const resolvedImgUrl = resolveDriveImageUrl(rawImgValue);
      
      const imgTag = resolvedImgUrl !== '' 
          ? `<img src="${escapeHtml(resolvedImgUrl)}" alt="${safeCode}" class="item-thumbnail cursor-zoom-in w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-gray-200 shadow-sm shrink-0 bg-white hover:border-[#E84C60] transition-colors" loading="lazy" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0\\'>No Img</div>';">` 
          : `<div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0">No Img</div>`;
      
      let displayStock = isMasterOrVendor ? (masterViewRegion === "ALL" ? item.totalStock : (item.stockBreakdown?.[masterViewRegion] || 0)) : item.regionalStock;
      if (typeof displayStock !== 'number' || Number.isNaN(displayStock)) displayStock = 0;

      const safePrice = parseStrictDecimal(item.price);
      totalValue += roundToCents(safePrice * displayStock);
      
      if (displayStock > 0 && displayStock <= 10) lowStockCount++;

      const isLowStock = displayStock > 0 && displayStock <= 10, isSoldOut = displayStock <= 0;
      let stockBadgeClass = isSoldOut ? "text-[#C23347] bg-[#E84C60]/10 px-2 py-0.5 rounded shadow-sm border border-[#E84C60]/20 low-stock-pulse" : (isLowStock ? "text-[#E84C60] font-extrabold" : "text-gray-800");
      let aiBadgeHTML = (userRole === "PARTNER" && parseStrictNonNegativeInteger(item.aiSuggestedQty) > 0) ? `<div class="mt-1"><span class="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><span class="text-[10px]">✨</span> AI Suggestion: ${escapeHtml(item.aiSuggestedQty)}</span></div>` : '';

      const isZeroRated = isZeroRatedItem(item);
      const taxTag = isZeroRated 
        ? `<span class="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-100 text-emerald-700 border border-emerald-200" title="CRA Zero-Rated Basic Grocery (0% Tax)">0% TAX</span>`
        : `<span class="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-100 text-blue-700 border border-blue-200" title="Standard Taxable Goods">TAXABLE</span>`;

      const translatedCategory = safeDisplay(translateDynamic(item.category || 'General', 'category'));

      let expDisplayHTML = '';
      if (isMasterOrVendor && masterViewRegion === "ALL") {
        let expLines = [];
        for (let reg in item.expBreakdown || {}) {
          let regExp = safeDisplay(item.expBreakdown[reg], "");
          if (regExp && regExp !== "-") {
            const isExpWarn = checkExpWarning(regExp);
            const expColorClass = isExpWarn ? "text-[#E84C60] bg-[#E84C60]/10 border-[#E84C60]/30" : "text-emerald-700 bg-emerald-50 border-emerald-200";
            expLines.push(`<div class="flex items-start justify-between gap-3 text-[9px] font-black uppercase px-2 py-1 rounded border shadow-sm ${expColorClass} mb-1"><span class="opacity-70 mt-0.5">${escapeHtml(reg)}:</span> <span class="text-right leading-tight">${isExpWarn ? "⚠️" : "🕒"} ${escapeHtml(regExp).replace(/\|/g, '<br>')}</span></div>`);
          }
        }
        if (expLines.length > 0) { expDisplayHTML = `<div class="mt-2 flex flex-col w-full max-w-[150px] mx-auto">${expLines.join('')}</div>`; }
      } else {
        let expDateVal = isMasterOrVendor ? safeDisplay(item.expBreakdown?.[masterViewRegion], "") : safeDisplay(item.expBreakdown?.[currentClientState], "");
        if (expDateVal && expDateVal !== "-") {
          const isExpWarn = checkExpWarning(expDateVal);
          const expColorClass = isExpWarn ? "text-[#E84C60] bg-[#E84C60]/10 border-[#E84C60]/30" : "text-emerald-700 bg-emerald-50 border-emerald-200";
          expDisplayHTML = `<div class="mt-1.5 inline-block text-left text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border shadow-sm ${expColorClass}"><span>${isExpWarn ? "⚠️" : "🕒"}</span> EXP:<br>${escapeHtml(expDateVal).replace(/\|/g, '<br>')}</div>`;
        }
      }

      let stockDisplayHTML = '', orderInputHTML = '';
      if (isStockEditMode && isMasterOrVendor) {
        let editInputs = '';
        for (const reg in item.stockBreakdown || {}) {
          const currentRegStock = parseStrictNonNegativeInteger(item.stockBreakdown[reg]); 
          const currentRegExp = safeDisplay(item.expBreakdown?.[reg], "");
          editInputs += `<div class="flex flex-col gap-1 bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100 mb-1.5"><div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-emerald-800">${escapeHtml(reg)} STOCK</span><input type="number" min="0" data-code="${safeCode}" data-region="${escapeHtml(reg)}" data-type="stock" data-original="${currentRegStock}" value="${currentRegStock}" class="stock-region-input w-14 bg-white border border-emerald-400 rounded px-1 text-center text-[11px] font-bold focus:outline-none"></div><div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-emerald-800">${escapeHtml(reg)} EXP</span><input type="text" placeholder="YYYY-MM-DD:Qty" data-code="${safeCode}" data-region="${escapeHtml(reg)}" data-type="exp" data-original="${currentRegExp}" value="${currentRegExp === '-' ? '' : currentRegExp}" class="exp-region-input w-full bg-white border border-emerald-400 rounded px-1 text-center text-[10px] font-bold focus:outline-none placeholder-emerald-200"></div></div>`;
        }
        stockDisplayHTML = `<div class="flex flex-col w-full">${editInputs}</div>`;
        orderInputHTML = `<input type="number" disabled placeholder="-" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
      } else if (isMasterOrVendor && !isStockEditMode) {
        stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
        orderInputHTML = `<input type="number" disabled placeholder="${escapeHtml(userRole)}" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[10px] font-black text-gray-400 opacity-50 cursor-not-allowed uppercase">`;
      } else {
        if (isSoldOut) {
          stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[10px] font-black ${stockBadgeClass} uppercase tracking-wider whitespace-nowrap">Sold Out</span>${expDisplayHTML}</div>`;
          orderInputHTML = `<input type="number" disabled placeholder="0" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
        } else {
          let currentQty = parseStrictNonNegativeInteger(savedCart[item.code]);
          stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
          orderInputHTML = `<input type="number" min="0" max="${displayStock}" value="${currentQty === 0 ? '' : currentQty}" placeholder="0" data-index="${i}" data-code="${safeCode}" class="order-qty w-20 sm:w-24 bg-white/70 border border-gray-300 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-gray-900 focus:border-[#E84C60] outline-none shadow-sm transition-all hover:shadow-md">`;
        }
      }

      const priceCellHTML = userRole === "VENDOR" ? `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-gray-400 font-bold text-right font-inter">-</td>` : `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-gray-800 font-black text-right font-mono">${safePrice === 0 ? '-' : formatCurrency(safePrice)}</td>`;
      htmlString += `<tr class="hover:bg-gray-50/50 transition-colors duration-200"><td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${safeCode}</td><td class="px-5 sm:px-6 py-4 flex items-center gap-4">${imgTag}<div class="flex flex-col"><span class="text-[13px] sm:text-sm text-gray-800 font-extrabold tracking-tight whitespace-normal break-keep font-inter">${safeName}</span>${aiBadgeHTML}</div></td><td class="px-5 sm:px-6 py-4 whitespace-nowrap"><span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${translatedCategory}</span>${taxTag}</td>${priceCellHTML}<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-gray-50 border-l border-gray-200 align-middle">${stockDisplayHTML}</td><td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10 align-middle">${orderInputHTML}</td></tr>`;
  }

  // 🌟 단 한 번의 DOM 주입으로 렌더링 부하 최소화
  tableBody.style.opacity = '0';
  tableBody.innerHTML = htmlString;
  
  // 🌟 [방어 4] GPU 가속으로 부드러운 테이블 나타나기
  requestAnimationFrame(() => {
      tableBody.style.opacity = '1';
      
      if (document.getElementById('kpiTotalSkus')) document.getElementById('kpiTotalSkus').innerText = data.length;
      if (document.getElementById('kpiTotalValue')) document.getElementById('kpiTotalValue').innerText = userRole === "VENDOR" ? "N/A" : formatCurrency(totalValue);
      if (document.getElementById('kpiLowStock')) document.getElementById('kpiLowStock').innerText = `${lowStockCount} Items`;
      
      if (window.applyTranslations) window.applyTranslations();
      attachImageHoverEffect(); 
      
      document.querySelectorAll('.order-qty').forEach(input => {
          input.addEventListener('input', () => { 
              const val = parseStrictNonNegativeInteger(input.value);
              const max = parseStrictNonNegativeInteger(input.getAttribute('max'));
              if (val > max) { input.value = max; showToast("최대 가용 재고를 초과할 수 없습니다.", "error"); }
              calculateOrderTotal(); 
              window.saveCartState(); 
          });
      });
  });
}
window.renderItemRowsFast = renderTableItemsFast;

function applyAiSuggestion() {
  const qtyInputs = document.querySelectorAll('.order-qty'); let appliedCount = 0;
  qtyInputs.forEach(input => {
    const idx = input.getAttribute('data-index');
    if (cachedItems[idx] && parseStrictNonNegativeInteger(cachedItems[idx].aiSuggestedQty) > 0) {
      const maxQty = parseStrictNonNegativeInteger(input.getAttribute('max')); 
      const targetQty = Math.min(cachedItems[idx].aiSuggestedQty, maxQty);
      if (targetQty > 0) { input.value = targetQty; appliedCount++; }
    }
  });
  if (appliedCount > 0) { 
      showToast(`AI 분석: ${appliedCount}개 품목 세팅 완료`, "success"); 
      calculateOrderTotal(); window.saveCartState(); 
  } else { showToast("적용할 추천 데이터가 없습니다.", "error"); }
}

let currentOrderTaxSummary = { subtotal: 0, foodSubtotal: 0, taxableSubtotal: 0, taxAmount: 0, grandTotal: 0 };

function calculateOrderTotal() {
  if(userRole === "VENDOR") return; 
  const qtyInputs = document.querySelectorAll('.order-qty'); 
  let subtotal = 0, foodSubtotal = 0, taxableSubtotal = 0;   

  qtyInputs.forEach(input => {
    const qty = parseStrictNonNegativeInteger(input.value);
    const maxQty = parseStrictNonNegativeInteger(input.getAttribute('max'));
    if (qty > maxQty) { input.value = maxQty; showToast("재고 수량을 초과할 수 없습니다.", "error"); return; }
    
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

  const subtotalElem = document.getElementById('orderSubtotal'); if (subtotalElem) subtotalElem.innerText = formatCurrency(subtotal);
  const taxLabelElem = document.getElementById('orderTaxLabel'); if (taxLabelElem) taxLabelElem.innerHTML = `Estimated Tax - ${escapeHtml(taxRateObj.name)}:<br><span class="text-[10px] font-normal text-gray-500">(0% on Food $${foodSubtotal.toFixed(2)} / Taxable: $${taxableSubtotal.toFixed(2)})</span>`;
  const taxAmtElem = document.getElementById('orderTaxAmt'); if (taxAmtElem) taxAmtElem.innerText = formatCurrency(taxAmt);
  const grandTotalElem = document.getElementById('orderGrandTotal'); if (grandTotalElem) grandTotalElem.innerText = formatCurrency(grandTotal);
}

async function toggleStockEditMode() {
  if (isSubmitting) return; 
  const btn = document.getElementById('toggleStockBtn'), filter = document.getElementById('regionFilter'), orderContainer = document.getElementById('orderActionContainer');
  
  if (!isStockEditMode) {
    isStockEditMode = true;
    if(btn) { btn.innerHTML = "💾 SAVE ALL"; btn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); btn.classList.replace('hover:bg-black', 'hover:bg-emerald-700'); }
    if (filter) filter.disabled = true; if (orderContainer) orderContainer.classList.add('hidden'); renderTableItemsFast(); 
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
      renderTableItemsFast(); return; 
    }
    
    isSubmitting = true;
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ SAVING..."; btn.classList.add('animate-pulse'); }
    
    clearTimeout(submitLockTimer);
    submitLockTimer = setTimeout(() => { isSubmitting = false; if(btn) { btn.disabled = false; btn.innerHTML = "💾 SAVE ALL"; btn.classList.remove('animate-pulse'); } }, 30000);

    const updates = Object.keys(updateMap).map(c => ({ code: c, stockBreakdown: updateMap[c].stockBreakdown, expBreakdown: updateMap[c].expBreakdown }));
    const uniqueSyncId = generateIdempotencyKey(); 

    try {
      const result = await executeApi("update_stock", { mode: "SET", stockUpdates: updates, syncId: uniqueSyncId });
      if (result && result.success) { showToast("동기화 완료", "success"); setTimeout(() => fetchItems(), 1000); } 
    } catch (err) { 
      if(err.ledgerPending) { showToast(`⚠️ 원장 기록 지연: 관리자 확인 필요 (TX: ${safeDisplay(err.txId)})`, "success"); setTimeout(() => fetchItems(), 1500); }
      else { showToast(err.message, "error"); if(err.message.includes("재고") || err.message.includes("부족") || err.message.includes("일치")) { setTimeout(() => fetchItems(), 1500); } }
    } finally {
      isStockEditMode = false; isSubmitting = false; clearTimeout(submitLockTimer);
      if(btn) { btn.disabled = false; btn.innerHTML = `⚙️ <span data-i18n="btn_manage">MANAGE INVENTORY</span>`; btn.classList.remove('animate-pulse'); btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
      if (filter) filter.disabled = false; if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
    }
  }
}

function attachImageHoverEffect() {
  const tableBody = document.getElementById('itemTableBody'), previewContainer = document.getElementById('imagePreviewContainer'), previewImg = document.getElementById('imagePreview');
  if (!tableBody || !previewContainer || !previewImg) return;
  tableBody.addEventListener('mouseover', (e) => { if (e.target.classList.contains('item-thumbnail')) { previewImg.src = e.target.src; previewContainer.classList.remove('hidden'); setTimeout(() => { previewContainer.classList.remove('scale-95', 'opacity-0'); previewContainer.classList.add('scale-100', 'opacity-100'); }, 10); } });
  tableBody.addEventListener('mousemove', (e) => { if (e.target.classList.contains('item-thumbnail')) { const x = Math.min(e.clientX + 20, window.innerWidth - 300); const y = Math.min(e.clientY + 20, window.innerHeight - 300); previewContainer.style.left = x + 'px'; previewContainer.style.top = y + 'px'; } });
  tableBody.addEventListener('mouseout', (e) => { if (e.target.classList.contains('item-thumbnail')) { previewContainer.classList.remove('scale-100', 'opacity-100'); previewContainer.classList.add('scale-95', 'opacity-0'); setTimeout(() => { previewContainer.classList.add('hidden'); previewImg.src = ''; }, 200); } });
}

async function submitOrder() {
  if(userRole === "VENDOR" || isSubmitting) return;
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
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "<span>⏳</span> DISPATCHING EMAIL..."; submitBtn.classList.add('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }

  clearTimeout(submitLockTimer);
  submitLockTimer = setTimeout(() => { isSubmitting = false; if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); } }, 30000);

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
    else { showToast(error.message, "error"); if(error.message.includes("재고") || error.message.includes("변동") || error.message.includes("취소") || error.message.includes("단가")) { setTimeout(() => fetchItems(), 1500); } }
  } finally { 
    isSubmitting = false; clearTimeout(submitLockTimer);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); } 
  }
}

function compressImage(file, maxWidth = 1600, maxHeight = 1600) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image(); img.src = event.target.result;
            img.onload = () => {
                let width = img.width, height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) { height = Math.round((height *= maxWidth / width)); width = maxWidth; } 
                    else { width = Math.round((width *= maxHeight / height)); height = maxHeight; }
                }
                const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => { resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })); }, 'image/jpeg', 0.8); 
            };
            img.onerror = error => resolve(file);
        };
        reader.onerror = error => resolve(file);
    });
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

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone'); if(!dropZone) return;
  const clone = dropZone.cloneNode(true); dropZone.parentNode.replaceChild(clone, dropZone);

  clone.addEventListener('dragover', (e) => { e.preventDefault(); clone.classList.add('bg-pink-50/50', 'border-[#E84C60]'); });
  clone.addEventListener('dragleave', (e) => { e.preventDefault(); clone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); });
  clone.addEventListener('drop', (e) => { e.preventDefault(); clone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); handleExcelUpload(e); });
  
  const fileInput = document.getElementById('excelFileInput');
  if(fileInput) {
      const fiClone = fileInput.cloneNode(true); fileInput.parentNode.replaceChild(fiClone, fileInput);
      fiClone.addEventListener('change', handleExcelUpload);
  }
}

async function handleExcelUpload(event) {
  event.preventDefault();
  if (isSubmitting) return showToast("현재 데이터를 서버로 전송 중입니다. 잠시 기다려주세요.", "error");

  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) return showToast("파일 크기가 너무 큽니다. (최대 10MB 지원)", "error");

  isSubmitting = true;
  const validExcelExts = [".xlsx", ".xls", ".csv"], validImgExts = [".png", ".jpg", ".jpeg"];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const statusText = document.getElementById('uploadStatusText');

  if (validExcelExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Loading Excel Engine...</span>`;
    try { await loadHeavyLibrary("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "XLSX"); } 
    catch(e) { isSubmitting = false; return; }

    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Parsing Excel Document...</span>`;
    
    const reader = new FileReader();
    reader.onerror = () => { isSubmitting = false; if(statusText) statusText.innerHTML = "Drag & Drop vendor document here"; showToast("파일을 읽는 중 시스템 오류가 발생했습니다.", "error"); };
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result), workbook = XLSX.read(data, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]], jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
        if (jsonData.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다.");
        processExcelData(jsonData, file.name);
      } catch(err) {
        isSubmitting = false; showToast("엑셀 파싱 중 오류 발생: " + err.message, "error"); 
        if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
      }
    };
    reader.readAsArrayBuffer(file);
  } 
  else if (validImgExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">Compressing Image...</span>`;
    
    let targetFile = file;
    try { targetFile = await compressImage(file); } catch(e) { console.warn("[Y2C Telemetry] Compression fallback"); }

    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">Loading AI OCR Engine...</span>`;
    try { await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js", "Tesseract"); } 
    catch(e) { isSubmitting = false; return; }

    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">AI Vision OCR Scanning...</span>`;
    
    try {
      const result = await Tesseract.recognize(targetFile, 'eng+kor', {
        logger: m => { if (m.status === 'recognizing text' && statusText) { const pct = Math.floor(m.progress * 100); statusText.innerHTML = `<span class="text-indigo-500 font-bold">AI Vision Parsing: ${pct}%</span>`; } }
      });
      processOCRText(result.data.text, file.name);
    } catch(err) {
      isSubmitting = false; showToast("이미지 인식 실패: " + err.message, "error"); 
      if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
    }
  } else { 
    isSubmitting = false; return showToast("지원하지 않는 포맷입니다. (.xlsx, .jpg, .png 지원)", "error"); 
  }
}

function processOCRText(text, filename) {
  const safeText = String(text || ""); const lines = safeText.split('\n'), jsonData = [];
  lines.forEach(line => {
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/), expDate = dateMatch ? dateMatch[0] : "";
    const barcodeMatch = line.match(/\b\d{13,14}\b/), codeMatch = line.match(/\b[A-Z0-9]{5,15}\b/);
    const itemCode = (codeMatch ? codeMatch[0] : (barcodeMatch ? barcodeMatch[0] : ""));
    let cleanLine = line.replace(/\b\d+(\.\d+)?[KkGgLlMmCc]+\*\d+\b/g, '').replace(/,/g, ''); 
    const nums = cleanLine.match(/\b\d+\b/g); 
    let qty = 0;
    
    if (nums && nums.length > 0) {
      for(let i = nums.length - 1; i >= 0; i--) {
        const n = parseStrictNonNegativeInteger(nums[i]);
        if(n !== 0 && n < 10000 && String(n) !== itemCode) { qty = n; break; }
      }
    }
    if(itemCode && itemCode.length >= 3 && qty > 0) jsonData.push({ "Item#": itemCode, "Qty": qty, "Exp.Date": expDate });
  });

  if (jsonData.length === 0) {
    isSubmitting = false; showToast("이미지에서 품번 및 수량을 찾지 못했습니다.", "error");
    const statusText = document.getElementById('uploadStatusText'); if(statusText) statusText.innerHTML = "Drag & Drop vendor document here"; return;
  }
  processExcelData(jsonData, filename + " (OCR)");
}

async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector');
  if (!targetRegion || !targetRegion.value) {
    isSubmitting = false; showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error");
    const statusText = document.getElementById('uploadStatusText'); if(statusText) statusText.innerHTML = "Drag & Drop vendor document here"; return;
  }
  const regionVal = targetRegion.value;

  if (cachedItems.length === 0) {
    isSubmitting = false; showToast("카탈로그 데이터를 불러오는 중입니다. 잠시 후 시도하세요.", "error"); return;
  }

  let inboundMap = Object.create(null), successCount = 0, validationErrors = [];

  jsonData.forEach(row => {
    let vItemCode = "", vQty = 0, vExp = ""; let qtyMatches = 0;
    Object.keys(row).forEach(k => {
      let cleanK = String(k).replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '').toLowerCase();
      let valStr = String(row[k] || "").trim();
      if (cleanK === 'item#' || cleanK === 'itemcode' || cleanK === '품번') vItemCode = valStr;
      if (!vItemCode && cleanK === 'barcode') vItemCode = valStr;
      if (cleanK === 'qty' || cleanK === 'quantity' || cleanK === 'stock' || cleanK === '수량') {
          if (valStr !== "") { 
              qtyMatches++; const parsedQty = parseStrictNonNegativeInteger(valStr);
              if (parsedQty === 0 && valStr !== "0") { validationErrors.push(`[${safeDisplay(vItemCode, "Unknown")}] 수량 형식이 잘못되었습니다: ${escapeHtml(valStr)}`); } 
              else { vQty = parsedQty; }
          }
      }
      if (cleanK === 'exp.date' || cleanK === 'expdate' || cleanK === '유통기한') vExp = valStr;
    });

    if (qtyMatches > 1) { validationErrors.push(`[${safeDisplay(vItemCode, "Unknown")}] 수량 컬럼이 중복 매칭되어 데이터를 덮어쓰는 것을 차단했습니다.`); return; }

    const expString = String(vExp || "").trim();
    if (expString === "" || expString.toLowerCase() === "null" || expString === "-") { vExp = null; } 
    else { 
        vExp = parseStrictISODate(expString); 
        if (vExp === null) { validationErrors.push(`[${safeDisplay(vItemCode, "Unknown")}] 올바르지 않은 유통기한 형식입니다: ${escapeHtml(expString)}`); return; }
    }

    const safeVItemCode = String(vItemCode || "").trim().toUpperCase();

    if (safeVItemCode.length >= 3 && vQty > 0 && qtyMatches === 1) {
      let hqCode = null;
      const mapObj = cachedMappings.find(m => String(m.vendorCode || "").trim().toUpperCase() === safeVItemCode);
      if (mapObj) { hqCode = mapObj.hqCode; } else {
        const directMatch = cachedItems.find(item => String(item.code || "").trim().toUpperCase() === safeVItemCode);
        if (directMatch) hqCode = directMatch.code;
      }
      if (hqCode) {
        if (!inboundMap[hqCode]) inboundMap[hqCode] = { totalQty: 0, batches: Object.create(null) };
        inboundMap[hqCode].totalQty += vQty;
        if (vExp) { inboundMap[hqCode].batches[vExp] = (inboundMap[hqCode].batches[vExp] || 0) + vQty; }
        successCount++;
      }
    }
  });

  if (validationErrors.length > 0) {
      isSubmitting = false; const statusText = document.getElementById('uploadStatusText'); if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
      return showToast(`🚨 입고 실패 (데이터 오염 감지):\n\n${validationErrors.join('\n')}`, "error");
  }

  if (successCount === 0) {
    isSubmitting = false; const statusText = document.getElementById('uploadStatusText'); if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
    showToast("마스터 DB와 매칭되는 품목이 0건입니다.", "error"); return;
  }

  const finalStockUpdates = Object.keys(inboundMap).map(hqCode => {
    let newExpArr = [];
    let sortedDates = Object.keys(inboundMap[hqCode].batches).sort();
    sortedDates.forEach(d => { newExpArr.push(`${d}:${inboundMap[hqCode].batches[d]}`); });
    const addedExpStr = newExpArr.join(' | ');
    return { code: hqCode, stockBreakdown: { [regionVal]: inboundMap[hqCode].totalQty }, expBreakdown: { [regionVal]: addedExpStr } };
  });

  const statusText = document.getElementById('uploadStatusText');
  if(statusText) statusText.innerHTML = `<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${successCount} Rows (Atomic ADD)...</span>`;
  
  const uniqueSyncId = generateIdempotencyKey();

  try {
    const result = await executeApi("update_stock", { mode: "ADD", stockUpdates: finalStockUpdates, syncId: uniqueSyncId });
    if (result && result.success) {
      showToast(`입고 완료: 엑셀/이미지 ${successCount}건 누적 성공`, "success");
      if(statusText) statusText.innerHTML = `<span class="text-emerald-600 font-bold">✅ Uploaded: ${escapeHtml(filename)}</span>`;
      setTimeout(() => { isSubmitting = false; location.reload(); }, 1500); 
    } 
  } catch (err) {
    isSubmitting = false; 
    if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
    if(err.ledgerPending) { showToast(`✅ 재고 반영 완료\n⚠️ 원장 기록 지연: 관리자 확인 필요\n(TX: ${safeDisplay(err.txId)})`, "success"); setTimeout(() => fetchItems(), 2500); }
    else { showToast(err.message, "error"); if(err.message.includes("트래픽") || err.message.includes("동기화") || err.message.includes("일치")) { setTimeout(() => fetchItems(), 2000); } }
  }
}

async function cancelOrder(batchId) {
    if (isSubmitting) return showToast("현재 시스템이 다른 작업을 처리 중입니다.", "error");
    if (!batchId) {
        batchId = prompt("🚨 취소할 주문 번호(Order ID)를 입력하세요.\n(예: REQ-123456)");
        if (!batchId) return;
    }
    const safeBatchId = String(batchId).trim();
    if (safeBatchId.length > 50 || !/^[\w-]+$/.test(safeBatchId)) return showToast("주문 번호 형식이 올바르지 않습니다.", "error");

    const confirmMsg = `정말 주문 [${escapeHtml(safeBatchId)}]을 취소하시겠습니까?\n\n✔️ 취소 시 차감되었던 재고가 100% 복구됩니다.\n✔️ 물류사 및 본사로 [출고 중지 알림 이메일]이 자동 전송됩니다.`;
    if (!confirm(confirmMsg)) return;

    isSubmitting = true; showToast("⏳ 시스템 취소 요청 및 재고 복구를 진행 중입니다...", "success");
    
    clearTimeout(submitLockTimer);
    submitLockTimer = setTimeout(() => { isSubmitting = false; showToast("취소 요청 시간이 초과되었습니다.", "error"); }, 25000);

    try {
        const result = await executeApi("cancel_order", { batchId: safeBatchId });
        if (result && result.success) { showToast(`✅ ${escapeHtml(result.message)}`, "success"); setTimeout(() => fetchItems(), 1500); } 
    } catch (err) { 
        if(err.ledgerPending) { showToast(`✅ 재고 복원 성공\n⚠️ 원장 기록 지연: 관리자 확인 필요\n(TX: ${safeDisplay(err.txId)})`, "success"); setTimeout(() => fetchItems(), 2500); } 
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

document.addEventListener('DOMContentLoaded', () => {
  window.changeLanguage(currentLang);
  applyGlobalRbacNavigation(); 
  
  if (userRole === "MASTER" || userRole === "VENDOR") {
    fetchMappings().then(() => { fetchItems().then(setupDragAndDrop); });
  } else { 
    fetchItems(); 
  }
});
</script>
</body>
</html>
