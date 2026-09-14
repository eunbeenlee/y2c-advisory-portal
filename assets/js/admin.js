// assets/js/admin.js
// 🌟 V17.7 Ultimate Kernel - Zero Deletions, Progressive Rendering, Lazy Library Loading, Dynamic i18n, Idempotency Key

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };
const userRole = (localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(STORAGE.CLIENT_NAME);
const sessionToken = localStorage.getItem(STORAGE.USER_TOKEN); 

if (!sessionToken || (userRole !== "MASTER" && userRole !== "VENDOR")) { 
  alert("비정상적인 접근입니다."); window.location.replace("index.html"); 
}

// ============================================================================
// 🌐 글로벌 & 동적 데이터 번역 (i18n) 엔진 탑재
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "tab_profiles": "Franchise DB", "tab_sales": "ERP Sales", "tab_inbound": "Inbound (Excel)", "tab_hqorders": "HQ Procurement",
        "cancel_order": "Cancel Order", "logout": "LOGOUT",
        "hq_title": "HQ Procurement Console", "hq_desc": "Global logistics procurement status, digital cart, and system health scan center.",
        "b2b_volume": "Total B2B Volume", "b2b_expenditure": "Total B2B Expenditure", "sys_health_scan": "🛡️ SYSTEM HEALTH SCAN",
        "profiles_title": "Franchise Database", "profiles_desc": "Master management center for franchise profiles, addresses, contacts, and business IDs.",
        "sales_title": "ERP Sales Sync", "sales_desc": "Monthly POS and delivery app sales data integration and royalty calculation basis.",
        "inbound_title": "Atomic Inbound Gateway", "inbound_desc": "V17.7 Atomic Engine applied. Securely adds (+) to live quantity without overwriting existing stock.",
        "guide_title": "B2B Logistics Inventory Merge System Essential Guide",
        "guide_q1": "✅ What to upload?", "guide_a1_1": "• Excel receipt statements (.xlsx, .csv) issued by vendors (suppliers)", "guide_a1_2": "• Image files (.jpg, .png) of physical invoices and receipts (Auto Tesseract AI OCR Scan Engine activated)",
        "guide_q2": "⚠️ Precautions (Must Read)", "guide_a2_1": "• Uploaded quantities will be cumulatively added (+) to the live inventory of the selected Hub.", "guide_a2_2": "• Risk of duplicate receiving: Please be careful not to upload the same receiving file multiple times.",
        "dropzone_title": "Drag & Drop Vendor Document Here", "dropzone_desc": "Supports .xlsx, .csv and .jpg, .png",
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
        "inbound_title": "원자성 입고 게이트웨이", "inbound_desc": "V17.7 원자성 엔진 적용. 기존 재고를 덮어쓰지 않고 라이브 수량에 안전하게 합산(+)됩니다.",
        "guide_title": "B2B 물류 재고 병합 시스템 필수 가이드",
        "guide_q1": "무엇을 업로드하나요?", "guide_a1_1": "• 벤더사(공급업체)에서 발행한 엑셀 입고 명세서 (.xlsx, .csv)", "guide_a1_2": "• 실물 송장 및 영수증을 촬영한 이미지 파일 (.jpg, .png) (Tesseract AI OCR 스캔 엔진 자동 가동)",
        "guide_q2": "주의사항 (필독)", "guide_a2_1": "• 업로드된 수량은 선택하신 허브(Hub)의 라이브 재고에 누적 합산(+) 됩니다.", "guide_a2_2": "• 중복 입고 위험: 동일한 입고 파일을 여러 번 업로드하지 않도록 각별히 주의해 주세요.",
        "dropzone_title": "벤더사 문서를 이곳에 드래그 앤 드롭 하세요", "dropzone_desc": ".xlsx, .csv 및 .jpg, .png 지원",
        "btn_browse": "파일 찾아보기", "btn_save": "데이터 저장", "btn_add": "발주 등록",
        "placeholder_vendor": "공급사명 (예: CJ Foods)", "placeholder_hub": "도착 허브 (ON, BC..)", "placeholder_cart": "🛒 품목 및 수량을 선택하세요...",
        "table_client": "가맹점명", "table_state": "관할 주 (Hub)", "table_city": "도시", "table_addr": "상세 주소", "table_manager": "담당자", "table_email": "이메일", "table_biz": "사업자 번호", "table_action": "관리",
        "kpi_annual": "연간 총 매출액", "kpi_pos": "홀 & 포장 (POS)", "kpi_del": "배달 플랫폼",
        "table_period": "기간 (월)", "table_pos": "홀 & 포장 매출 ($)", "table_del": "배달 앱 매출 ($)", "table_sub": "소계", "table_status": "상태",
        "active_shipments": "실시간 조달/입고 현황",
        "th_orderid": "주문 번호", "th_date": "발행일", "th_vendor": "벤더사", "th_hub": "입고 허브", "th_summary": "품목 요약", "th_eta": "도착 예정일"
    }
};

const DYNAMIC_I18N = {
    category: {
        en: { "떡": "Rice Cake", "떡류": "Rice Cake", "소스": "Sauce", "양념": "Sauce", "면": "Noodles", "면류": "Noodles", "식품": "Food", "냉동": "Frozen", "냉동식품": "Frozen", "파우더": "Powder", "포장재": "Packaging", "비품": "Equipment" },
        ko: { "SAUCE": "소스/양념", "NOODLE": "면류", "RICE CAKE": "떡류", "FROZEN": "냉동식품", "POWDER": "파우더/가루", "PACKAGING": "포장재", "EQUIPMENT": "비품/기기", "GENERAL": "일반/기타" }
    }
};

let currentLang = localStorage.getItem('y2c_lang') || 'en';

