// assets/js/admin.js
// 🌟 V17.30 Ultimate Kernel - PARTNER UX Optimization, Strict Role Isolation, 3-Way Match Inbound Engine, Anti-Crash Defense

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };

// 🌟 [V17.30 패치] 스토리지 안전 접근 및 권한 게이트키퍼 강화
let userRole = "", clientName = "", sessionToken = "";
try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
} catch (e) {
    console.error("[Y2C Storage Error]", e);
}

if (!sessionToken || !["MASTER", "VENDOR", "PARTNER"].includes(userRole)) { 
    alert("보안 세션이 유효하지 않습니다. 안전을 위해 다시 로그인해 주세요."); 
    window.location.replace("index.html"); 
}

const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "tab_profiles": "Franchise DB", "tab_sales": "ERP Sales", "tab_inbound": "Inbound (Excel)", "tab_hqorders": "HQ Procurement",
        "cancel_order": "Cancel Order", "logout": "LOGOUT",
        "hq_title": "HQ Procurement Console", "hq_desc": "Global logistics procurement status, digital cart, and system health scan center.",
        "b2b_volume": "Total B2B Volume", "b2b_expenditure": "Total B2B Expenditure", "sys_health_scan": "🛡️ SYSTEM HEALTH SCAN",
        "profiles_title": "Franchise Database", "profiles_desc": "Master management center for franchise profiles, addresses, contacts, and business IDs.",
        "sales_title": "ERP Sales Sync", "sales_desc": "Monthly POS and delivery app sales data integration and royalty calculation basis.",
        "inbound_title": "Atomic Inbound Gateway", "inbound_desc": "V17.12 Atomic Engine applied. Securely adds (+) to live quantity without overwriting existing stock.",
        "guide_title": "B2B Logistics Inventory Merge System Essential Guide",
        "guide_q1": "✅ What to upload?", "guide_a1_1": "• Excel receipt statements (.xlsx, .xls, .csv) issued by vendors (suppliers)", "guide_a1_2": "• Image files (.jpg, .jpeg, .png) of physical invoices and receipts (Auto Tesseract AI OCR Scan Engine activated)",
        "guide_q2": "⚠️ Precautions (Must Read)", "guide_a2_1": "• Uploaded quantities will be cumulatively added (+) to the live inventory of the selected Hub.", "guide_a2_2": "• Risk of duplicate receiving: Please be careful not to upload the same receiving file multiple times.",
        "dropzone_title": "Drag & Drop Vendor Document Here", "dropzone_desc": "Max 10MB. Supports .xlsx, .xls, .csv, .jpg, .png",
        "btn_browse": "Browse Files", "btn_save": "SAVE DATA", "btn_add": "Add Order",
        "placeholder_vendor": "Vendor Name (e.g. CJ Foods)", "placeholder_hub": "Hub (ON, BC..)", "placeholder_cart": "🛒 Click to Select Items & Qty...",
        "table_client": "Client Name", "table_state": "State (Hub)", "table_city": "City", "table_addr": "Full Address", "table_manager": "Manager", "table_email": "Email", "table_biz": "Business ID", "table_action": "Action",
        "kpi_annual": "Total Annual Sales", "kpi_pos": "POS (Dine-in & Takeout)", "kpi_del": "Delivery Platforms",
        "table_period": "Period", "table_pos": "Dine-in & Takeout (POS)", "table_del": "Delivery App (Skip, Uber)", "table_sub": "Subtotal", "table_status": "Status",
        "active_shipments": "Active Inbound Shipments",
        "th_orderid": "Order ID", "th_date": "Issue Date", "th_vendor": "Vendor", "th_hub": "Hub", "th_summary": "Items Summary", "th_eta": "ETA"
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "tab_profiles": "가맹점 DB", "tab_sales": "ERP 매출", "tab_inbound": "재고 입고 (Excel)", "tab_hqorders": "본사 발주 관제",
        "cancel_order": "발주 취소", "logout": "로그아웃",
        "hq_title": "본사 조달 및 물류 관제", "hq_desc": "본사의 글로벌 물류 조달 현황, 디지털 카트 발주 및 시스템 헬스 스캔 센터",
        "b2b_volume": "B2B 누적 물동량", "b2b_expenditure": "B2B 총 누적 지출액", "sys_health_scan": "🛡️ 시스템 헬스 스캔",
        "profiles_title": "가맹점 데이터베이스", "profiles_desc": "가맹점 프로필, 주소, 연락처 및 사업자 번호 마스터 관리 센터.",
        "sales_title": "ERP 매출 데이터 동기화", "sales_desc": "가맹점별 월간 POS 및 배달 매출 데이터 연동 및 로열티 산정 기반.",
        "inbound_title": "원자성 입고 게이트웨이", "inbound_desc": "V17.12 원자성 엔진 적용. 기존 재고를 덮어쓰지 않고 라이브 수량에 안전하게 합산(+)됩니다.",
        "guide_title": "B2B 물류 재고 병합 시스템 필수 가이드",
        "guide_q1": "무엇을 업로드하나요?", "guide_a1_1": "• 벤더사(공급업체)에서 발행한 엑셀 입고 명세서 (.xlsx, .xls, .csv)", "guide_a1_2": "• 실물 송장 및 영수증을 촬영한 이미지 파일 (.jpg, .jpeg, .png) (Tesseract AI OCR 스캔 엔진 자동 가동)",
        "guide_q2": "주의사항 (필독)", "guide_a2_1": "• 업로드된 수량은 선택하신 허브(Hub)의 라이브 재고에 누적 합산(+) 됩니다.", "guide_a2_2": "• 중복 입고 위험: 동일한 입고 파일을 여러 번 업로드하지 않도록 각별히 주의해 주세요.",
        "dropzone_title": "벤더사 문서를 이곳에 드래그 앤 드롭 하세요", "dropzone_desc": "최대 10MB. .xlsx, .xls, .csv, .jpg, .png 지원",
        "btn_browse": "파일 찾아보기", "btn_save": "데이터 저장", "btn_add": "발주 등록",
        "placeholder_vendor": "공급사명 (예: CJ Foods)", "placeholder_hub": "도착 허브 (ON, BC..)", "placeholder_cart": "🛒 품목 및 수량을 선택하세요...",
        "table_client": "가맹점명", "table_state": "관할 주 (Hub)", "table_city": "도시", "table_addr": "상세 주소", "table_manager": "담당자", "table_email": "이메일", "table_biz": "사업자 번호", "table_action": "관리",
        "kpi_annual": "연간 총 매출액", "kpi_pos": "홀 & 포장 (POS)", "kpi_del": "배달 플랫폼",
        "table_period": "기간 (월)", "table_pos": "홀 & 포장 매출 ($)", "table_del": "배달 앱 매출 ($)", "table_sub": "소계", "table_status": "상태",
        "active_shipments": "실시간 조달/입고 현황",
        "th_orderid": "주문 번호", "th_date": "발행일", "th_vendor": "벤더사", "th_hub": "입고 허브", "th_summary": "품목 요약", "th_eta": "도착 예정일"
    }
};

const DYNAMIC_I18N = { category: { en: { "떡": "Rice Cake", "떡류": "Rice Cake", "소스": "Sauce", "양념": "Sauce", "면": "Noodles", "면류": "Noodles", "식품": "Food", "냉동": "Frozen", "냉동식품": "Frozen", "파우더": "Powder", "포장재": "Packaging", "비품": "Equipment" }, ko: { "SAUCE": "소스/양념", "NOODLE": "면류", "RICE CAKE": "떡류", "FROZEN": "냉동식품", "POWDER": "파우더/가루", "PACKAGING": "포장재", "EQUIPMENT": "비품/기기", "GENERAL": "일반/기타" } } };

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
    if (typeof renderHqOrders === 'function') renderHqOrders();
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang]; if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (dict[key]) el.textContent = dict[key]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if (dict[key]) el.placeholder = dict[key]; });
};

function translateDynamic(text, type) {
    if(!text) return text; const tStr = String(text).trim().toUpperCase(); const map = DYNAMIC_I18N[type] && DYNAMIC_I18N[type][currentLang];
    if(map) { for(let key in map) { if(tStr.includes(key.toUpperCase())) return map[key]; } } return text;
}

