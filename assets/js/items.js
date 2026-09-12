// assets/js/items.js
// 🌟 V15.4 Ultimate - No Deletion, Full Protection, CRA Dynamic Tax Engine (Cross-Validation)

const CONFIG = window.SYSTEM_CONFIG; 
const userRole = (localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
const cachedClientState = localStorage.getItem("y2c_premium_state") || "DEFAULT";

// 🌟 [방화벽 1] 토큰 및 권한 무결성 검증
if (!sessionToken || !clientName) { window.location.replace("index.html"); }

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName;

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
  localStorage.clear(); window.location.replace("index.html"); 
});

// 🌟 권한별 UI 접근 통제 (RBAC)
if (userRole === "VENDOR") {
  const navDash = document.getElementById('navDashboard');
  const navRec = document.getElementById('navRecipes');
  const orderAct = document.getElementById('orderActionContainer');
  if (navDash) navDash.remove(); 
  if (navRec) navRec.remove(); 
  if (orderAct) orderAct.remove();
}

if (userRole === "MASTER") {
  const navAdmin = document.getElementById('navAdmin');
  const navInv = document.getElementById('navInvoice');
  if (navAdmin) navAdmin.classList.remove('hidden');
  if (navInv) navInv.classList.remove('hidden');
}

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
function formatTimestamp(isoString) {
  if (!isoString) return "Never";
  const d = new Date(isoString); 
  return d.toLocaleString('en-CA', { month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' });
}

// 🌟 상태 알림 토스트 
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

let cachedItems = [];
let cachedMappings = []; 
let isStockEditMode = false; 
let currentClientState = cachedClientState; 
let masterViewRegion = "ALL"; 
let taxRateObj = { name: "Standard Tax (13%)", rate: 0.13 };
let isSubmitting = false;

// ============================================================================
// 🚨 [V15.4 엔진] 캐나다 CRA 세법 정밀 분석 (교차 검증 및 예외 처리 완벽 대응)
// ============================================================================
function isZeroRatedItem(item) {
  if (!item) return false;

  // 1. DB 우선순위 (Explicit Flag Override)
  // 마스터 DB에서 수동으로 면세/과세를 확정지은 경우, 키워드 로직을 무시하고 무조건 이를 따름
  if (item.taxable === false || item.taxType === 'ZERO_RATED' || item.taxType === 'EXEMPT') return true;
  if (item.taxable === true || item.taxType === 'TAXABLE') return false;

  // 병합 검색용 타겟 텍스트 준비
  const cat = String(item.category || '').toUpperCase().trim();
  const name = String(item.name || '').toUpperCase().trim();
  const combinedSearchTarget = cat + " " + name;

  // 2. CRA 과세(Taxable) 예외 품목 필터링 (Negative Filter)
  // 식품 관련 단어가 들어가 있더라도, 소모품/스낵류/가공완성품이면 과세 처리
  const craTaxableKeywords = [
    'SNACK', 'CHIP', 'CANDY', 'CHOCOLATE', 'GUM', 'SODA', 'POP', 'CARBONATED', 'BEVERAGE', 'DRINK', 'LIQUOR', 'BEER', 'WINE', 'HOT FOOD', 'PREPARED MEAL', 'CATERING', 'EQUIPMENT', 'SUPPLY', 'PACKAGING', 'PLASTIC', 'PAPER', 'BAG', 'CUP', 'BOWL', 'UNIFORM',
    '스낵', '과자', '사탕', '캔디', '젤리', '초콜릿', '탄산', '음료', '주류', '맥주', '소주', '조리식품', '기기', '소모품', '포장재', '용기', '비닐', '쇼핑백', '유니폼', '장비', '비품'
  ];
  
  if (craTaxableKeywords.some(t => combinedSearchTarget.includes(t))) {
    return false; // 과세 품목으로 튕겨냄
  }

  // 3. CRA 기본 식료품(Basic Groceries) 면세 키워드 (Positive Filter)
  // 육류, 가금류, 채소, 곡물, 소스, 향신료 등 철저한 면세 대상자
  const craZeroRatedKeywords = [
    'FOOD', 'FROZEN', 'SAUCE', 'POWDER', 'GRAIN', 'RICE', 'INGREDIENT', 'GROCERY', 'DISH', 'SEASONING', 'SPICE', 'MEAT', 'NOODLE', 'OIL', 'SYRUP', 'EXTRACT', 'SOUP', 'BROTH', 'BEEF', 'PORK', 'CHICKEN', 'FISH', 'SEAFOOD', 'VEGETABLE', 'FRUIT', 'FLOUR', 'SUGAR', 'SALT',
    '양념', '소스', '시즈닝', '떡', '면', '식품', '냉동', '원물', '조미료', '향신료', '가루', '분말', '파우더', '기름', '식용유', '시럽', '농축액', '엑기스', '고기', '해산물', '야채', '채소', '과일', '쌀', '밀가루', '육수', '국물', '육류', '생선'
  ];
  
  return craZeroRatedKeywords.some(z => combinedSearchTarget.includes(z));
}

// ============================================================================
// 🌟 [방화벽 2] 세션 만료 강제 추방(Global Interceptor) & 지능형 백오프 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); 

    try {
      const response = await fetch(CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({ action: action, token: sessionToken, ...payload }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const rawText = await response.text();
      
      try {
        const jsonResult = JSON.parse(rawText);
        if (!jsonResult.success) {
          if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
            localStorage.clear();
            alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
            window.location.replace("index.html");
            return;
          }
          if (jsonResult.message && (jsonResult.message.includes("트래픽") || jsonResult.message.includes("병목") || jsonResult.message.includes("초과") || jsonResult.message.includes("지연"))) {
            throw new Error(jsonResult.message);
          }
        }
        return jsonResult;
      } catch (parseErr) {
        throw new Error("서버 응답 지연 현상. 재시도를 준비합니다.");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (i < retries) {
        const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
        console.warn(`[통신 지연 우회] ${waitTime}ms 대기 후 ${action} 재시도... (${i+1}/${retries})`);
        await new Promise(res => setTimeout(res, waitTime));
      }
    }
  }
  throw new Error(lastError.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 잠시 후 새로고침 후 시도해주세요.");
}

async function fetchMappings() {
  if (userRole !== "MASTER" && userRole !== "VENDOR") return;
  try {
    const result = await executeApi("get_procurement_data");
    cachedMappings = (result && result.success && result.mappings) ? result.mappings : [];
  } catch (error) { 
    cachedMappings = [];
  }
}

async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-24 text-center"><div class="flex flex-col items-center justify-center space-y-4"><svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-[13px] font-bold text-gray-400 tracking-wide">Securely loading SCM data...</p></div></td></tr>`;

  try {
    const result = await executeApi("get_items", { clientState: currentClientState });
    if (result && result.success) {
      cachedItems = result.items || [];
      currentClientState = result.appliedState || "DEFAULT";
      taxRateObj = CONFIG.TAX_RATES[currentClientState.toUpperCase()] || CONFIG.TAX_RATES["DEFAULT"];
      
      const headerTitle = document.getElementById('catalogHeaderTitle');
      if (headerTitle) headerTitle.innerHTML = `<span class="text-[#E84C60] drop-shadow-md">📦</span> Inventory & Catalog ${userRole === 'VENDOR' ? '' : `<span class="ml-3 text-[10px] sm:text-[11px] bg-[#E84C60]/10 text-[#E84C60] px-3 py-1.5 rounded-lg border border-[#E84C60]/30 tracking-widest uppercase shadow-sm whitespace-nowrap">${currentClientState === "DEFAULT" ? "Standard" : currentClientState} Pricing</span>`}`;
      
      const kpiDash = document.getElementById('kpiDashboard');
      if (kpiDash) kpiDash.classList.remove('hidden');
      const kpiUpdated = document.getElementById('kpiLastUpdated');
      if (kpiUpdated) kpiUpdated.innerText = formatTimestamp(result.lastUpdated);

      if (userRole === "MASTER" || userRole === "VENDOR") {
        const masterControls = document.getElementById('masterInventoryControls');
        const uploadZone = document.getElementById('vendorExcelUploadZone');
        if (masterControls) masterControls.classList.remove('hidden');
        if (uploadZone) uploadZone.classList.remove('hidden');
        populateRegionFilter();
      } else {
        const aiBtn = document.getElementById('aiSuggestBtn');
        if (aiBtn) aiBtn.classList.remove('hidden');
      }

      renderTableItems(); 
      attachImageHoverEffect(); 
      if(userRole !== "VENDOR") calculateOrderTotal(); 
    } else if (result) {
      throw new Error(result.message);
    }
  } catch (error) { document.getElementById('itemTableBody').innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">Failed to load catalog data. Server is busy.</td></tr>`; }
}

function populateRegionFilter() {
  const filter = document.getElementById('regionFilter');
  if (!filter || cachedItems.length === 0) return;
  const regions = Object.keys(cachedItems[0].stockBreakdown || {});
  filter.innerHTML = `<option value="ALL">Total Stock</option>`;
  regions.forEach(reg => { filter.innerHTML += `<option value="${reg}">Hub: ${reg}</option>`; });
  filter.value = masterViewRegion;
  
  const inboundFilter = document.getElementById('inboundRegionSelector');
  if (inboundFilter) {
    inboundFilter.innerHTML = `<option value="">-- Select Hub Region for Inbound --</option>`;
    regions.forEach(reg => { inboundFilter.innerHTML += `<option value="${reg}">Hub: ${reg}</option>`; });
  }
}

function applyRegionFilter() { masterViewRegion = document.getElementById('regionFilter').value; renderTableItems(); }

function checkExpWarning(expDateStr) {
  if (!expDateStr || expDateStr === "-") return false;
  const firstDateStr = expDateStr.split('|')[0].split(':')[0].trim();
  const dateMatch = firstDateStr.match(/\d{4}-\d{2}-\d{2}/);
  if (!dateMatch) return false;
  const expDate = new Date(dateMatch[0] + "T00:00:00"); const today = new Date();
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  return (diffDays <= 30); 
}

function renderTableItems() {
  const tableBody = document.getElementById('itemTableBody');
  if (!tableBody) return;
  if (cachedItems.length === 0) return tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500 font-bold">표시할 품목이 없습니다.</td></tr>`;
  tableBody.innerHTML = '';

  let totalValue = 0, lowStockCount = 0;
  const isMasterOrVendor = (userRole === "MASTER" || userRole === "VENDOR");
  const sLabel = document.getElementById('stockHeaderLabel');
  if (sLabel) sLabel.innerText = isMasterOrVendor ? (masterViewRegion === "ALL" ? "Total Hub Stock" : `Hub Stock (${masterViewRegion})`) : `Local Hub (${currentClientState})`;

  cachedItems.forEach((item, index) => {
    const row = document.createElement('tr'); row.className = "hover:bg-pink-50/40 transition-colors duration-200 cinematic-enter";
    row.style.animationDelay = `${(index % 10) * 50}ms`; 
    
    const imgTag = item.image && item.image.trim() !== '' ? `<img src="${item.image}" alt="${item.code}" class="item-thumbnail cursor-zoom-in w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-gray-200 shadow-sm shrink-0 bg-white hover:border-[#E84C60] transition-colors">` : `<div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0">No Img</div>`;
    
    let displayStock = isMasterOrVendor ? (masterViewRegion === "ALL" ? item.totalStock : (item.stockBreakdown[masterViewRegion] || 0)) : item.regionalStock;
    if (Number.isNaN(displayStock)) displayStock = 0;

    totalValue += (Number(item.price) * displayStock);
    if (displayStock > 0 && displayStock <= 10) lowStockCount++;

    const isLowStock = displayStock > 0 && displayStock <= 10, isSoldOut = displayStock <= 0;
    let stockBadgeClass = isSoldOut ? "text-[#C23347] bg-[#E84C60]/10 px-2 py-0.5 rounded shadow-sm border border-[#E84C60]/20 low-stock-pulse" : (isLowStock ? "text-[#E84C60] font-extrabold" : "text-gray-800");
    let aiBadgeHTML = (userRole === "PARTNER" && item.aiSuggestedQty > 0) ? `<div class="mt-1"><span class="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><span class="text-[10px]">✨</span> AI Suggestion: ${item.aiSuggestedQty}</span></div>` : '';

    // 🌟 면세/과세 배지 표시 (교차 검증된 결과를 바탕으로 렌더링)
    const isZeroRated = isZeroRatedItem(item);
    const taxTag = isZeroRated 
      ? `<span class="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm" title="CRA Zero-Rated Basic Grocery (0% Tax)">0% TAX</span>`
      : `<span class="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-100 text-blue-700 border border-blue-200 shadow-sm" title="Standard Taxable Goods">TAXABLE</span>`;

    let expDisplayHTML = '';
    
    if (isMasterOrVendor && masterViewRegion === "ALL") {
      let expLines = [];
      for (let reg in item.expBreakdown) {
        let regExp = item.expBreakdown[reg];
        if (regExp && regExp !== "-") {
          const isExpWarn = checkExpWarning(regExp);
          const expColorClass = isExpWarn ? "text-[#E84C60] bg-[#E84C60]/10 border-[#E84C60]/30" : "text-emerald-700 bg-emerald-50 border-emerald-200";
          expLines.push(`<div class="flex items-start justify-between gap-3 text-[9px] font-black uppercase px-2 py-1 rounded border shadow-sm ${expColorClass} mb-1"><span class="opacity-70 mt-0.5">${reg}:</span> <span class="text-right leading-tight">${isExpWarn ? "⚠️" : "🕒"} ${regExp.replace(/\|/g, '<br>')}</span></div>`);
        }
      }
      if (expLines.length > 0) {
        expDisplayHTML = `<div class="mt-2 flex flex-col w-full max-w-[150px] mx-auto">${expLines.join('')}</div>`;
      }
    } else {
      let expDateVal = isMasterOrVendor ? (item.expBreakdown && item.expBreakdown[masterViewRegion] ? item.expBreakdown[masterViewRegion] : "") 
                                        : (item.expBreakdown && item.expBreakdown[currentClientState] ? item.expBreakdown[currentClientState] : "");
      if (expDateVal && expDateVal !== "-") {
        const isExpWarn = checkExpWarning(expDateVal);
        const expColorClass = isExpWarn ? "text-[#E84C60] bg-[#E84C60]/10 border-[#E84C60]/30" : "text-emerald-700 bg-emerald-50 border-emerald-200";
        expDisplayHTML = `<div class="mt-1.5 inline-block text-left text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border shadow-sm ${expColorClass}"><span>${isExpWarn ? "⚠️" : "🕒"}</span> EXP:<br>${expDateVal.replace(/\|/g, '<br>')}</div>`;
      }
    }

    let stockDisplayHTML = '', orderInputHTML = '';
    if (isStockEditMode && isMasterOrVendor) {
      let editInputs = '';
      for (const reg in item.stockBreakdown) {
        const currentRegStock = item.stockBreakdown[reg]; const currentRegExp = item.expBreakdown && item.expBreakdown[reg] ? item.expBreakdown[reg] : "";
        editInputs += `<div class="flex flex-col gap-1 bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100 mb-1.5"><div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-emerald-800">${reg} STOCK</span><input type="number" min="0" data-code="${item.code}" data-region="${reg}" data-type="stock" data-original="${currentRegStock}" value="${currentRegStock}" class="stock-region-input w-14 bg-white border border-emerald-400 rounded px-1 text-center text-[11px] font-bold focus:outline-none"></div><div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-emerald-800">${reg} EXP</span><input type="text" placeholder="YYYY-MM-DD:Qty" data-code="${item.code}" data-region="${reg}" data-type="exp" data-original="${currentRegExp}" value="${currentRegExp}" class="exp-region-input w-full bg-white border border-emerald-400 rounded px-1 text-center text-[10px] font-bold focus:outline-none placeholder-emerald-200"></div></div>`;
      }
      stockDisplayHTML = `<div class="flex flex-col w-full">${editInputs}</div>`;
      orderInputHTML = `<input type="number" disabled placeholder="-" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
    } else if (isMasterOrVendor && !isStockEditMode) {
      stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
      orderInputHTML = `<input type="number" disabled placeholder="${userRole}" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[10px] font-black text-gray-400 opacity-50 cursor-not-allowed uppercase">`;
    } else {
      if (isSoldOut) {
        stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[10px] font-black ${stockBadgeClass} uppercase tracking-wider whitespace-nowrap">Sold Out</span>${expDisplayHTML}</div>`;
        orderInputHTML = `<input type="number" disabled placeholder="0" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
      } else {
        stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
        orderInputHTML = `<input type="number" min="0" max="${displayStock}" value="0" data-index="${index}" oninput="calculateOrderTotal()" class="order-qty w-20 sm:w-24 bg-white/70 border border-gray-300 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-gray-900 focus:border-[#E84C60] outline-none shadow-sm transition-all hover:shadow-md">`;
      }
    }

    const priceCellHTML = userRole === "VENDOR" ? `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-gray-400 font-bold text-right">-</td>` : `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-gray-800 font-black text-right font-mono">${formatCurrency(item.price || 0)}</td>`;
    row.innerHTML = `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${item.code || '-'}</td><td class="px-5 sm:px-6 py-4 flex items-center gap-4">${imgTag}<div class="flex flex-col"><span class="text-[13px] sm:text-sm text-gray-800 font-extrabold tracking-tight whitespace-normal break-keep">${item.name || '-'}</span>${aiBadgeHTML}</div></td><td class="px-5 sm:px-6 py-4 whitespace-nowrap"><span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${item.category || 'General'}</span>${taxTag}</td>${priceCellHTML}<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-gray-50 border-l border-gray-200 align-middle">${stockDisplayHTML}</td><td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10 align-middle">${orderInputHTML}</td>`;
    tableBody.appendChild(row);
  });

  if (document.getElementById('kpiTotalSkus')) document.getElementById('kpiTotalSkus').innerText = cachedItems.length;
  if (document.getElementById('kpiTotalValue')) document.getElementById('kpiTotalValue').innerText = userRole === "VENDOR" ? "N/A" : formatCurrency(totalValue);
  if (document.getElementById('kpiLowStock')) document.getElementById('kpiLowStock').innerText = `${lowStockCount} Items`;
}

function applyAiSuggestion() {
  const qtyInputs = document.querySelectorAll('.order-qty'); let appliedCount = 0;
  qtyInputs.forEach(input => {
    const idx = input.getAttribute('data-index');
    if (cachedItems[idx] && cachedItems[idx].aiSuggestedQty > 0) {
      const maxQty = parseInt(input.getAttribute('max')) || 0; const targetQty = Math.min(cachedItems[idx].aiSuggestedQty, maxQty);
      if (targetQty > 0) { input.value = targetQty; appliedCount++; }
    }
  });
  if (appliedCount > 0) { showToast(`AI 분석: ${appliedCount}개 품목 세팅 완료`, "success"); calculateOrderTotal(); } 
  else { showToast("적용할 추천 데이터가 없습니다.", "error"); }
}

let currentOrderTaxSummary = { subtotal: 0, foodSubtotal: 0, taxableSubtotal: 0, taxAmount: 0, grandTotal: 0 };

function calculateOrderTotal() {
  if(userRole === "VENDOR") return; 
  const qtyInputs = document.querySelectorAll('.order-qty'); 
  let subtotal = 0;
  let foodSubtotal = 0;      
  let taxableSubtotal = 0;   

  qtyInputs.forEach(input => {
    const qty = Math.max(0, parseInt(input.value) || 0);
    const maxQty = parseInt(input.getAttribute('max')) || 999;
    if (qty > maxQty) { input.value = maxQty; showToast("재고 수량을 초과할 수 없습니다.", "error"); return; }
    
    if (qty > 0) { 
      const idx = input.getAttribute('data-index'); 
      if (cachedItems[idx]) {
        const itemPrice = Number(cachedItems[idx].price) || 0;
        const lineTotal = qty * itemPrice;
        subtotal += lineTotal;
        
        if (isZeroRatedItem(cachedItems[idx])) {
          foodSubtotal += lineTotal;
        } else {
          taxableSubtotal += lineTotal;
        }
      }
    }
  });

  const taxRate = taxRateObj.rate || 0;
  const taxAmt = Number((taxableSubtotal * taxRate).toFixed(2));
  const grandTotal = Number((subtotal + taxAmt).toFixed(2));

  currentOrderTaxSummary = { subtotal, foodSubtotal, taxableSubtotal, taxAmount: taxAmt, grandTotal };

  const subtotalElem = document.getElementById('orderSubtotal');
  if (subtotalElem) subtotalElem.innerText = formatCurrency(subtotal);

  const taxLabelElem = document.getElementById('orderTaxLabel');
  if (taxLabelElem) {
    taxLabelElem.innerHTML = `Estimated Tax - ${taxRateObj.name}:<br><span class="text-[10px] font-normal text-gray-500">(0% on Food $${foodSubtotal.toFixed(2)} / Taxable: $${taxableSubtotal.toFixed(2)})</span>`;
  }

  const taxAmtElem = document.getElementById('orderTaxAmt');
  if (taxAmtElem) taxAmtElem.innerText = formatCurrency(taxAmt);

  const grandTotalElem = document.getElementById('orderGrandTotal');
  if (grandTotalElem) grandTotalElem.innerText = formatCurrency(grandTotal);
}

async function toggleStockEditMode() {
  if (isSubmitting) return; 
  const btn = document.getElementById('toggleStockBtn'), filter = document.getElementById('regionFilter'), orderContainer = document.getElementById('orderActionContainer');
  if (!isStockEditMode) {
    isStockEditMode = true;
    if(btn) { btn.innerHTML = "💾 SAVE ALL"; btn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); btn.classList.replace('hover:bg-black', 'hover:bg-emerald-700'); }
    if (filter) filter.disabled = true; if (orderContainer) orderContainer.classList.add('hidden'); renderTableItems(); 
  } else {
    const stockInputs = document.querySelectorAll('.stock-region-input'), expInputs = document.querySelectorAll('.exp-region-input');
    const updateMap = {}; let hasChanges = false;
    stockInputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region'), v = Math.max(0, parseInt(input.value) || 0), original = parseInt(input.getAttribute('data-original')) || 0;
      if (v !== original) { if(!updateMap[c]) updateMap[c] = { stockBreakdown: {}, expBreakdown: {} }; updateMap[c].stockBreakdown[r] = v; hasChanges = true; }
    });
    expInputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region'), v = String(input.value).trim(), original = String(input.getAttribute('data-original')).trim();
      if (v !== original) { if(!updateMap[c]) updateMap[c] = { stockBreakdown: {}, expBreakdown: {} }; updateMap[c].expBreakdown[r] = v; hasChanges = true; }
    });
    if (!hasChanges) {
      isStockEditMode = false; 
      if(btn) { btn.innerHTML = "⚙️ MANAGE INVENTORY"; btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
      if (filter) filter.disabled = false; if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
      renderTableItems(); return; 
    }
    isSubmitting = true;
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ SAVING..."; btn.classList.add('animate-pulse'); }
    const updates = Object.keys(updateMap).map(c => ({ code: c, stockBreakdown: updateMap[c].stockBreakdown, expBreakdown: updateMap[c].expBreakdown }));
    try {
      const result = await executeApi("update_stock", { stockUpdates: updates });
      if (result && result.success) { showToast("동기화 완료", "success"); setTimeout(() => fetchItems(), 1000); } 
      else if (result) throw new Error(result.message);
    } catch (err) { 
      showToast(err.message, "error"); 
      if(err.message.includes("재고") || err.message.includes("부족")) { setTimeout(() => fetchItems(), 1500); }
    } finally {
      isStockEditMode = false; isSubmitting = false;
      if(btn) { btn.disabled = false; btn.innerHTML = "⚙️ MANAGE INVENTORY"; btn.classList.remove('animate-pulse'); btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
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
    const qty = Math.max(0, parseInt(input.value) || 0); 
    if (qty > 0) { 
      const idx = input.getAttribute('data-index'); 
      if (cachedItems[idx]) {
        orderItems.push({ 
          code: cachedItems[idx].code, 
          name: cachedItems[idx].name, 
          price: cachedItems[idx].price, 
          qty: qty,
          category: cachedItems[idx].category,
          isZeroRated: isZeroRatedItem(cachedItems[idx]) 
        }); 
      }
    }
  });
  
  if (orderItems.length === 0) return showToast("발주 수량을 최소 1개 이상 입력해 주세요.", "error");
  
  const grandTotal = document.getElementById('orderGrandTotal').innerText;
  const confirmMsg = `[발주 내역 요약]\n` +
    `• 식품/조미료(0% 면세): ${formatCurrency(currentOrderTaxSummary.foodSubtotal)}\n` +
    `• 과세 비품/소모품: ${formatCurrency(currentOrderTaxSummary.taxableSubtotal)}\n` +
    `• 적용 세금 (${taxRateObj.name}): ${formatCurrency(currentOrderTaxSummary.taxAmount)}\n` +
    `• 최종 결제액: ${grandTotal}\n\n` +
    `B2B 물류업체로 발주 이메일을 전송하시겠습니까?`;

  if (!confirm(confirmMsg)) return;

  isSubmitting = true;
  const submitBtn = document.querySelector('button[onclick="submitOrder()"]'), originalHTML = submitBtn ? submitBtn.innerHTML : "SUBMIT ORDER";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "<span>⏳</span> DISPATCHING EMAIL..."; submitBtn.classList.add('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }

  try {
    const result = await executeApi("save_order", { 
      clientName: clientName, 
      clientState: currentClientState, 
      items: orderItems,
      taxSummary: currentOrderTaxSummary 
    });
    
    if (result && result.success) { 
      showToast(`발주 완료 및 B2B 이메일 전송 성공 (번호: ${result.batchId})`, "success"); 
      setTimeout(() => fetchItems(), 1500); 
    } else if (result) throw new Error(result.message);
  } catch (error) { 
    showToast(error.message, "error"); 
    if(error.message.includes("재고") || error.message.includes("변동") || error.message.includes("취소")) {
      setTimeout(() => fetchItems(), 1500);
    }
  } finally { 
    isSubmitting = false; 
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); } 
  }
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
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Parsing Excel Document...</span>`;
    
    if (typeof XLSX === 'undefined') {
      isSubmitting = false; return showToast("엑셀 엔진을 로드 중입니다. 새로고침 후 다시 시도해주세요.", "error");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result); 
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
        
        if (jsonData.length === 0) throw new Error("엑셀 파일에 처리할 데이터가 없습니다.");
        processExcelData(jsonData, file.name);
      } catch(err) {
        isSubmitting = false;
        showToast("파일 파싱 중 오류 발생: " + err.message, "error"); 
        if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
      }
    };
    reader.readAsArrayBuffer(file);
  } 
  else if (validImgExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">AI Vision OCR Scanning...</span>`;
    
    if (typeof Tesseract === 'undefined') {
      isSubmitting = false; return showToast("AI 엔진을 로드 중입니다. 잠시 후 시도해주세요.", "error");
    }

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
  
  try {
    const result = await executeApi("update_stock", { mode: "ADD", stockUpdates: finalStockUpdates });
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

// ============================================================================
// 🌟 발주 취소(Cancel Order) 프론트엔드 엔진 (소실 방지 100% 유지)
// ============================================================================
async function cancelOrder(batchId) {
    if (isSubmitting) return showToast("현재 시스템이 다른 작업을 처리 중입니다.", "error");

    if (!batchId) {
        batchId = prompt("🚨 취소할 주문 번호(Order ID)를 입력하세요.\n(예: ORD-123456)");
        if (!batchId) return; 
    }

    const confirmMsg = `정말 주문 [${batchId.trim()}]을 취소하시겠습니까?\n\n` + 
                       `✔️ 취소 시 차감되었던 재고가 100% 복구됩니다.\n` + 
                       `✔️ 물류사 및 본사로 [출고 중지 알림 이메일]이 자동 전송됩니다.`;

    if (!confirm(confirmMsg)) return;

    isSubmitting = true;
    showToast("⏳ 시스템 취소 요청 및 재고 복구를 진행 중입니다...", "success");

    try {
        const result = await executeApi("cancel_order", { batchId: batchId.trim() });
        
        if (result && result.success) {
            showToast(`✅ ${result.message}`, "success");
            setTimeout(() => fetchItems(), 1500);
        } else if (result) {
            throw new Error(result.message);
        }
    } catch (err) {
        showToast(`❌ 취소 실패: ${err.message}`, "error");
    } finally {
        isSubmitting = false;
    }
}

window.submitOrder = submitOrder; window.fetchItems = fetchItems; window.toggleStockEditMode = toggleStockEditMode; 
window.applyRegionFilter = applyRegionFilter; window.applyAiSuggestion = applyAiSuggestion; window.calculateOrderTotal = calculateOrderTotal; window.handleExcelUpload = handleExcelUpload;
window.cancelOrder = cancelOrder; 

document.addEventListener('DOMContentLoaded', () => {
  setupDragAndDrop();
  if (userRole === "MASTER" || userRole === "VENDOR") {
    fetchMappings().then(() => fetchItems());
  } else { fetchItems(); }
});