window.changeLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('y2c_lang', lang);
    
    const btnEn = document.getElementById('lang_en');
    const btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = lang === 'en' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = lang === 'ko' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (window.applyTranslations) window.applyTranslations();
    if (typeof renderHqOrders === 'function') renderHqOrders();
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang];
    if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });
};

function translateDynamic(text, type) {
    if(!text) return text;
    const tStr = String(text).trim().toUpperCase();
    const map = DYNAMIC_I18N[type] && DYNAMIC_I18N[type][currentLang];
    if(map) {
        for(let key in map) { if(tStr.includes(key.toUpperCase())) return map[key]; }
    }
    return text;
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName || userRole;

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
  localStorage.clear(); window.location.replace("index.html"); 
});

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
const formatDate = (isoStr) => {
  if(!isoStr) return "-";
  return new Date(isoStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
};

// 🌟 고유 식별자 생성 (중복 차단용)
const generateIdempotencyKey = () => {
    return 'REQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]';
  const icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    Object.keys(rbacRules).forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id);
        const allowedRoles = rbacRules[id];
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale');
            el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>';
            el.removeAttribute('href'); 
            const clone = el.cloneNode(true);
            clone.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast("해당 메뉴는 열람 권한이 없습니다.", "error"); });
            el.parentNode.replaceChild(clone, el);
        }
    });
}

function switchAdminTab(tab) {
  const tabs = ['profiles', 'sales', 'inbound', 'hqorders'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn_${t}`);
    const sec = document.getElementById(`section_${t}`);
    if(t === tab) {
      if(btn) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-[var(--premium-charcoal)] text-white shadow-sm whitespace-nowrap";
      if(sec) sec.classList.remove('hidden');
    } else {
      if(btn && !btn.classList.contains('cursor-not-allowed')) {
          btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-[var(--premium-charcoal)] hover:bg-gray-100 whitespace-nowrap";
      }
      if(sec) sec.classList.add('hidden');
    }
  });
}

let cachedClients = [], cachedHqOrders = [], cachedItems = [], cachedMappings = [], isSubmitting = false; 

async function executeApi(action, payload = {}, retries = 3) {
  if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");

  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); 

    try {
      const response = await fetch(CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
        body: JSON.stringify({ action: action, token: sessionToken, ...payload }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const rawText = await response.text();
      try {
        const jsonResult = JSON.parse(rawText);
        if (!jsonResult.success) {
          if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
            localStorage.clear(); alert("세션이 만료되었습니다. 다시 로그인해 주세요."); window.location.replace("index.html"); return;
          }
          if (jsonResult.message && (jsonResult.message.includes("트래픽") || jsonResult.message.includes("병목") || jsonResult.message.includes("초과") || jsonResult.message.includes("지연"))) throw new Error(jsonResult.message);
        }
        return jsonResult;
      } catch (parseErr) { throw new Error("서버 응답 지연 현상. 재시도를 준비합니다."); }
    } catch (err) {
      clearTimeout(timeoutId); lastError = err;
      if (err.message && err.message.includes("Failed to fetch")) {
          throw new Error("🚨 구글 서버 접근이 차단됨(CORS). 백엔드 배포를 '모든 사용자(Anyone)'로 변경하세요.");
      }
      if (i < retries) {
        const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
        await new Promise(res => setTimeout(res, waitTime));
      }
    }
  }
  throw new Error(lastError.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다." : (lastError.message || "서버 통신 실패. 새로고침 해주세요."));
}

// ============================================================================
// ⚡ [V17.7 신규] Master DB 점진적 렌더링 (Progressive Rendering)
// ============================================================================
async function fetchMasterData() {
  if (userRole === "VENDOR") return; 
  const tableBody = document.getElementById('masterTableBody');
  if (!tableBody) return;
  try {
    const result = await executeApi("get_master_data");
    if (result && result.success) {
      tableBody.innerHTML = '';
      cachedClients = result.clients || [];
      if (cachedClients.length === 0) return tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;

      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition-all";
      
      let chunkIndex = 0;
      const CHUNK_SIZE = 20;

      function renderChunk() {
          const fragment = document.createDocumentFragment();
          const endIdx = Math.min(chunkIndex + CHUNK_SIZE, cachedClients.length);
          
          for (; chunkIndex < endIdx; chunkIndex++) {
              const c = cachedClients[chunkIndex];
              const tr = document.createElement('tr');
              tr.className = "hover:bg-pink-50/40 transition-colors duration-200";
              tr.innerHTML = `
                <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${c.name}</td>
                <td class="px-3 py-4 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="${inputClass} text-center uppercase" maxlength="2" placeholder="ON"></td>
                <td class="px-3 py-4"><input type="text" id="city_${c.rowIdx}" value="${c.city || ''}" class="${inputClass}" placeholder="City"></td>
                <td class="px-3 py-4"><input type="text" id="addr_${c.rowIdx}" value="${c.address || ''}" class="${inputClass}" placeholder="Full Address"></td>
                <td class="px-3 py-4"><input type="text" id="attn_${c.rowIdx}" value="${c.attn || ''}" class="${inputClass}" placeholder="Manager Name"></td>
                <td class="px-3 py-4"><input type="text" id="email_${c.rowIdx}" value="${c.email || ''}" class="${inputClass}" placeholder="Email"></td>
                <td class="px-3 py-4"><input type="text" id="biz_${c.rowIdx}" value="${c.bizId || ''}" class="${inputClass} font-mono" placeholder="Business ID"></td>
                <td class="px-5 py-4 text-center bg-gray-50 border-l border-gray-100"><button id="saveBtn_${c.rowIdx}" onclick="saveClientData(${c.rowIdx})" class="bg-[var(--premium-charcoal)] hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-[11px] tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed">SAVE</button></td>
              `;
              fragment.appendChild(tr);
          }
          tableBody.appendChild(fragment);

          if (chunkIndex < cachedClients.length) {
              requestAnimationFrame(renderChunk);
          } else {
              populateSalesClientSelector(); 
          }
      }
      renderChunk();

    } else { throw new Error(result?.message || "데이터를 불러오지 못했습니다."); }
  } catch (err) { tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">데이터 로드 실패: ${err.message}</td></tr>`; }
}