function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
}

function parseStrictNonNegativeInteger(value) {
    const str = String(value ?? "").trim();
    if (!/^\d+$/.test(str)) return null;
    const num = Number(str);
    if (!Number.isSafeInteger(num) || num < 0) return null;
    return num;
}

function parseStrictDecimal(value) {
    let str = String(value ?? "").trim();
    if (str === "") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^\d+(?:\.\d{1,2})?$/.test(str)) return null;
    const num = Number(str);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
}

function parseStrictISODate(value) {
    const str = String(value ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    const [y, m, d] = str.split("-").map(Number);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return str;
}

function setUploadStatus(html) {
    const el = document.getElementById('uploadStatusText');
    if (el) el.innerHTML = html;
}

const HQ_ORDER_STATUSES = Object.freeze(["HQ_PENDING", "PREPARING", "ORDERED", "SHIPPED", "ARRIVED", "RECEIVED", "COMPLETED", "CANCELED"]);
const HQ_STATUS_LABELS = Object.freeze({ HQ_PENDING: "접수 대기", PREPARING: "준비 중", ORDERED: "발주 완료", SHIPPED: "선적 완료", ARRIVED: "캐나다 입항", RECEIVED: "입고 완료", COMPLETED: "처리 종결", CANCELED: "주문 취소" });

const ADMIN_TAB_ROLES = Object.freeze({ profiles: ["MASTER"], sales: ["MASTER"], inbound: ["MASTER", "VENDOR"], hqorders: ["MASTER", "VENDOR"] });

const userNameDisplay = document.getElementById('userNameDisplay'); if (userNameDisplay) userNameDisplay.textContent = String(clientName || userRole);
const badge = document.getElementById('userRoleBadge'); if(badge) { badge.classList.remove('hidden'); badge.textContent = String(userRole); }
document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); clearY2CSession(); window.location.replace("index.html"); }, { once: true });

const generateIdempotencyKey = () => { 
  if (window.crypto && crypto.randomUUID) return "REQ-" + crypto.randomUUID().toUpperCase();
  if (window.crypto && crypto.getRandomValues) {
      const array = new Uint32Array(4); window.crypto.getRandomValues(array);
      return 'REQ-' + Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').toUpperCase();
  }
  return 'REQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 12).toUpperCase(); 
};

const formatCurrency = (amount) => {
    const num = Number(amount);
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number.isFinite(num) ? num : 0);
};

const formatDate = (isoStr) => { 
    const str = String(isoStr ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split("-").map(Number);
        return new Intl.DateTimeFormat(currentLang === "ko" ? "ko-KR" : "en-CA", { timeZone: "UTC", year: "numeric", month: "short", day: "2-digit" }).format(new Date(Date.UTC(y, m - 1, d)));
    }
    const dt = new Date(str);
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-CA");
};

function clearY2CSession() { [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }); }

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) { 
      container = document.createElement('div'); container.id = 'toastContainer'; 
      container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
      document.body.appendChild(container); 
  }
  if (container.childNodes.length >= 5) container.firstChild.remove();

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]', icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg whitespace-pre-line"></span>`;
  toast.querySelector('.toast-msg').textContent = String(message);
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
      setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
  });

  setTimeout(() => { 
      toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); 
      setTimeout(() => { toast.remove(); if (container && container.childNodes.length === 0) container.remove(); }, 300); 
  }, 3500);
}

window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다. 네트워크를 확인해 주세요.", "error"));
window.addEventListener('online', () => showToast("네트워크가 복구되었습니다.", "success"));

function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    Object.keys(rbacRules).forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id), allowedRoles = rbacRules[id];
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale'); el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>'; el.removeAttribute('href'); 
            const clone = el.cloneNode(true); clone.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast("해당 메뉴는 열람 권한이 없습니다.", "error"); }); el.parentNode.replaceChild(clone, el);
        }
    });
}

function switchAdminTab(tab) {
  if (!ADMIN_TAB_ROLES[tab]) return showToast("존재하지 않는 시스템 메뉴입니다.", "error");
  if (!ADMIN_TAB_ROLES[tab].includes(userRole)) return showToast("이 메뉴에 대한 접근 권한이 없습니다.", "error");

  const tabs = ['profiles', 'sales', 'inbound', 'hqorders'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn_${t}`), sec = document.getElementById(`section_${t}`);
    if(t === tab) {
      if(btn) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-[var(--premium-charcoal)] text-white shadow-sm whitespace-nowrap";
      if(sec) sec.classList.remove('hidden');
    } else {
      if(btn && !btn.classList.contains('cursor-not-allowed')) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-[var(--premium-charcoal)] hover:bg-gray-100 whitespace-nowrap";
      if(sec) sec.classList.add('hidden');
    }
  });
}

let cachedClients = [], cachedHqOrders = [], cachedItems = [], cachedMappings = [], isSubmitting = false; 
const RETRYABLE_ACTIONS = new Set(["get_master_data", "get_sales_records", "get_procurement_data", "get_items", "check_system_alerts", "inventory_integrity_check", "get_recipes"]);

async function executeApi(action, payload = {}, retries = 3) {
  if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다. 연결을 확인하세요.");
  
  const canRetry = RETRYABLE_ACTIONS.has(action);
  const maxAttempts = canRetry ? retries : 0; 
  let lastNetworkError;
  const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

  for (let i = 0; i <= maxAttempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); 
    let response, rawText;
    
    try {
      response = await fetch(CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
        body: JSON.stringify({ ...safePayload, action: action, token: sessionToken }), 
        signal: controller.signal
      });
      
      if (!response.ok) {
          const httpError = new Error(`서버 통신 오류 (HTTP ${response.status})`);
          httpError.httpStatus = response.status;
          throw httpError;
      }
      
      rawText = await response.text();
      clearTimeout(timeoutId); 
    } catch (err) {
      clearTimeout(timeoutId); lastNetworkError = err;
      
      if (err && err.httpStatus) {
          if (err.httpStatus === 429) throw new Error("서버에 요청이 집중되어 지연 중입니다. 잠시 후 다시 시도해주세요. (HTTP 429)");
          if (err.httpStatus === 503) throw new Error("서버가 일시적으로 점검 중이거나 응답할 수 없습니다. (HTTP 503)");
          throw err; 
      }
      if (err.message && err.message.includes("Failed to fetch")) throw new Error("🚨 구글 서버 접근이 차단되었습니다(CORS). 백엔드 배포를 확인하세요.");
      
      if (i < maxAttempts) { await new Promise(res => setTimeout(res, (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800))); continue; }
      throw new Error(lastNetworkError.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (25s)" : "서버 통신 실패. 네트워크 상태를 확인해주세요.");
    }

    if (!rawText) throw new Error("서버로부터 빈 응답이 반환되었습니다.");

    let jsonResult;
    try { 
        jsonResult = JSON.parse(rawText); 
    } catch (parseErr) {
       if (i < maxAttempts) { await new Promise(res => setTimeout(res, (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800))); continue; }
       throw new Error("서버 응답 파싱 실패. 시스템 포맷과 일치하지 않습니다."); 
    }

    if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 형식이 올바르지 않습니다.");

    if (!jsonResult.success) {
      if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) { 
          clearY2CSession(); alert("세션이 만료되었습니다. 다시 로그인해 주세요."); window.location.replace("index.html"); return; 
      }
      
      const err = new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
      err.ledgerPending = jsonResult.ledgerPending === true; 
      err.inventoryCommitted = jsonResult.inventoryCommitted === true; 
      err.txId = jsonResult.txId ? String(jsonResult.txId) : null;
      throw err;
    }
    return jsonResult;
  }
}

async function fetchMasterData() {
  if (userRole === "VENDOR" || userRole === "PARTNER") return; 
  const tableBody = document.getElementById('masterTableBody'); if (!tableBody) return;
  try {
    const result = await executeApi("get_master_data");
    if (result && result.success) {
      tableBody.innerHTML = ''; cachedClients = Array.isArray(result.clients) ? result.clients : [];
      if (cachedClients.length === 0) return tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;
      
      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition-all";
      let chunkIndex = 0; const CHUNK_SIZE = 20;

      function renderChunk() {
          const fragment = document.createDocumentFragment(), endIdx = Math.min(chunkIndex + CHUNK_SIZE, cachedClients.length);
          for (; chunkIndex < endIdx; chunkIndex++) {
              const c = cachedClients[chunkIndex];
              const safeRowIdx = Number(c.rowIdx);
              if (!Number.isSafeInteger(safeRowIdx) || safeRowIdx < 1) continue; 

              const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors duration-200";
              tr.innerHTML = `
                <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${escapeHtml(c.name)}</td>
                <td class="px-3 py-4 text-center"><input type="text" id="state_${safeRowIdx}" value="${escapeHtml(c.state || '')}" class="${inputClass} text-center uppercase" maxlength="2" placeholder="ON"></td>
                <td class="px-3 py-4"><input type="text" id="city_${safeRowIdx}" value="${escapeHtml(c.city || '')}" class="${inputClass}" placeholder="City"></td>
                <td class="px-3 py-4"><input type="text" id="addr_${safeRowIdx}" value="${escapeHtml(c.address || '')}" class="${inputClass}" placeholder="Full Address"></td>
                <td class="px-3 py-4"><input type="text" id="attn_${safeRowIdx}" value="${escapeHtml(c.attn || '')}" class="${inputClass}" placeholder="Manager Name"></td>
                <td class="px-3 py-4"><input type="email" id="email_${safeRowIdx}" value="${escapeHtml(c.email || '')}" class="${inputClass}" placeholder="Email"></td>
                <td class="px-3 py-4"><input type="text" id="biz_${safeRowIdx}" value="${escapeHtml(c.bizId || '')}" class="${inputClass} font-mono" placeholder="Business ID"></td>
                <td class="px-5 py-4 text-center bg-gray-50 border-l border-gray-100"><button id="saveBtn_${safeRowIdx}" type="button" class="bg-[var(--premium-charcoal)] hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-[11px] tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed">SAVE</button></td>
              `;
              fragment.appendChild(tr);
              const saveBtn = tr.querySelector(`#saveBtn_${CSS.escape(String(safeRowIdx))}`);
              if (saveBtn) saveBtn.addEventListener('click', () => saveClientData(safeRowIdx));
          }
          tableBody.appendChild(fragment);
          if (chunkIndex < cachedClients.length) { requestAnimationFrame(renderChunk); } else { populateSalesClientSelector(); }
      }
      renderChunk();
    } 
  } catch (err) { tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">데이터 로드 실패: ${escapeHtml(err.message)}</td></tr>`; }
}