async function saveClientData(rowIdx) {
  if (isSubmitting) return; 
  isSubmitting = true;
  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  let originalText = "SAVE";
  if (saveBtn) { originalText = saveBtn.innerText; saveBtn.disabled = true; saveBtn.innerText = "⏳ SAVING..."; saveBtn.classList.add('animate-pulse'); }
  const payload = {
    rowIdx: rowIdx, state: document.getElementById(`state_${rowIdx}`).value.toUpperCase().trim(),
    city: document.getElementById(`city_${rowIdx}`).value.trim(), address: document.getElementById(`addr_${rowIdx}`).value.trim(), 
    attn: document.getElementById(`attn_${rowIdx}`).value.trim(), email: document.getElementById(`email_${rowIdx}`).value.trim(), 
    bizId: document.getElementById(`biz_${rowIdx}`).value.trim()
  };
  try {
    const result = await executeApi("update_master_data", { client: payload });
    if (result && result.success) {
      if(saveBtn) { saveBtn.innerText = "✅ SAVED"; saveBtn.classList.remove('animate-pulse'); saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); }
      showToast("마스터 데이터 저장 완료", "success"); setTimeout(() => fetchMasterData(), 1500); 
    } else if (result) throw new Error(result.message);
  } catch (err) { showToast(err.message, "error"); if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); } } finally { isSubmitting = false; }
}

const monthNames = ["Jan (1월)", "Feb (2월)", "Mar (3월)", "Apr (4월)", "May (5월)", "Jun (6월)", "Jul (7월)", "Aug (8월)", "Sep (9월)", "Oct (10월)", "Nov (11월)", "Dec (12월)"];

function populateSalesYearSelector() {
  const yearSelect = document.getElementById('salesYearSelector');
  if (!yearSelect) return;
  yearSelect.innerHTML = '';
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 2; y >= 2022; y--) {
    const opt = document.createElement('option'); opt.value = y; opt.innerText = `${y} Fiscal Year`;
    if (y === currentYear) opt.selected = true; yearSelect.appendChild(opt);
  }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector');
  if (!clientSelect || cachedClients.length === 0) return;
  clientSelect.innerHTML = `<option value="">-- Select Franchise --</option>`;
  cachedClients.forEach(c => { const opt = document.createElement('option'); opt.value = c.name; opt.innerText = c.name; clientSelect.appendChild(opt); });
}