async function saveClientData(rowIdx) {
  if (isSubmitting) return; 
  const safeRowIdx = Number(rowIdx);
  if (!Number.isSafeInteger(safeRowIdx) || safeRowIdx < 1) return;

  const stateEl = document.getElementById(`state_${safeRowIdx}`), cityEl = document.getElementById(`city_${safeRowIdx}`), addrEl = document.getElementById(`addr_${safeRowIdx}`);
  const attnEl = document.getElementById(`attn_${safeRowIdx}`), emailEl = document.getElementById(`email_${safeRowIdx}`), bizEl = document.getElementById(`biz_${safeRowIdx}`);

  if (!stateEl || !cityEl || !addrEl || !attnEl || !emailEl || !bizEl) return showToast("가맹점 입력 요소를 찾을 수 없습니다.", "error");

  const emailVal = emailEl.value.trim();
  if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { emailEl.focus(); return showToast("유효한 이메일 형식이 아닙니다.", "error"); }

  isSubmitting = true;
  const saveBtn = document.getElementById(`saveBtn_${safeRowIdx}`); let originalText = "SAVE";
  if (saveBtn) { originalText = saveBtn.textContent; saveBtn.disabled = true; saveBtn.textContent = "⏳ SAVING..."; saveBtn.classList.add('animate-pulse'); }
  
  const payload = { rowIdx: safeRowIdx, state: stateEl.value.toUpperCase().trim(), city: cityEl.value.trim(), address: addrEl.value.trim(), attn: attnEl.value.trim(), email: emailVal, bizId: bizEl.value.trim() };

  try {
    const result = await executeApi("update_master_data", { client: payload });
    if (result && result.success) {
      if(saveBtn) { saveBtn.textContent = "✅ SAVED"; saveBtn.classList.remove('animate-pulse'); saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); }
      showToast("마스터 데이터 저장 완료", "success"); setTimeout(() => fetchMasterData(), 1500); 
    }
  } catch (err) { 
      showToast(err.message, "error"); 
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalText; saveBtn.classList.remove('animate-pulse'); } 
  } finally { isSubmitting = false; }
}

const monthNames = ["Jan (1월)", "Feb (2월)", "Mar (3월)", "Apr (4월)", "May (5월)", "Jun (6월)", "Jul (7월)", "Aug (8월)", "Sep (9월)", "Oct (10월)", "Nov (11월)", "Dec (12월)"];

function populateSalesYearSelector() {
  const yearSelect = document.getElementById('salesYearSelector'); if (!yearSelect) return; yearSelect.innerHTML = ''; const currentYear = new Date().getFullYear();
  for (let y = currentYear + 2; y >= 2022; y--) { const opt = document.createElement('option'); opt.value = y; opt.textContent = `${y} Fiscal Year`; if (y === currentYear) opt.selected = true; yearSelect.appendChild(opt); }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector'); if (!clientSelect || cachedClients.length === 0) return;
  clientSelect.innerHTML = `<option value="">-- Select Franchise --</option>`;
  cachedClients.forEach(c => { const opt = document.createElement('option'); opt.value = String(c.name || ""); opt.textContent = String(c.name || ""); clientSelect.appendChild(opt); });
}