async function loadSalesGrid() {
  const targetYear = document.getElementById('salesYearSelector')?.value, targetClient = document.getElementById('salesClientSelector')?.value, tbody = document.getElementById('salesGridBody');
  if (!targetYear || !targetClient || !tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 font-bold tracking-wide"><span class="animate-pulse">🔄 동기화 중...</span></td></tr>`;
  try {
    const result = await executeApi("get_sales_records", { year: targetYear, clientName: targetClient });
    if (result && result.success) renderSalesGrid(result.records); else if (result) throw new Error(result.message);
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-[#E84C60] font-black py-8">데이터 로드 실패: ${err.message}</td></tr>`; }
}

function renderSalesGrid(records) {
  const tbody = document.getElementById('salesGridBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const inputStyle = "w-full max-w-[170px] mx-auto bg-white border border-gray-200 rounded-xl px-3 py-2 text-center text-[13px] font-mono font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition";

  records.forEach(r => {
    const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors";
    const badgeHTML = r.exists ? `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">SAVED</span>` : `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-gray-100 text-gray-400 border border-gray-200">EMPTY</span>`;

    tr.innerHTML = `
      <td class="px-6 py-3 font-black text-gray-700 text-xs sm:text-sm whitespace-nowrap">${monthNames[r.month - 1]}</td>
      <td class="px-6 py-3 text-center"><input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.pos > 0 ? r.pos : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-pos ${inputStyle}"></td>
      <td class="px-6 py-3 text-center"><input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.delivery > 0 ? r.delivery : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-del ${inputStyle}"></td>
      <td class="px-6 py-3 text-right font-black font-mono text-[var(--premium-charcoal)] text-sm whitespace-nowrap" id="rowTotal_${r.month}">${formatCurrency(r.total)}</td>
      <td class="px-6 py-3 text-center whitespace-nowrap">${badgeHTML}</td>
    `;
    tbody.appendChild(tr);
  });
  recalculateKpis();
}

function recalcSalesRow(month) {
  const posInput = document.querySelector(`.sales-input-pos[data-month="${month}"]`), delInput = document.querySelector(`.sales-input-del[data-month="${month}"]`);
  let p = parseFloat(posInput?.value), d = parseFloat(delInput?.value);
  if (Number.isNaN(p) || p < 0) p = 0; if (Number.isNaN(d) || d < 0) d = 0;
  const totalDisplay = document.getElementById(`rowTotal_${month}`);
  if (totalDisplay) totalDisplay.innerText = formatCurrency(p + d);
  recalculateKpis();
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    const pos = parseFloat(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value) || 0;
    const del = parseFloat(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value) || 0;
    totPos += Math.max(0, pos); totDel += Math.max(0, del); totAnnual += Math.max(0, pos + del);
  }
  if (document.getElementById('salesKpiTotal')) document.getElementById('salesKpiTotal').innerText = formatCurrency(totAnnual);
  if (document.getElementById('salesKpiPos')) document.getElementById('salesKpiPos').innerText = formatCurrency(totPos);
  if (document.getElementById('salesKpiDelivery')) document.getElementById('salesKpiDelivery').innerText = formatCurrency(totDel);
}

async function saveSalesGridData() {
  if (isSubmitting) return; 
  const targetYear = document.getElementById('salesYearSelector').value, targetClient = document.getElementById('salesClientSelector').value;
  if (!targetYear || !targetClient) return showToast("가맹점과 연도를 선택해 주세요.", "error");

  isSubmitting = true;
  const btn = document.getElementById('saveAllSalesBtn');
  const recordsToSave = [];
  for (let m = 1; m <= 12; m++) {
    const pStr = document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value, dStr = document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value;
    recordsToSave.push({ month: m, pos: Math.max(0, parseFloat(pStr) || 0), delivery: Math.max(0, parseFloat(dStr) || 0) });
  }

  let originalHtml = "SAVE DATA";
  if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SYNCHRONIZING...</span>`; }
  
  try {
    const result = await executeApi("save_sales_records", { year: targetYear, clientName: targetClient, records: recordsToSave });
    if (result && result.success) { showToast(result.message, "success"); setTimeout(() => loadSalesGrid(), 1000); }
    else if (result) throw new Error(result.message);
  } catch (err) { showToast("매출 저장 실패: " + err.message, "error"); } finally { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; } isSubmitting = false; }
}

function renderOrderMetrics(metrics) {
  if(!metrics) return;
  const table = document.getElementById('hqOrdersGridBody')?.closest('table');
  if(!table || !table.parentNode) return;

  let kpiContainer = document.getElementById('y2cOrderMetrics');
  if (!kpiContainer) {
    kpiContainer = document.createElement('div');
    kpiContainer.id = 'y2cOrderMetrics';
    kpiContainer.className = userRole === "MASTER" ? 'grid grid-cols-2 gap-4 sm:gap-6 mb-8' : 'grid grid-cols-1 gap-4 sm:gap-6 mb-8';
    table.parentNode.insertBefore(kpiContainer, table);
    
    if (userRole === "MASTER") {
        const scanBtn = document.createElement('button');
        scanBtn.innerHTML = '<span data-i18n="sys_health_scan">🛡️ SYSTEM HEALTH SCAN</span>';
        scanBtn.className = "w-full col-span-2 bg-[var(--premium-charcoal)] hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 tracking-[0.2em] mb-4";
        scanBtn.onclick = runSystemAlertScan;
        table.parentNode.insertBefore(scanBtn, kpiContainer);
    }
  }
  
  let expenditureHtml = '';
  if (userRole === "MASTER") {
      expenditureHtml = `
        <div class="bg-gradient-to-br from-[#E84C60] to-[#C23347] border border-[#E84C60]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div class="flex items-center gap-3 mb-2 relative z-10">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">💳</div>
            <p class="text-[11px] font-black text-red-100 uppercase tracking-widest" data-i18n="b2b_expenditure">Total B2B Expenditure</p>
          </div>
          <h3 class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tighter relative z-10">${formatCurrency(metrics.totalAmount)}</h3>
        </div>
      `;
  }

  kpiContainer.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">📦</div>
        <p class="text-[11px] font-black text-gray-500 uppercase tracking-widest" data-i18n="b2b_volume">Total B2B Volume</p>
      </div>
      <h3 class="text-2xl sm:text-3xl font-black text-[var(--premium-charcoal)] font-mono tracking-tighter">${metrics.totalQty.toLocaleString()} <span class="text-xs text-gray-400 font-bold ml-1">Units</span></h3>
    </div>
    ${expenditureHtml}
  `;

  if (window.applyTranslations) window.applyTranslations();
}

async function runSystemAlertScan(event) {
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SCANNING INVENTORY...</span>`;
  try {
    const result = await executeApi("check_system_alerts");
    if (result && result.success) { showToast("스캔 완료. 리포트가 발송되었습니다.", "success"); displayAlertModal(result.alerts); } else throw new Error(result.message);
  } catch (err) { showToast("스캔 실패: " + err.message, "error"); } finally { btn.disabled = false; btn.innerHTML = originalText; }
}

function displayAlertModal(alerts) {
  let modal = document.getElementById('alertModal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'alertModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
    document.body.appendChild(modal);
  }
  
  let html = `<div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl transform transition-transform scale-95 duration-300" id="alertModalContent">`;
  html += `<div class="bg-[var(--premium-charcoal)] p-6 text-white flex justify-between items-center"><h2 class="text-xl font-black tracking-widest">🛡️ SYSTEM HEALTH REPORT</h2><button onclick="closeAlertModal()" class="text-gray-400 hover:text-white font-bold text-xl">&times;</button></div><div class="p-6 max-h-[70vh] overflow-y-auto hide-scrollbar">`;
  
  if (alerts.lowStock.length === 0 && alerts.expiring.length === 0) {
    html += `<div class="text-center py-10"><span class="text-4xl">✅</span><p class="mt-4 font-bold text-gray-500">재고 및 유통기한이 안정적입니다.</p></div>`;
  } else {
    if (alerts.lowStock.length > 0) {
      html += `<h3 class="font-black text-[#E84C60] mb-3 flex items-center gap-2"><span>🚨</span> Low Stock Alert (${alerts.lowStock.length})</h3><div class="bg-red-50 border border-red-100 rounded-xl p-4 mb-6"><ul class="space-y-2">`;
      alerts.lowStock.forEach(item => { html += `<li class="flex justify-between items-center text-[13px] border-b border-red-100 pb-2"><span class="font-bold text-gray-800">[${item.region}] ${item.name}</span><span class="font-black text-[#E84C60] bg-white px-2 py-1 rounded shadow-sm">${item.stock}</span></li>`; });
      html += `</ul></div>`;
    }
    if (alerts.expiring.length > 0) {
      html += `<h3 class="font-black text-amber-600 mb-3 flex items-center gap-2"><span>⏳</span> Expiration Alert (${alerts.expiring.length})</h3><div class="bg-amber-50 border border-amber-100 rounded-xl p-4"><ul class="space-y-2">`;
      alerts.expiring.forEach(item => {
        let badge = item.daysLeft < 0 ? "기한 초과" : `D-${item.daysLeft}`;
        let textCol = item.daysLeft < 0 ? "text-[#E84C60]" : "text-amber-600";
        html += `<li class="flex justify-between items-center text-[13px] border-b border-amber-100 pb-2"><span class="font-bold text-gray-800">[${item.region}] ${item.name}</span><div class="flex items-center gap-3"><span class="font-black ${textCol}">${item.date} (${badge})</span><span class="font-bold text-gray-500">Qty: ${item.qty}</span></div></li>`;
      });
      html += `</ul></div>`;
    }
  }
  html += `</div><div class="p-4 bg-gray-50 border-t border-gray-100 text-center"><button onclick="closeAlertModal()" class="bg-[#E84C60] text-white px-8 py-2.5 rounded-xl font-black shadow-md hover:bg-black transition-colors uppercase tracking-widest text-[11px]">Close Report</button></div></div>`;
  modal.innerHTML = html; modal.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => document.getElementById('alertModalContent').classList.remove('scale-95'), 50);
}

window.closeAlertModal = function() {
  const modal = document.getElementById('alertModal');
  if (modal) { document.getElementById('alertModalContent').classList.add('scale-95'); modal.classList.add('opacity-0', 'pointer-events-none'); }
}

function renderHqOrdersError(msg) {
    const tbody = document.getElementById('hqOrdersGridBody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#E84C60] font-bold tracking-wide">Error: ${msg}</td></tr>`;
}

async function fetchMappings() {
  try {
    const result = await executeApi("get_procurement_data");
    if (result && result.success) {
      cachedMappings = result.mappings || [];
      cachedHqOrders = result.hqOrders || [];
      renderHqOrders();
      if(result.orderMetrics) renderOrderMetrics(result.orderMetrics);
    } else {
        cachedMappings = [];
        renderHqOrdersError(result?.message || "데이터를 불러오지 못했습니다.");
    }
  } catch (err) { 
      cachedMappings = []; 
      renderHqOrdersError(err.message);
      showToast("조달 데이터 로드 실패: " + err.message, "error"); 
  }
}

async function fetchCatalogForInbound() {
  try {
    const result = await executeApi("get_items", { clientState: "DEFAULT" });
    if (result && result.success) {
        cachedItems = result.items || result.data || [];
    } else {
        throw new Error("카탈로그 데이터를 불러오지 못했습니다.");
    }
  } catch (e) { 
      console.error("Catalog load failed", e); 
      cachedItems = []; 
  }
}

// ============================================================================
// ⚡ [V17.7 신규] HQ 조달 데이터 점진적 렌더링 (Progressive Rendering)
// ============================================================================
function renderHqOrders() {
  const tbody = document.getElementById('hqOrdersGridBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  if(cachedHqOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 내역이 없습니다.</td></tr>`;
      return;
  }

  const sortedOrders = cachedHqOrders.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  let chunkIndex = 0;
  const CHUNK_SIZE = 30; // 프레임당 30개씩 분할 렌더링

  function renderChunk() {
      const fragment = document.createDocumentFragment();
      const endIdx = Math.min(chunkIndex + CHUNK_SIZE, sortedOrders.length);
      
      for (; chunkIndex < endIdx; chunkIndex++) {
          const o = sortedOrders[chunkIndex];
          let statusClass = "bg-gray-100 text-gray-500", statusText = o.status;
          if(o.status === "HQ_PENDING") { statusClass = "bg-purple-100 text-purple-700"; statusText = "접수 대기"; }
          else if(o.status === "SHIPPED") { statusClass = "bg-blue-100 text-blue-700"; statusText = "선적 완료"; }
          else if(o.status === "ARRIVED") { statusClass = "bg-emerald-100 text-emerald-700"; statusText = "캐나다 입항"; }

          const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors";
          tr.innerHTML = `
            <td class="px-5 py-4 font-mono text-[11px] font-black text-gray-500">${o.id}</td>
            <td class="px-5 py-4 text-[12px] font-bold text-[var(--premium-charcoal)]">${formatDate(o.date)}</td>
            <td class="px-5 py-4 text-[12px] font-black text-[#E84C60]">${o.vendor}</td>
            <td class="px-5 py-4 text-[11px] font-bold text-gray-600">${o.region}</td>
            <td class="px-5 py-4 text-[12px] font-medium text-gray-700 max-w-[200px] truncate" title="${o.items}">${o.items}</td>
            <td class="px-5 py-4 text-[12px] font-mono font-bold text-gray-800">${o.eta}</td>
            <td class="px-5 py-4 text-center">
              <select onchange="updateHqOrderStatus('${o.id}', this.value)" class="text-[10px] font-black rounded border border-gray-300 p-1 outline-none focus:border-[#E84C60] ${o.status === 'SHIPPED' ? 'text-blue-600' : 'text-gray-500'} cursor-pointer">
                <option value="HQ_PENDING" ${o.status === 'HQ_PENDING' ? 'selected' : ''}>PREPARING</option>
                <option value="SHIPPED" ${o.status === 'SHIPPED' ? 'selected' : ''}>SHIPPED</option>
                <option value="ARRIVED" ${o.status === 'ARRIVED' ? 'selected' : ''}>ARRIVED</option>
                <option value="COMPLETED" ${o.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
              </select>
            </td>
          `;
          fragment.appendChild(tr);
      }
      
      tbody.appendChild(fragment);

      if (chunkIndex < sortedOrders.length) {
          requestAnimationFrame(renderChunk);
      }
  }
  renderChunk();
}

let hqCartData = {}; 

window.openHqOrderCartModal = async function() {
    if(cachedItems.length === 0) {
        showToast("백엔드와 데이터를 동기화 중입니다. 잠시만 기다려주세요...", "success");
        await fetchCatalogForInbound();
        if(cachedItems.length === 0) {
            return showToast("🚨 구글 서버 접근이 차단되었습니다(CORS). 배포 권한 설정을 확인하세요.", "error");
        }
    }

    let modal = document.getElementById('hqCartModal');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'hqCartModal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        document.body.appendChild(modal);
    }

    let itemsHtml = '';
    cachedItems.forEach(item => {
        let currentQty = hqCartData[item.code] || "";
        let translatedCat = translateDynamic(item.category, 'category');
        
        itemsHtml += `
            <div class="hq-cart-item-row flex justify-between items-center p-3 border-b border-gray-100 hover:bg-pink-50 transition-colors" data-name="${item.name.toLowerCase()}">
                <div class="flex flex-col">
                    <span class="text-xs font-black text-gray-800">${item.name}</span>
                    <span class="text-[10px] font-mono text-gray-500">[${item.code}] ${translatedCat}</span>
                </div>
                <input type="number" min="0" data-code="${item.code}" data-name="${item.name}" value="${currentQty}" placeholder="0" class="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm font-bold text-[#E84C60] focus:border-[#E84C60] outline-none shadow-inner bg-white">
            </div>
        `;
    });

    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transform transition-transform scale-95 duration-300" id="hqCartModalContent">
            <div class="bg-[var(--premium-charcoal)] p-5 text-white flex justify-between items-center">
                <h2 class="text-lg font-black tracking-widest uppercase flex items-center gap-2"><span>🛒</span> Digital Procurement Cart</h2>
                <button onclick="closeHqCartModal()" class="text-gray-400 hover:text-white font-bold text-2xl">&times;</button>
            </div>
            <div class="p-3 bg-gray-50 border-b border-gray-200">
                <input type="text" placeholder="Search item name..." class="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:border-[#E84C60] outline-none font-bold" oninput="filterHqCart(this.value)">
            </div>
            <div class="p-2 overflow-y-auto flex-grow hide-scrollbar">${itemsHtml}</div>
            <div class="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <span class="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Enter Quantity & Confirm</span>
                <button onclick="confirmHqCart()" class="bg-[#E84C60] text-white px-8 py-2.5 rounded-xl font-black shadow-md hover:bg-black transition-colors uppercase tracking-widest text-[11px]">Apply to Order</button>
            </div>
        </div>
    `;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => document.getElementById('hqCartModalContent').classList.remove('scale-95'), 50);
}

window.closeHqCartModal = function() {
    const modal = document.getElementById('hqCartModal');
    if (modal) { document.getElementById('hqCartModalContent').classList.add('scale-95'); modal.classList.add('opacity-0', 'pointer-events-none'); }
}

window.filterHqCart = function(query) {
    const term = query.toLowerCase();
    document.querySelectorAll('.hq-cart-item-row').forEach(row => {
        row.style.display = row.getAttribute('data-name').includes(term) ? 'flex' : 'none';
    });
}

window.confirmHqCart = function() {
    const inputs = document.querySelectorAll('.hq-cart-item-row input[type="number"]');
    hqCartData = {}; 
    let formattedStrings = [];
    
    inputs.forEach(input => {
        const qty = parseInt(input.value);
        if (qty > 0) {
            const code = input.getAttribute('data-code');
            const name = input.getAttribute('data-name');
            hqCartData[code] = qty;
            formattedStrings.push(`[${code}] ${name} x ${qty}`);
        }
    });

    const itemsInput = document.getElementById('hqItemsInput');
    if (formattedStrings.length > 0) {
        itemsInput.value = formattedStrings.join(' / ');
        showToast(`${formattedStrings.length}개의 품목이 전산화되어 카트에 담겼습니다.`, "success");
    } else { itemsInput.value = ''; }
    closeHqCartModal();
}

function transformHqInputsToDigital() {
    const regionInput = document.getElementById('hqRegionInput');
    if (regionInput && regionInput.tagName === 'INPUT') {
        const select = document.createElement('select');
        select.id = 'hqRegionInput';
        select.className = "w-full text-xs p-2 border border-gray-300 rounded focus:border-[#E84C60] outline-none text-center cursor-pointer font-bold text-gray-700";
        select.innerHTML = '<option value="">-- Hub --</option><option value="ON">ON (Ontario)</option><option value="BC">BC (British Columbia)</option><option value="AB">AB (Alberta)</option>';
        regionInput.parentNode.replaceChild(select, regionInput);
    }

    const itemsInput = document.getElementById('hqItemsInput');
    if (itemsInput) {
        itemsInput.readOnly = true;
        itemsInput.classList.add('cursor-pointer', 'bg-pink-50', 'text-[#E84C60]', 'font-bold', 'hover:border-[#E84C60]', 'transition-colors');
        itemsInput.addEventListener('click', window.openHqOrderCartModal);
    }
}

window.saveHqOrder = async function() {
  if (isSubmitting) return;
  const vendorInput = document.getElementById('hqVendorInput');
  const vendorName = vendorInput ? vendorInput.value.trim() : clientName;
  const region = document.getElementById('hqRegionInput').value.toUpperCase().trim();
  const items = document.getElementById('hqItemsInput').value.trim();
  
  if(!vendorName || !region || !items) return showToast("모든 발주 정보를 기입해 주세요.", "error");

  isSubmitting = true;
  const btn = document.getElementById('btnSubmitHqOrder');
  let originalHtml = "ADD";
  if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`; }

  const uniqueBatchId = generateIdempotencyKey();

  const payload = { id: uniqueBatchId, date: new Date().toISOString().split('T')[0], vendor: vendorName, region: region, items: items, status: "HQ_PENDING", eta: "-" };
  try {
    const result = await executeApi("upsert_hq_order", { order: payload });
    if (result && result.success) { 
      showToast("발주가 본사 전산에 등록되었습니다.", "success"); 
      document.getElementById('hqItemsInput').value = ''; hqCartData = {}; fetchMappings(); 
    } else if (result) throw new Error(result.message);
  } catch (err) { showToast("등록 실패: " + err.message, "error"); } finally { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; } isSubmitting = false; }
}