async function loadSalesGrid() {
  const targetYear = document.getElementById('salesYearSelector')?.value, targetClient = document.getElementById('salesClientSelector')?.value, tbody = document.getElementById('salesGridBody');
  if (!targetYear || !targetClient || !tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 font-bold tracking-wide"><span class="animate-pulse">🔄 동기화 중...</span></td></tr>`;
  try {
    const result = await executeApi("get_sales_records", { year: targetYear, clientName: targetClient });
    if (result && result.success) renderSalesGrid(result.records);
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-[#E84C60] font-black py-8">데이터 로드 실패: ${escapeHtml(err.message)}</td></tr>`; }
}

function renderSalesGrid(records) {
  const tbody = document.getElementById('salesGridBody'); if (!tbody) return; tbody.innerHTML = '';
  if(!Array.isArray(records)) return;

  const inputStyle = "w-full max-w-[170px] mx-auto bg-white border border-gray-200 rounded-xl px-3 py-2 text-center text-[13px] font-mono font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition";

  records.forEach(r => {
    const mIdx = Number(r.month);
    if (!Number.isInteger(mIdx) || mIdx < 1 || mIdx > 12) return;

    const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors";
    const badgeHTML = r.exists ? `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">SAVED</span>` : `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-gray-100 text-gray-400 border border-gray-200">EMPTY</span>`;
    
    tr.innerHTML = `
      <td class="px-6 py-3 font-black text-gray-700 text-xs sm:text-sm whitespace-nowrap">${monthNames[mIdx - 1]}</td>
      <td class="px-6 py-3 text-center"><input type="text" data-month="${mIdx}" value="${r.pos > 0 ? escapeHtml(r.pos) : ''}" placeholder="0.00" class="sales-input-pos ${inputStyle}"></td>
      <td class="px-6 py-3 text-center"><input type="text" data-month="${mIdx}" value="${r.delivery > 0 ? escapeHtml(r.delivery) : ''}" placeholder="0.00" class="sales-input-del ${inputStyle}"></td>
      <td class="px-6 py-3 text-right font-black font-mono text-[var(--premium-charcoal)] text-sm whitespace-nowrap" id="rowTotal_${mIdx}">${formatCurrency(r.total)}</td>
      <td class="px-6 py-3 text-center whitespace-nowrap">${badgeHTML}</td>
    `;
    tbody.appendChild(tr);

    const posInput = tr.querySelector('.sales-input-pos'), delInput = tr.querySelector('.sales-input-del');
    if(posInput) posInput.addEventListener('input', () => recalcSalesRow(mIdx));
    if(delInput) delInput.addEventListener('input', () => recalcSalesRow(mIdx));
  });
  recalculateKpis();
}

function recalcSalesRow(month) {
  const posInput = document.querySelector(`.sales-input-pos[data-month="${month}"]`), delInput = document.querySelector(`.sales-input-del[data-month="${month}"]`);
  let p = parseStrictDecimal(posInput?.value) || 0, d = parseStrictDecimal(delInput?.value) || 0; 
  const totalDisplay = document.getElementById(`rowTotal_${month}`); if (totalDisplay) totalDisplay.textContent = formatCurrency(p + d);
  recalculateKpis();
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    totPos += parseStrictDecimal(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value) || 0;
    totDel += parseStrictDecimal(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value) || 0;
  }
  totAnnual = totPos + totDel;
  const tTotal = document.getElementById('salesKpiTotal'), tPos = document.getElementById('salesKpiPos'), tDel = document.getElementById('salesKpiDelivery');
  if (tTotal) tTotal.textContent = formatCurrency(totAnnual);
  if (tPos) tPos.textContent = formatCurrency(totPos);
  if (tDel) tDel.textContent = formatCurrency(totDel);
}

async function saveSalesGridData() {
  if (isSubmitting) return; 

  const yearEl = document.getElementById('salesYearSelector'), clientEl = document.getElementById('salesClientSelector');
  if (!yearEl || !clientEl) return showToast("매출 입력 요소를 찾을 수 없습니다.", "error");

  const targetYear = yearEl.value, targetClient = clientEl.value;
  if (!targetYear || !targetClient) return showToast("가맹점과 연도를 선택해 주세요.", "error");

  const recordsToSave = [];
  for (let m = 1; m <= 12; m++) {
    const pos = parseStrictDecimal(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value);
    const delivery = parseStrictDecimal(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value);
    if (pos === null || delivery === null) return showToast(`${m}월 매출 금액 형식이 올바르지 않습니다. (소수점 2자리까지만 허용)`, "error");
    recordsToSave.push({ month: m, pos: pos, delivery: delivery });
  }

  isSubmitting = true; const btn = document.getElementById('saveAllSalesBtn'); let originalHtml = "SAVE DATA";
  if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SYNCHRONIZING...</span>`; }
  
  try {
    const result = await executeApi("save_sales_records", { year: targetYear, clientName: targetClient, records: recordsToSave });
    if (result && result.success) { showToast(result.message, "success"); setTimeout(() => loadSalesGrid(), 1000); }
  } catch (err) { showToast("매출 저장 실패: " + err.message, "error"); } finally { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; } isSubmitting = false; }
}

function renderOrderMetrics(metrics) {
  if(!metrics) return; const table = document.getElementById('hqOrdersGridBody')?.closest('table'); if(!table || !table.parentNode) return;

  let kpiContainer = document.getElementById('y2cOrderMetrics');
  if (!kpiContainer) {
    kpiContainer = document.createElement('div'); kpiContainer.id = 'y2cOrderMetrics'; kpiContainer.className = userRole === "MASTER" ? 'grid grid-cols-2 gap-4 sm:gap-6 mb-8' : 'grid grid-cols-1 gap-4 sm:gap-6 mb-8';
    table.parentNode.insertBefore(kpiContainer, table);
    
    if (userRole === "MASTER") {
        const scanBtn = document.createElement('button'); 
        scanBtn.id = "sysHealthScanBtn"; 
        scanBtn.innerHTML = '<span data-i18n="sys_health_scan">🛡️ SYSTEM HEALTH SCAN</span>';
        scanBtn.className = "w-full col-span-2 bg-[var(--premium-charcoal)] hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 tracking-[0.2em] mb-4";
        table.parentNode.insertBefore(scanBtn, kpiContainer);
        scanBtn.addEventListener('click', runSystemAlertScan); 
    }
  }
  
  const tQty = Number(metrics.totalQty); const safeTotalQty = Number.isFinite(tQty) ? tQty : 0;
  const tAmt = Number(metrics.totalAmount); const safeTotalAmount = Number.isFinite(tAmt) ? tAmt : 0;

  let expenditureHtml = '';
  if (userRole === "MASTER") {
      expenditureHtml = `
        <div class="bg-gradient-to-br from-[#E84C60] to-[#C23347] border border-[#E84C60]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div class="flex items-center gap-3 mb-2 relative z-10"><div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">💳</div><p class="text-[11px] font-black text-red-100 uppercase tracking-widest" data-i18n="b2b_expenditure">Total B2B Expenditure</p></div>
          <h3 class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tighter relative z-10">${formatCurrency(safeTotalAmount)}</h3>
        </div>`;
  }

  kpiContainer.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">📦</div><p class="text-[11px] font-black text-gray-500 uppercase tracking-widest" data-i18n="b2b_volume">Total B2B Volume</p></div>
      <h3 class="text-2xl sm:text-3xl font-black text-[var(--premium-charcoal)] font-mono tracking-tighter">${safeTotalQty.toLocaleString()} <span class="text-xs text-gray-400 font-bold ml-1">Units</span></h3>
    </div> ${expenditureHtml}`;
  if (window.applyTranslations) window.applyTranslations();
}

async function runSystemAlertScan(event) {
  if (isSubmitting) return;
  const btn = event?.currentTarget || document.getElementById('sysHealthScanBtn');
  if(!btn) return showToast("시스템 스캔 버튼을 찾을 수 없습니다.", "error"); 
  
  isSubmitting = true;
  const originalText = btn.innerHTML; 
  btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ DEEP SCANNING...</span>`;
  try {
    const result = await executeApi("check_system_alerts");
    const integResult = await executeApi("inventory_integrity_check");
    if (result && result.success && integResult && integResult.success) { 
        showToast("스캔 완료. 시스템 리포트가 발송되었습니다.", "success"); 
        displayAlertModal(result.alerts, integResult.discrepancies); 
    }
  } catch (err) { showToast("스캔 실패: " + err.message, "error"); } finally { btn.disabled = false; btn.innerHTML = originalText; isSubmitting = false; }
}

function displayAlertModal(alerts, discrepancies) {
  alerts = (alerts && typeof alerts === "object" && !Array.isArray(alerts)) ? alerts : {};
  alerts.lowStock = Array.isArray(alerts.lowStock) ? alerts.lowStock : [];
  alerts.expiring = Array.isArray(alerts.expiring) ? alerts.expiring : [];
  discrepancies = Array.isArray(discrepancies) ? discrepancies : [];

  let modal = document.getElementById('alertModal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'alertModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
    document.body.appendChild(modal);
  }
  
  let html = `<div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl transform transition-transform scale-95 duration-300" id="alertModalContent">`;
  html += `<div class="bg-[var(--premium-charcoal)] p-6 text-white flex justify-between items-center"><h2 class="text-xl font-black tracking-widest">🛡️ SYSTEM HEALTH REPORT</h2><button id="alertModalCloseTop" class="text-gray-400 hover:text-white font-bold text-xl" type="button">&times;</button></div><div class="p-6 max-h-[70vh] overflow-y-auto hide-scrollbar">`;
  
  let hasIssues = false;

  if (discrepancies.length > 0) {
      hasIssues = true;
      html += `<h3 class="font-black text-purple-600 mb-3 flex items-center gap-2"><span>🔍</span> Integrity Discrepancies (${discrepancies.length})</h3><div class="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6"><ul class="space-y-2">`;
      discrepancies.forEach(d => {
          html += `<li class="flex flex-col text-[13px] border-b border-purple-100 pb-3"><div class="flex justify-between items-center mb-1"><span class="font-bold text-gray-800">[${escapeHtml(d.region)}] ${escapeHtml(d.name)} <span class="text-gray-400 font-normal ml-1">(${escapeHtml(d.code)})</span></span><span class="font-black text-purple-600 bg-white px-2 py-1 rounded shadow-sm">${escapeHtml(d.issue)}</span></div><div class="flex items-center gap-3 text-[11px] font-mono"><span class="text-gray-500">System Stock: <b class="${typeof d.system_stock === 'number' && d.system_stock < 0 ? 'text-red-500' : 'text-gray-800'}">${escapeHtml(d.system_stock)}</b></span><span class="text-gray-500">Batch Stock: <b class="text-gray-800">${escapeHtml(d.batch_stock)}</b></span><span class="text-gray-500">Diff: <b class="text-purple-600">${escapeHtml(d.difference)}</b></span></div></li>`;
      });
      html += `</ul></div>`;
  }

  if (alerts.lowStock.length > 0) {
      hasIssues = true;
      html += `<h3 class="font-black text-[#E84C60] mb-3 flex items-center gap-2"><span>🚨</span> Low Stock Alert (${alerts.lowStock.length})</h3><div class="bg-red-50 border border-red-100 rounded-xl p-4 mb-6"><ul class="space-y-2">`;
      alerts.lowStock.forEach(item => { html += `<li class="flex justify-between items-center text-[13px] border-b border-red-100 pb-2"><span class="font-bold text-gray-800">[${escapeHtml(item.region)}] ${escapeHtml(item.name)}</span><span class="font-black text-[#E84C60] bg-white px-2 py-1 rounded shadow-sm">${escapeHtml(item.stock)}</span></li>`; });
      html += `</ul></div>`;
  }

  if (alerts.expiring.length > 0) {
      hasIssues = true;
      html += `<h3 class="font-black text-amber-600 mb-3 flex items-center gap-2"><span>⏳</span> Expiration Alert (${alerts.expiring.length})</h3><div class="bg-amber-50 border border-amber-100 rounded-xl p-4"><ul class="space-y-2">`;
      alerts.expiring.forEach(item => {
        let badge = item.daysLeft < 0 ? "기한 초과" : `D-${item.daysLeft}`, textCol = item.daysLeft < 0 ? "text-[#E84C60]" : "text-amber-600";
        html += `<li class="flex justify-between items-center text-[13px] border-b border-amber-100 pb-2"><span class="font-bold text-gray-800">[${escapeHtml(item.region)}] ${escapeHtml(item.name)}</span><div class="flex items-center gap-3"><span class="font-black ${textCol}">${escapeHtml(item.date)} (${badge})</span><span class="font-bold text-gray-500">Qty: ${escapeHtml(item.qty)}</span></div></li>`;
      });
      html += `</ul></div>`;
  }

  if (!hasIssues) { html += `<div class="text-center py-10"><span class="text-4xl">✅</span><p class="mt-4 font-bold text-gray-500">모든 데이터 무결성, 재고, 유통기한이 완벽하게 안정적입니다.</p></div>`; }

  html += `</div><div class="p-4 bg-gray-50 border-t border-gray-100 text-center"><button id="alertModalCloseBottom" type="button" class="bg-[#E84C60] text-white px-8 py-2.5 rounded-xl font-black shadow-md hover:bg-black transition-colors uppercase tracking-widest text-[11px]">Close Report</button></div></div>`;
  modal.innerHTML = html; 
  
  modal.querySelector('#alertModalCloseTop')?.addEventListener('click', closeAlertModal);
  modal.querySelector('#alertModalCloseBottom')?.addEventListener('click', closeAlertModal);
  
  modal.addEventListener('click', (e) => { if(e.target === modal) closeAlertModal(); });
  window.addEventListener('keydown', handleAlertEsc);

  modal.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => document.getElementById('alertModalContent')?.classList.remove('scale-95'), 50);
}

function handleAlertEsc(e) { if(e.key === "Escape") closeAlertModal(); }

function closeAlertModal() {
  const modal = document.getElementById('alertModal'), content = document.getElementById('alertModalContent');
  if (!modal) return;
  if (content) content.classList.add('scale-95'); 
  modal.classList.add('opacity-0', 'pointer-events-none'); 
  window.removeEventListener('keydown', handleAlertEsc);
}

function renderHqOrdersError(msg) {
    const tbody = document.getElementById('hqOrdersGridBody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#E84C60] font-bold tracking-wide">Error: ${escapeHtml(msg)}</td></tr>`;
}

async function fetchMappings() {
  try {
    const result = await executeApi("get_procurement_data");
    if (result && result.success) {
      cachedMappings = Array.isArray(result.mappings) ? result.mappings : []; 
      cachedHqOrders = Array.isArray(result.hqOrders) ? result.hqOrders : [];
      renderHqOrders(); 
      if(result.orderMetrics) renderOrderMetrics(result.orderMetrics);
    } 
  } catch (err) { 
      cachedMappings = []; cachedHqOrders = []; 
      renderHqOrdersError(err.message); showToast("조달 데이터 로드 실패: " + err.message, "error"); 
  }
}

async function fetchCatalogForInbound() {
  try {
    const result = await executeApi("get_items", { clientState: "DEFAULT" });
    if (result && result.success) { cachedItems = Array.isArray(result.items || result.data) ? (result.items || result.data) : []; }
  } catch (e) { console.error("Catalog load failed", e); cachedItems = []; }
}

const hqStatusInFlight = new Set();

function renderHqOrders() {
  const tbody = document.getElementById('hqOrdersGridBody'); if(!tbody) return; tbody.innerHTML = '';
  if(cachedHqOrders.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 내역이 없습니다.</td></tr>`; return; }

  const sortedOrders = [...cachedHqOrders].sort((a,b) => new Date(b.date) - new Date(a.date));
  let chunkIndex = 0; const CHUNK_SIZE = 30;

  function renderChunk() {
      const fragment = document.createDocumentFragment(), endIdx = Math.min(chunkIndex + CHUNK_SIZE, sortedOrders.length);
      for (; chunkIndex < endIdx; chunkIndex++) {
          const o = sortedOrders[chunkIndex];
          
          let statusClass = "bg-gray-100 text-gray-500";
          switch(o.status) {
              case "HQ_PENDING": statusClass = "bg-purple-100 text-purple-700 border-purple-200"; break;
              case "PREPARING": statusClass = "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200"; break;
              case "ORDERED": statusClass = "bg-indigo-100 text-indigo-700 border-indigo-200"; break;
              case "SHIPPED": statusClass = "bg-blue-100 text-blue-700 border-blue-200"; break;
              case "ARRIVED": statusClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
              case "RECEIVED": statusClass = "bg-teal-100 text-teal-700 border-teal-200"; break;
              case "COMPLETED": statusClass = "bg-gray-200 text-gray-800 border-gray-300"; break;
              case "CANCELED": statusClass = "bg-red-100 text-red-700 border-red-200 line-through"; break;
          }

          const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors border-b border-gray-100";
          tr.innerHTML = `
            <td class="px-5 py-4 font-mono text-[11px] font-black text-gray-500">${escapeHtml(o.id)}</td>
            <td class="px-5 py-4 text-[12px] font-bold text-[var(--premium-charcoal)]">${formatDate(o.date)}</td>
            <td class="px-5 py-4 text-[12px] font-black text-[#E84C60]">${escapeHtml(o.vendor)}</td>
            <td class="px-5 py-4 text-[11px] font-bold text-gray-600">${escapeHtml(o.region)}</td>
            <td class="px-5 py-4 text-[12px] font-medium text-gray-700 max-w-[200px] truncate" title="${escapeHtml(o.items)}">${escapeHtml(o.items)}</td>
            <td class="px-5 py-4 text-[12px] font-mono font-bold text-gray-800">${escapeHtml(o.eta)}</td>
            <td class="px-5 py-4 text-center hq-status-cell"></td>
          `;
          
          const select = document.createElement('select');
          select.className = `text-[10px] font-black rounded border p-1.5 outline-none shadow-sm transition-colors cursor-pointer ${statusClass}`;
          
          if (!HQ_ORDER_STATUSES.includes(o.status)) {
              const invalidOpt = document.createElement('option');
              invalidOpt.value = o.status; invalidOpt.textContent = `INVALID (${escapeHtml(o.status)})`;
              invalidOpt.selected = true; invalidOpt.disabled = true;
              select.appendChild(invalidOpt); select.disabled = true; 
          } else {
              HQ_ORDER_STATUSES.forEach(status => {
                  const option = document.createElement('option');
                  option.value = status; option.textContent = HQ_STATUS_LABELS[status] || status; 
                  if (o.status === status) option.selected = true;
                  select.appendChild(option);
              });
          }
          
          select.addEventListener('change', async () => { 
              const orderId = String(o.id || "");
              if (hqStatusInFlight.has(orderId)) { select.value = o.status; return showToast("상태 변경이 이미 진행 중입니다.", "error"); }
              hqStatusInFlight.add(orderId); select.disabled = true;
              try { await updateHqOrderStatus(orderId, select.value); } 
              finally { hqStatusInFlight.delete(orderId); select.disabled = false; }
          });
          
          tr.querySelector('.hq-status-cell').appendChild(select); fragment.appendChild(tr);
      }
      tbody.appendChild(fragment);
      if (chunkIndex < sortedOrders.length) requestAnimationFrame(renderChunk);
  }
  renderChunk();
}

let hqCartData = Object.create(null); 
let cartSearchTimeout = null;

window.openHqOrderCartModal = async function() {
    if(cachedItems.length === 0) {
        showToast("백엔드와 데이터를 동기화 중입니다. 잠시만 기다려주세요...", "success");
        await fetchCatalogForInbound();
        if(cachedItems.length === 0) return showToast("🚨 구글 서버 접근이 차단되었습니다(CORS). 배포 권한 설정을 확인하세요.", "error");
    }

    let modal = document.getElementById('hqCartModal');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'hqCartModal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        document.body.appendChild(modal);
    }

    let itemsHtml = '';
    cachedItems.forEach(item => {
        const safeCode = String(item.code || "").trim(), safeName = String(item.name || "").trim();
        const translatedCat = translateDynamic(item.category, 'category');
        const currentQty = hqCartData[safeCode] || "";
        
        itemsHtml += `
            <div class="hq-cart-item-row flex justify-between items-center p-3 border-b border-gray-100 hover:bg-pink-50 transition-colors" data-name="${escapeHtml(safeName.toLowerCase())}">
                <div class="flex flex-col">
                    <span class="text-xs font-black text-gray-800">${escapeHtml(safeName)}</span>
                    <span class="text-[10px] font-mono text-gray-500">[${escapeHtml(safeCode)}] ${escapeHtml(translatedCat)}</span>
                </div>
                <input type="number" min="0" data-code="${escapeHtml(safeCode)}" data-name="${escapeHtml(safeName)}" value="${escapeHtml(currentQty)}" placeholder="0" class="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm font-bold text-[#E84C60] focus:border-[#E84C60] outline-none shadow-inner bg-white">
            </div>`;
    });

    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transform transition-transform scale-95 duration-300" id="hqCartModalContent">
            <div class="bg-[var(--premium-charcoal)] p-5 text-white flex justify-between items-center"><h2 class="text-lg font-black tracking-widest uppercase flex items-center gap-2"><span>🛒</span> Digital Procurement Cart</h2><button id="hqCartCloseTopBtn" class="text-gray-400 hover:text-white font-bold text-2xl" type="button">&times;</button></div>
            <div class="p-3 bg-gray-50 border-b border-gray-200"><input type="text" id="hqCartSearchInput" placeholder="Search item name..." class="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:border-[#E84C60] outline-none font-bold"></div>
            <div class="p-2 overflow-y-auto flex-grow hide-scrollbar">${itemsHtml}</div>
            <div class="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"><span class="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Enter Quantity & Confirm</span><button id="hqCartConfirmBtn" type="button" class="bg-[#E84C60] text-white px-8 py-2.5 rounded-xl font-black shadow-md hover:bg-black transition-colors uppercase tracking-widest text-[11px]">Apply to Order</button></div>
        </div>`;

    modal.querySelector('#hqCartCloseTopBtn')?.addEventListener('click', closeHqCartModal);
    
    modal.querySelector('#hqCartSearchInput')?.addEventListener('input', (e) => {
        clearTimeout(cartSearchTimeout);
        cartSearchTimeout = setTimeout(() => filterHqCart(e.target.value), 200);
    });
    
    modal.querySelector('#hqCartConfirmBtn')?.addEventListener('click', confirmHqCart);
    modal.addEventListener('click', (e) => { if(e.target === modal) closeHqCartModal(); });
    window.addEventListener('keydown', handleCartEsc);

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => document.getElementById('hqCartModalContent')?.classList.remove('scale-95'), 50);
}

function handleCartEsc(e) { if(e.key === "Escape") closeHqCartModal(); }

function closeHqCartModal() {
    const modal = document.getElementById('hqCartModal'), content = document.getElementById('hqCartModalContent');
    if (!modal) return;
    if (content) content.classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');
    window.removeEventListener('keydown', handleCartEsc);
}

function filterHqCart(query) {
    const term = String(query ?? "").trim().toLowerCase();
    document.querySelectorAll('.hq-cart-item-row').forEach(row => { 
        const name = String(row.getAttribute('data-name') || "");
        row.style.display = name.includes(term) ? 'flex' : 'none'; 
    });
}

function confirmHqCart() {
    const inputs = document.querySelectorAll('.hq-cart-item-row input[type="number"]'); 
    hqCartData = Object.create(null); let formattedStrings = [];

    for (const input of inputs) {
        const raw = String(input.value ?? "").trim();
        if (raw === "") continue;

        const qty = parseStrictNonNegativeInteger(raw); 
        if (qty === null) { 
            const name = input.getAttribute('data-name') || "Unknown Item";
            showToast(`[${name}] 수량은 0 이상의 정수만 입력할 수 있습니다.`, "error");
            input.focus(); return; 
        }
        
        if (qty > 0) { 
            const code = input.getAttribute('data-code') || "", name = input.getAttribute('data-name') || "";
            hqCartData[code] = qty; formattedStrings.push(`[${code}] ${name} x ${qty}`); 
        }
    }
    
    const itemsInput = document.getElementById('hqItemsInput');
    if (itemsInput) {
        itemsInput.value = formattedStrings.join(' / ');
        if (formattedStrings.length > 0) { showToast(`${formattedStrings.length}개의 품목이 전산화되어 카트에 담겼습니다.`, "success"); } else { itemsInput.value = ''; }
    }
    closeHqCartModal();
}

function transformHqInputsToDigital() {
    const regionInput = document.getElementById('hqRegionInput');
    if (regionInput && regionInput.tagName === 'INPUT') {
        const select = document.createElement('select'); select.id = 'hqRegionInput';
        select.className = "w-full text-xs p-2 border border-gray-300 rounded focus:border-[#E84C60] outline-none text-center cursor-pointer font-bold text-gray-700";
        select.innerHTML = '<option value="">-- Hub --</option><option value="ON">ON (Ontario)</option><option value="BC">BC (British Columbia)</option><option value="AB">AB (Alberta)</option>';
        regionInput.parentNode.replaceChild(select, regionInput);
    }
    const itemsInput = document.getElementById('hqItemsInput');
    if (itemsInput && !itemsInput.dataset.digitalized) { 
        itemsInput.readOnly = true; 
        itemsInput.classList.add('cursor-pointer', 'bg-pink-50', 'text-[#E84C60]', 'font-bold', 'hover:border-[#E84C60]', 'transition-colors'); 
        itemsInput.addEventListener('click', window.openHqOrderCartModal); 
        itemsInput.dataset.digitalized = "true";
    }
}

window.saveHqOrder = async function() {
  if (isSubmitting) return;
  const vendorInput = document.getElementById('hqVendorInput'), regionEl = document.getElementById('hqRegionInput'), itemsEl = document.getElementById('hqItemsInput');
  
  if(!regionEl || !itemsEl) return showToast("품목 및 허브 요소를 찾을 수 없습니다. 시스템 오류", "error");

  const vendorName = vendorInput ? vendorInput.value.trim() : clientName, region = regionEl.value.toUpperCase().trim(), items = itemsEl.value.trim();
  if(!vendorName || !region || !items) return showToast("모든 발주 정보를 기입해 주세요.", "error");
  if(vendorName.length > 50) return showToast("벤더사명이 너무 깁니다.", "error");

  isSubmitting = true; const btn = document.getElementById('btnSubmitHqOrder'); let originalHtml = "ADD";
  if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`; }

  const uniqueBatchId = generateIdempotencyKey();
  const localDate = new Date(), yyyy = localDate.getFullYear(), mm = String(localDate.getMonth() + 1).padStart(2, '0'), dd = String(localDate.getDate()).padStart(2, '0');
  const payload = { id: uniqueBatchId, date: `${yyyy}-${mm}-${dd}`, vendor: vendorName, region: region, items: items, status: "HQ_PENDING", eta: "-" };
  
  try {
    const result = await executeApi("upsert_hq_order", { order: payload });
    if (result && result.success) { showToast("발주가 본사 전산에 등록되었습니다.", "success"); document.getElementById('hqItemsInput').value = ''; hqCartData = Object.create(null); fetchMappings(); }
  } catch (err) { showToast("등록 실패: " + err.message, "error"); } finally { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; } isSubmitting = false; }
}

window.updateHqOrderStatus = async function(orderId, status) {
  const safeOrderId = String(orderId || "").trim(), safeStatus = String(status || "").trim().toUpperCase();
  if (!safeOrderId) return showToast("주문 번호가 없습니다.", "error");
  if (!HQ_ORDER_STATUSES.includes(safeStatus)) return showToast("허용되지 않은 주문 상태입니다.", "error");

  try {
    const result = await executeApi("update_hq_order_status", { orderId: safeOrderId, status: safeStatus }); 
    if (result && result.success) { showToast(`Order ${safeOrderId} status updated`, "success"); fetchMappings(); }
  } catch (err) { showToast(err.message, "error"); fetchMappings(); }
}

async function loadHeavyLibrary(url, objName, integrity = null) {
    if (window[objName] !== undefined) return true;
    return new Promise((resolve, reject) => { 
        const script = document.createElement('script'); script.src = url; 
        if(integrity) { script.integrity = integrity; script.crossOrigin = "anonymous"; }
        script.onload = () => resolve(true); script.onerror = () => reject(false); 
        document.head.appendChild(script); 
    });
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone'); if(!dropZone) return;
  
  const regionSelector = document.getElementById('inboundRegionSelector');
  if (regionSelector && !document.getElementById('linkedHqOrderId')) {
      const input = document.createElement('input');
      input.type = 'text'; input.id = 'linkedHqOrderId';
      input.placeholder = "Link HQ Order ID (Optional, e.g. REQ-...)";
      input.className = "w-full text-xs p-2.5 mt-3 border border-gray-300 rounded-lg focus:border-[#E84C60] outline-none font-bold text-gray-700 shadow-sm transition-colors";
      regionSelector.parentNode.insertBefore(input, regionSelector.nextSibling);
  }

  dropZone.removeEventListener('dragover', null); dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-pink-50/50', 'border-[#E84C60]'); });
  dropZone.removeEventListener('dragleave', null); dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); });
  dropZone.removeEventListener('drop', null); dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); handleExcelUpload(e); });
  const fileInput = document.getElementById('excelFileInput'); if(fileInput) fileInput.addEventListener('change', handleExcelUpload);
}

async function handleExcelUpload(event) {
  event.preventDefault();
  if (isSubmitting) return showToast("현재 데이터를 서버로 전송 중입니다. 잠시 기다려주세요.", "error");

  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) return showToast("파일 크기가 너무 큽니다. (최대 10MB 지원)", "error");

  isSubmitting = true;
  const validExcelExts = [".xlsx", ".xls", ".csv"], validImgExts = [".png", ".jpg", ".jpeg"], fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (validExcelExts.includes(fileExt)) {
    setUploadStatus(`<span class="animate-pulse text-[#E84C60] font-bold">Loading Excel Engine...</span>`);
    try { await loadHeavyLibrary("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "XLSX"); } 
    catch(e) { isSubmitting = false; return showToast("엑셀 엔진 로드 실패. 네트워크를 확인하세요.", "error"); }

    setUploadStatus(`<span class="animate-pulse text-[#E84C60] font-bold">Parsing Excel Document...</span>`);
    const reader = new FileReader();
    
    reader.onerror = () => { isSubmitting = false; setUploadStatus("Drag & Drop vendor document here"); showToast("파일을 읽는 중 시스템 오류가 발생했습니다.", "error"); };
    reader.onload = async function(e) {
      try {
        const data = new Uint8Array(e.target.result), workbook = XLSX.read(data, {type: 'array'}), worksheet = workbook.Sheets[workbook.SheetNames[0]], jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
        if (jsonData.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다."); 
        await processExcelData(jsonData, file.name);
      } catch(err) { isSubmitting = false; showToast("엑셀 파싱 오류: " + err.message, "error"); setUploadStatus("Drag & Drop vendor document here"); }
    };
    reader.readAsArrayBuffer(file);
  } 
  else if (validImgExts.includes(fileExt)) {
    setUploadStatus(`<span class="animate-pulse text-indigo-500 font-bold">Loading AI OCR Engine...</span>`);
    try { await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js", "Tesseract"); } 
    catch(e) { isSubmitting = false; return showToast("AI 엔진 로드 실패. 네트워크를 확인하세요.", "error"); }

    setUploadStatus(`<span class="animate-pulse text-indigo-500 font-bold">AI Vision OCR Scanning...</span>`);
    try {
      const result = await Tesseract.recognize(file, 'eng+kor', { logger: m => { if (m.status === 'recognizing text') { const pct = Math.floor(m.progress * 100); setUploadStatus(`<span class="text-indigo-500 font-bold">AI Vision Parsing: ${pct}%</span>`); } } });
      await processOCRText(result.data.text, file.name);
    } catch(err) { isSubmitting = false; showToast("이미지 인식 실패: " + err.message, "error"); setUploadStatus("Drag & Drop vendor document here"); }
  } else { 
      isSubmitting = false; return showToast("지원하지 않는 포맷입니다. (.xlsx, .xls, .csv, .jpg, .jpeg, .png 지원)", "error"); 
  }
}

async function processOCRText(text, filename) {
  const safeText = String(text || ""); const lines = safeText.split('\n'), jsonData = [];
  lines.forEach(line => {
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/), expDate = dateMatch ? dateMatch[0] : "";
    const barcodeMatch = line.match(/\b\d{13,14}\b/), codeMatch = line.match(/\b[A-Z0-9]{5,15}\b/);
    const itemCode = (codeMatch ? codeMatch[0] : (barcodeMatch ? barcodeMatch[0] : ""));
    let cleanLine = line.replace(/\b\d+(\.\d+)?[KkGgLlMmCc]+\*\d+\b/g, '').replace(/,/g, '');
    let nums = cleanLine.match(/\b\d+\b/g), qty = 0;
    
    if (nums && nums.length > 0) {
      for(let i = nums.length - 1; i >= 0; i--) { 
          const n = parseStrictNonNegativeInteger(nums[i]); 
          if(n !== null && n < 10000 && String(n) !== itemCode) { qty = n; break; } 
      }
    }
    if(itemCode && itemCode.length >= 3 && qty > 0) jsonData.push({ "Item#": itemCode, "Qty": qty, "Exp.Date": expDate });
  });

  if (jsonData.length === 0) { isSubmitting = false; showToast("이미지에서 품번 및 수량을 찾지 못했습니다.", "error"); setUploadStatus("Drag & Drop vendor document here"); return; }
  await processExcelData(jsonData, filename + " (OCR)");
}

async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector');
  if (!targetRegion || !targetRegion.value) { isSubmitting = false; showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error"); setUploadStatus("Drag & Drop vendor document here"); return; }
  const regionVal = targetRegion.value;
  if (cachedItems.length === 0) { isSubmitting = false; showToast("카탈로그 데이터를 불러오는 중입니다. 잠시 후 시도하세요.", "error"); return; }

  const linkedOrderIdInput = document.getElementById('linkedHqOrderId');
  let finalLinkedOrderId = null;
  if (linkedOrderIdInput && linkedOrderIdInput.value.trim() !== "") {
      finalLinkedOrderId = String(linkedOrderIdInput.value).trim().toUpperCase();
      if (!/^[\w-]+$/.test(finalLinkedOrderId)) {
          isSubmitting = false; setUploadStatus("Drag & Drop vendor document here");
          return showToast("연동할 발주 번호 형식이 올바르지 않습니다.", "error");
      }
  }

  let inboundMap = Object.create(null), successCount = 0, validationErrors = [];

  for (const row of jsonData) {
    let vItemCode = "", vQty = 0, vExp = ""; let qtyMatches = 0;

    Object.keys(row).forEach(k => {
      let cleanK = String(k).replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '').toLowerCase(), valStr = String(row[k] || "").trim();
      if (cleanK === 'item#' || cleanK === 'itemcode' || cleanK === '품번') vItemCode = valStr;
      if (!vItemCode && cleanK === 'barcode') vItemCode = valStr;
      if (cleanK === 'qty' || cleanK === 'quantity' || cleanK === 'stock' || cleanK === '수량') {
          if (valStr !== "") { 
              qtyMatches++; const parsedQty = parseStrictNonNegativeInteger(valStr);
              if (parsedQty === null) { validationErrors.push(`[${vItemCode || "Unknown"}] 수량 형식이 잘못되었습니다: ${valStr}`); } 
              else { vQty = parsedQty; }
          }
      }
      if (cleanK === 'exp.date' || cleanK === 'expdate' || cleanK === '유통기한') vExp = valStr;
    });

    if (qtyMatches > 1) { validationErrors.push(`[${vItemCode || "Unknown"}] 수량 컬럼이 중복 매칭되어 데이터를 덮어쓰는 것을 차단했습니다.`); continue; }

    const expString = String(vExp || "").trim();
    if (expString === "" || expString === "-") { vExp = null; } 
    else { 
        vExp = parseStrictISODate(expString); 
        if (vExp === null) { validationErrors.push(`[${vItemCode || "Unknown"}] 올바르지 않은 유통기한 날짜 형식입니다: ${expString}`); continue; }
    }
    
    const safeVItemCode = String(vItemCode || "").trim().toUpperCase();

    if (safeVItemCode.length >= 3 && vQty > 0 && qtyMatches === 1) {
      let hqCode = null, mapObj = cachedMappings.find(m => String(m.vendorCode || "").trim().toUpperCase() === safeVItemCode);
      if (mapObj) { hqCode = mapObj.hqCode; } else { const directMatch = cachedItems.find(item => String(item.code || "").trim().toUpperCase() === safeVItemCode); if (directMatch) hqCode = directMatch.code; }
      
      if (hqCode) {
        const safeHqCode = String(hqCode || "").trim().toUpperCase();
        const directMatch = cachedItems.find(item => String(item.code || "").trim().toUpperCase() === safeHqCode);
        
        if (directMatch && directMatch.expBreakdown && directMatch.expBreakdown[regionVal] !== undefined) {
            if (!vExp) { validationErrors.push(`[${safeHqCode}] ${directMatch.name} 품목의 유통기한이 누락되었습니다.`); continue; }
        }

        if (!inboundMap[safeHqCode]) inboundMap[safeHqCode] = { totalQty: 0, batches: Object.create(null) };
        inboundMap[safeHqCode].totalQty += vQty;
        if (vExp) { inboundMap[safeHqCode].batches[vExp] = (inboundMap[safeHqCode].batches[vExp] || 0) + vQty; }
        successCount++;
      }
    }
  }

  if (validationErrors.length > 0) {
      isSubmitting = false; setUploadStatus("Drag & Drop vendor document here");
      return showToast(`🚨 입고 실패 (데이터 오염 감지):\n\n${validationErrors.join('\n')}`, "error");
  }

  if (successCount === 0) { isSubmitting = false; setUploadStatus("Drag & Drop vendor document here"); showToast("마스터 DB와 매칭되는 품목이 0건입니다.", "error"); return; }

  const finalStockUpdates = Object.keys(inboundMap).map(hqCode => {
    let newExpArr = [], sortedDates = Object.keys(inboundMap[hqCode].batches).sort();
    sortedDates.forEach(d => { newExpArr.push(`${d}:${inboundMap[hqCode].batches[d]}`); });
    return { code: hqCode, stockBreakdown: { [regionVal]: inboundMap[hqCode].totalQty }, expBreakdown: { [regionVal]: newExpArr.join(' | ') } };
  });

  const matchedRowCount = successCount;
  const updatedItemCount = finalStockUpdates.length;

  setUploadStatus(`<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${matchedRowCount} Rows (Atomic ADD)...</span>`);
  
  try {
    const result = await executeApi("update_stock", { mode: "ADD", stockUpdates: finalStockUpdates, syncId: generateIdempotencyKey(), linkedOrderId: finalLinkedOrderId }); 
    if (result && result.success) { showToast(`입고 완료: ${updatedItemCount}개 품목 / ${matchedRowCount}개 행 누적 성공`, "success"); setUploadStatus(`<span class="text-emerald-600 font-bold">✅ Uploaded: ${escapeHtml(filename)}</span>`); setTimeout(() => { isSubmitting = false; location.reload(); }, 1500); } 
  } catch (err) {
    isSubmitting = false; setUploadStatus("Drag & Drop vendor document here");
    if(err.ledgerPending) { showToast(`✅ 재고 입고 반영 완료\n⚠️ 원장 기록 지연: 관리자 확인 필요\n(TX: ${err.txId || "N/A"})`, "success"); setTimeout(() => { fetchCatalogForInbound(); }, 2500); } 
    else { showToast(err.message, "error"); }
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

    const confirmMsg = `정말 주문 [${safeBatchId}]을 취소하시겠습니까?\n\n✔️ 취소 시 차감되었던 재고가 100% 복구됩니다.\n✔️ 물류사 및 본사로 [출고 중지 알림 이메일]이 자동 전송됩니다.`;
    if (!confirm(confirmMsg)) return;

    isSubmitting = true; showToast("⏳ 시스템 취소 요청 및 재고 복구를 진행 중입니다...", "success");
    try {
        const result = await executeApi("cancel_order", { batchId: safeBatchId });
        if (result && result.success) { showToast(`✅ ${result.message}`, "success"); setTimeout(() => { fetchMappings(); fetchCatalogForInbound(); }, 1500); } 
    } catch (err) { 
        if(err.ledgerPending) { showToast(`✅ 재고 복원 성공\n⚠️ 원장 기록 지연: 관리자 확인 필요\n(TX: ${err.txId})`, "success"); setTimeout(() => { fetchMappings(); fetchCatalogForInbound(); }, 2500); } 
        else { showToast(`❌ 취소 실패: ${err.message}`, "error"); }
    } finally { isSubmitting = false; }
}

window.switchAdminTab = switchAdminTab; window.saveClientData = saveClientData; window.loadSalesGrid = loadSalesGrid; window.recalcSalesRow = recalcSalesRow; window.saveSalesGridData = saveSalesGridData; window.handleExcelUpload = handleExcelUpload; window.saveHqOrder = saveHqOrder; window.cancelOrder = cancelOrder; 

window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) { console.error("[Y2C Telemetry Promise Rejection]", event.reason); showToast("비동기 처리 중 일시적인 시스템 에러가 발생했습니다.", "error"); });

document.addEventListener('DOMContentLoaded', () => {
  window.changeLanguage(currentLang); applyGlobalRbacNavigation(); setupDragAndDrop(); transformHqInputsToDigital();
  
  if (userRole === "VENDOR") {
      ['tabBtn_profiles', 'tabBtn_sales'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) { btn.classList.add('opacity-40', 'cursor-not-allowed'); btn.innerHTML += ' <span class="text-xs ml-1">🔒</span>'; const clone = btn.cloneNode(true); clone.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast("본사(MASTER) 전용 데이터입니다.", "error"); }); btn.parentNode.replaceChild(clone, btn); }
      });
      const hqVendorInput = document.getElementById('hqVendorInput');
      if (hqVendorInput) { hqVendorInput.value = clientName; hqVendorInput.readOnly = true; hqVendorInput.classList.add('bg-gray-100', 'text-[#E84C60]', 'cursor-not-allowed', 'font-black'); }
      switchAdminTab('hqorders'); fetchMappings().then(() => fetchCatalogForInbound()); 
  } else if (userRole === "PARTNER") {
      const adminSection = document.getElementById('section_admin_container') || document.querySelector('.admin-tabs-wrapper');
      if(adminSection) adminSection.style.display = 'none';
      fetchCatalogForInbound();
  } else {
      populateSalesYearSelector(); switchAdminTab('profiles'); fetchMasterData().then(() => fetchMappings()).then(() => fetchCatalogForInbound()); 
  }
});