window.updateHqOrderStatus = async function(orderId, status) {
  if (!orderId) return;
  try {
    let finalStatus = status === "PREPARING" ? "HQ_PENDING" : status;
    const result = await executeApi("update_hq_order_status", { orderId, status: finalStatus });
    if (result && result.success) { showToast(`Order ${orderId} marked as ${finalStatus}`, "success"); fetchMappings(); } else throw new Error(result.message);
  } catch (err) { showToast(err.message, "error"); fetchMappings(); }
}

// ============================================================================
// ⚡ [V17.7 신규] 무거운 외부 라이브러리 지연 로딩 (Lazy Loading Code Splitting)
// ============================================================================
async function loadHeavyLibrary(url, objName) {
    if (window[objName] !== undefined) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = () => reject(false);
        document.head.appendChild(script);
    });
}

async function handleExcelUpload(event) {
  event.preventDefault();
  if (isSubmitting) return showToast("현재 데이터를 서버로 전송 중입니다. 잠시 기다려주세요.", "error");

  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];
  if (!file) return;

  isSubmitting = true;
  const validExcelExts = [".xlsx", ".xls", ".csv"], validImgExts = [".png", ".jpg", ".jpeg"];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const statusText = document.getElementById('uploadStatusText');

  if (validExcelExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Loading Excel Engine...</span>`;
    
    try { await loadHeavyLibrary("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "XLSX"); } 
    catch(e) { isSubmitting = false; return showToast("엑셀 엔진 로드 실패. 네트워크를 확인하세요.", "error"); }

    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Parsing Excel Document...</span>`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result); 
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
        
        if (jsonData.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다.");
        processExcelData(jsonData, file.name);
      } catch(err) {
        isSubmitting = false;
        showToast("엑셀 파일 파싱 중 오류 발생: " + err.message, "error"); 
        if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
      }
    };
    reader.readAsArrayBuffer(file);
  } 
  else if (validImgExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">Loading AI OCR Engine...</span>`;
    
    try { await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js", "Tesseract"); } 
    catch(e) { isSubmitting = false; return showToast("AI 엔진 로드 실패. 네트워크를 확인하세요.", "error"); }

    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">AI Vision OCR Scanning...</span>`;
    
    try {
      const result = await Tesseract.recognize(file, 'eng+kor', {
        logger: m => { if (m.status === 'recognizing text' && statusText) { const pct = Math.floor(m.progress * 100); statusText.innerHTML = `<span class="text-indigo-500 font-bold">AI Vision Parsing: ${pct}%</span>`; } }
      });
      processOCRText(result.data.text, file.name);
    } catch(err) {
      isSubmitting = false;
      showToast("이미지 인식 실패: " + err.message, "error"); 
      if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
    }
  } else { 
    isSubmitting = false;
    return showToast("지원하지 않는 포맷입니다. (.xlsx, .jpg, .png 지원)", "error"); 
  }
}

function processOCRText(text, filename) {
  const lines = text.split('\n');
  const jsonData = [];
  lines.forEach(line => {
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
    const expDate = dateMatch ? dateMatch[0] : "";
    const barcodeMatch = line.match(/\b\d{13,14}\b/);
    const codeMatch = line.match(/\b[A-Z0-9]{5,15}\b/);
    const itemCode = (codeMatch ? codeMatch[0] : (barcodeMatch ? barcodeMatch[0] : ""));

    let cleanLine = line.replace(/\b\d+(\.\d+)?[KkGgLlMmCc]+\*\d+\b/g, ''); 
    const nums = cleanLine.match(/\b\d+\b/g); 
    let qty = 0;
    
    if (nums && nums.length > 0) {
      for(let i = nums.length - 1; i >= 0; i--) {
        const n = parseInt(nums[i]);
        if(!Number.isNaN(n) && n < 10000 && String(n) !== itemCode) { qty = n; break; }
      }
    }
    if(itemCode && itemCode.length >= 3 && qty > 0) jsonData.push({ "Item#": itemCode, "Qty": qty, "Exp.Date": expDate });
  });

  if (jsonData.length === 0) {
    isSubmitting = false;
    showToast("이미지에서 품번 및 수량을 찾지 못했습니다.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here"; return;
  }
  processExcelData(jsonData, filename + " (OCR)");
}

async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector');
  if (!targetRegion || !targetRegion.value) {
    isSubmitting = false;
    showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here"; return;
  }
  const regionVal = targetRegion.value;

  if (cachedItems.length === 0) {
    isSubmitting = false;
    showToast("카탈로그 데이터를 불러오는 중입니다. 잠시 후 시도하세요.", "error"); return;
  }

  let inboundMap = {};
  let successCount = 0;

  jsonData.forEach(row => {
    let vItemCode = "", vQty = 0, vExp = "";
    
    Object.keys(row).forEach(k => {
      let cleanK = String(k).replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '').toLowerCase();
      let valStr = String(row[k] || "").trim();

      if (cleanK === 'item#' || cleanK === 'itemcode' || cleanK === '품번') vItemCode = valStr;
      if (!vItemCode && cleanK === 'barcode') vItemCode = valStr;
      if (cleanK === 'qty' || cleanK === 'quantity' || cleanK === 'stock' || cleanK === '수량') vQty = Math.max(0, parseInt(valStr) || 0);
      if (cleanK === 'exp.date' || cleanK === 'expdate' || cleanK === '유통기한') vExp = valStr;
    });

    const dateMatch = vExp.match(/\d{4}-\d{2}-\d{2}/);
    vExp = dateMatch ? dateMatch[0] : "";

    if (vItemCode.length >= 3 && !Number.isNaN(vQty) && vQty > 0) {
      let hqCode = null;
      const mapObj = cachedMappings.find(m => m.vendorCode.toUpperCase() === vItemCode.toUpperCase());
      if (mapObj) {
        hqCode = mapObj.hqCode;
      } else {
        const directMatch = cachedItems.find(item => item.code.toUpperCase() === vItemCode.toUpperCase());
        if (directMatch) hqCode = directMatch.code;
      }

      if (hqCode) {
        if (!inboundMap[hqCode]) inboundMap[hqCode] = { totalQty: 0, batches: {} };
        inboundMap[hqCode].totalQty += vQty;
        if (vExp) { inboundMap[hqCode].batches[vExp] = (inboundMap[hqCode].batches[vExp] || 0) + vQty; }
        successCount++;
      }
    }
  });

  if (successCount === 0) {
    isSubmitting = false;
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here";
    showToast("마스터 DB와 매칭되는 품목이 0건입니다.", "error"); return;
  }

  const finalStockUpdates = Object.keys(inboundMap).map(hqCode => {
    let newExpArr = [];
    let sortedDates = Object.keys(inboundMap[hqCode].batches).sort();
    sortedDates.forEach(d => {
      newExpArr.push(`${d}:${inboundMap[hqCode].batches[d]}`);
    });
    const addedExpStr = newExpArr.join(' | ');

    return { 
      code: hqCode, 
      stockBreakdown: { [regionVal]: inboundMap[hqCode].totalQty }, 
      expBreakdown: { [regionVal]: addedExpStr } 
    };
  });

  document.getElementById('uploadStatusText').innerHTML = `<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${successCount} Rows (Atomic ADD)...</span>`;
  
  const uniqueSyncId = generateIdempotencyKey();

  try {
    const result = await executeApi("update_stock", { mode: "ADD", stockUpdates: finalStockUpdates, syncId: uniqueSyncId });
    if (result && result.success) {
      showToast(`입고 완료: 엑셀/이미지 ${successCount}건 누적 성공`, "success");
      document.getElementById('uploadStatusText').innerHTML = `<span class="text-emerald-600 font-bold">✅ Uploaded: ${filename}</span>`;
      setTimeout(() => { isSubmitting = false; location.reload(); }, 1500); 
    } else if (result) throw new Error(result.message);
  } catch (err) {
    isSubmitting = false;
    showToast(err.message, "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here";
    if(err.message.includes("트래픽") || err.message.includes("동기화")) {
      setTimeout(() => { fetchItems(); }, 2000);
    }
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if(!dropZone) return;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-pink-50/50', 'border-[#E84C60]'); });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); handleExcelUpload(e); });
  
  const fileInput = document.getElementById('excelFileInput');
  if(fileInput) fileInput.addEventListener('change', handleExcelUpload);
}

async function cancelOrder(batchId) {
    if (isSubmitting) return showToast("현재 시스템이 다른 작업을 처리 중입니다.", "error");

    if (!batchId) {
        batchId = prompt("🚨 취소할 주문 번호(Order ID)를 입력하세요.\n(예: ORD-123456)");
        if (!batchId) return;
    }

    const confirmMsg = `정말 주문 [${batchId.trim()}]을 취소하시겠습니까?\n\n✔️ 취소 시 차감되었던 재고가 100% 복구됩니다.\n✔️ 물류사 및 본사로 [출고 중지 알림 이메일]이 자동 전송됩니다.`;
    if (!confirm(confirmMsg)) return;

    isSubmitting = true;
    showToast("⏳ 시스템 취소 요청 및 재고 복구를 진행 중입니다...", "success");

    try {
        const result = await executeApi("cancel_order", { batchId: batchId.trim() });
        if (result && result.success) { showToast(`✅ ${result.message}`, "success"); setTimeout(() => fetchItems(), 1500); } 
        else throw new Error(result.message);
    } catch (err) {
        showToast(`❌ 취소 실패: ${err.message}`, "error");
    } finally {
        isSubmitting = false;
    }
}

window.submitOrder = submitOrder; 
window.fetchItems = fetchItems; 
window.toggleStockEditMode = toggleStockEditMode; 
window.applyRegionFilter = applyRegionFilter; 
window.applyAiSuggestion = applyAiSuggestion; 
window.calculateOrderTotal = calculateOrderTotal; 
window.handleExcelUpload = handleExcelUpload;
window.cancelOrder = cancelOrder; 

// 🌟 [V17.7 신규] 프론트엔드 에러 텔레메트리 (글로벌 락/멈춤 추적기)
window.addEventListener('error', function(event) {
    console.error("[Y2C Telemetry Error]", event.message);
    showToast("화면 렌더링 중 일시적인 지연이 발생했습니다.", "error");
});
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
  window.changeLanguage(currentLang);
  applyGlobalRbacNavigation(); 
  setupDragAndDrop();
  
  if (userRole === "MASTER" || userRole === "VENDOR") {
    fetchMappings().then(() => fetchItems());
  } else { fetchItems(); }
});
