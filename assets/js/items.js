// assets/js/items.js

const userRole = (localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);
const cachedClientState = localStorage.getItem("y2c_premium_state") || "DEFAULT";

if (!sessionToken || !clientName) {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = clientName;
const badge = document.getElementById('userRoleBadge');
if(badge) { 
  badge.classList.remove('hidden'); 
  badge.innerText = userRole; 
}

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
  localStorage.clear(); 
  window.location.href = "index.html"; 
});

// 🌟 [엔터프라이즈 방화벽] VENDOR 권한 접속 시 불필요/민감 UI 원천 삭제
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

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) { 
    container = document.createElement('div'); 
    container.id = 'toastContainer'; 
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
    document.body.appendChild(container); 
  }
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#C23347]';
  const icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

let cachedItems = [];
let cachedMappings = []; // 엑셀 매핑용 DB 보관
let isStockEditMode = false; 
let currentClientState = cachedClientState; 
let masterViewRegion = "ALL"; 
let taxRateObj = { name: "Standard Tax (13%)", rate: 0.13 };
let isSubmitting = false;

// 🌟 [신규 추가] 엑셀 파싱을 위한 벤더 매핑 DB 로드 (마스터 및 벤더 전용)
async function fetchMappings() {
  if (userRole !== "MASTER" && userRole !== "VENDOR") return;
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_PROCUREMENT, token: sessionToken })
    });
    const result = JSON.parse(await response.text());
    if (result.success) {
      cachedMappings = result.mappings || [];
    }
  } catch (error) {
    console.error("Mapping DB Load Error:", error);
  }
}

async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-24 text-center"><div class="flex flex-col items-center justify-center space-y-4"><svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-[13px] font-bold text-gray-400 tracking-wide">Securely loading SCM data...</p></div></td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.ITEMS, token: sessionToken, clientState: currentClientState }) 
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      cachedItems = result.items || [];
      currentClientState = result.appliedState || "DEFAULT";
      taxRateObj = SYSTEM_CONFIG.TAX_RATES[currentClientState.toUpperCase()] || SYSTEM_CONFIG.TAX_RATES["DEFAULT"];
      
      const taxLabel = document.getElementById('orderTaxLabel');
      if (taxLabel) taxLabel.innerText = `Estimated Tax - ${taxRateObj.name}:`;

      const headerTitle = document.getElementById('catalogHeaderTitle');
      if (headerTitle) {
        headerTitle.innerHTML = `<span class="text-2xl">📦</span> Inventory & Catalog ${userRole === 'VENDOR' ? '' : `<span class="ml-3 text-[10px] sm:text-[11px] bg-[var(--y2c-gold)]/10 text-[var(--y2c-gold)] px-3 py-1.5 rounded-lg border border-[var(--y2c-gold)]/30 tracking-widest uppercase shadow-sm whitespace-nowrap">${currentClientState === "DEFAULT" ? "Standard" : currentClientState} Pricing</span>`}`;
      }
      
      const kpiDash = document.getElementById('kpiDashboard');
      if (kpiDash) kpiDash.classList.remove('hidden');
      const kpiUpdated = document.getElementById('kpiLastUpdated');
      if (kpiUpdated) kpiUpdated.innerText = formatTimestamp(result.lastUpdated);

      if (userRole === "MASTER" || userRole === "VENDOR") {
        const masterControls = document.getElementById('masterInventoryControls');
        const excelZone = document.getElementById('vendorExcelUploadZone');
        if (masterControls) masterControls.classList.remove('hidden');
        if (excelZone) excelZone.classList.remove('hidden'); // 벤더 다이렉트 업로드 UI 활성화
        populateRegionFilter();
      } else {
        const aiBtn = document.getElementById('aiSuggestBtn');
        if (aiBtn) aiBtn.classList.remove('hidden');
      }

      renderTableItems(); 
      attachImageHoverEffect(); 
      if(userRole !== "VENDOR") calculateOrderTotal(); 

    } else {
      if (result.message.includes("만료") || result.message.includes("로그인")) { 
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return; 
      }
      throw new Error(result.message);
    }
  } catch (error) {
    document.getElementById('itemTableBody').innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">Failed to load catalog data.</td></tr>`;
  }
}

function populateRegionFilter() {
  const filter = document.getElementById('regionFilter');
  if (!filter || cachedItems.length === 0) return;
  const regions = Object.keys(cachedItems[0].stockBreakdown || {});
  filter.innerHTML = `<option value="ALL">Total Stock</option>`;
  regions.forEach(reg => { filter.innerHTML += `<option value="${reg}">Hub: ${reg}</option>`; });
  filter.value = masterViewRegion;
  
  // 엑셀 업로드 지역 셀렉터도 동기화
  const inboundFilter = document.getElementById('inboundRegionSelector');
  if (inboundFilter) {
    inboundFilter.innerHTML = `<option value="">-- Select Hub Region for Excel --</option>`;
    regions.forEach(reg => { inboundFilter.innerHTML += `<option value="${reg}">Hub: ${reg}</option>`; });
  }
}

function applyRegionFilter() {
  masterViewRegion = document.getElementById('regionFilter').value;
  renderTableItems(); 
}

function renderTableItems() {
  const tableBody = document.getElementById('itemTableBody');
  if (!tableBody) return;
  if (cachedItems.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500 font-bold">표시할 품목이 없습니다.</td></tr>`;
    return;
  }
  tableBody.innerHTML = '';

  let totalValue = 0, lowStockCount = 0;
  const isMasterOrVendor = (userRole === "MASTER" || userRole === "VENDOR");

  const sLabel = document.getElementById('stockHeaderLabel');
  if (sLabel) {
    sLabel.innerText = isMasterOrVendor ? (masterViewRegion === "ALL" ? "Total Hub Stock" : `Hub Stock (${masterViewRegion})`) : `Local Hub (${currentClientState})`;
  }

  cachedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.className = "hover:bg-gray-50/50 transition-colors duration-200";
    
    const imgTag = item.image && item.image.trim() !== '' 
      ? `<img src="${item.image}" alt="${item.code}" class="item-thumbnail cursor-zoom-in w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-gray-200 shadow-sm shrink-0 bg-white hover:border-[#E84C60] transition-colors">` 
      : `<div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0">No Img</div>`;

    let displayStock = isMasterOrVendor ? (masterViewRegion === "ALL" ? item.totalStock : (item.stockBreakdown[masterViewRegion] || 0)) : item.regionalStock;
    totalValue += (Number(item.price) * displayStock);
    if (displayStock > 0 && displayStock <= 10) lowStockCount++;

    const isLowStock = displayStock > 0 && displayStock <= 10;
    const isSoldOut = displayStock <= 0;
    
    let stockBadgeClass = "text-[var(--premium-charcoal)]";
    if (isSoldOut) stockBadgeClass = "text-[#C23347] bg-[#E84C60]/10 px-2 py-0.5 rounded shadow-sm border border-[#E84C60]/20 low-stock-pulse";
    else if (isLowStock) stockBadgeClass = "text-[#E84C60] font-extrabold";

    let aiBadgeHTML = '';
    if (userRole === "PARTNER" && item.aiSuggestedQty > 0) {
      aiBadgeHTML = `<div class="mt-1"><span class="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><span class="text-[10px]">✨</span> AI Suggestion: ${item.aiSuggestedQty}</span></div>`;
    }

    let stockDisplayHTML = '', orderInputHTML = '';
    
    if (isStockEditMode && isMasterOrVendor) {
      let editInputs = '';
      for (const reg in item.stockBreakdown) {
        const currentRegStock = item.stockBreakdown[reg];
        editInputs += `<div class="flex items-center justify-between gap-2 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 mb-1">
          <span class="text-[9px] font-black text-emerald-800">${reg}</span>
          <input type="number" min="0" data-code="${item.code}" data-region="${reg}" data-original="${currentRegStock}" value="${currentRegStock}" class="stock-region-input w-12 bg-white border border-emerald-400 rounded px-1 text-center text-[11px] font-bold focus:outline-none">
        </div>`;
      }
      stockDisplayHTML = `<div class="flex flex-col w-full">${editInputs}</div>`;
      orderInputHTML = `<input type="number" disabled placeholder="-" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
    } 
    else if (isMasterOrVendor && !isStockEditMode) {
      stockDisplayHTML = `<span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>`;
      orderInputHTML = `<input type="number" disabled placeholder="${userRole}" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[10px] font-black text-gray-400 opacity-50 cursor-not-allowed uppercase">`;
    } 
    else {
      if (isSoldOut) {
        stockDisplayHTML = `<span class="text-[10px] font-black ${stockBadgeClass} uppercase tracking-wider whitespace-nowrap">Sold Out</span>`;
        orderInputHTML = `<input type="number" disabled placeholder="0" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
      } else {
        stockDisplayHTML = `<span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>`;
        orderInputHTML = `<input type="number" min="0" max="${displayStock}" value="0" data-index="${index}" oninput="calculateOrderTotal()" class="order-qty w-20 sm:w-24 bg-white/70 border border-gray-300 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-gray-900 focus:border-[#E84C60] outline-none shadow-sm transition-all">`;
      }
    }

    const priceCellHTML = userRole === "VENDOR" 
      ? `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-gray-400 font-bold text-right">-</td>` 
      : `<td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-black text-right font-mono">${formatCurrency(item.price || 0)}</td>`;

    row.innerHTML = `
      <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${item.code || '-'}</td>
      <td class="px-5 sm:px-6 py-4 flex items-center gap-4">
        ${imgTag}
        <div class="flex flex-col">
          <span class="text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-extrabold tracking-tight whitespace-normal break-keep">${item.name || '-'}</span>
          ${aiBadgeHTML}
        </div>
      </td>
      <td class="px-5 sm:px-6 py-4 whitespace-nowrap"><span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${item.category || 'General'}</span></td>
      ${priceCellHTML}
      <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[var(--y2c-gold)]/5 border-l border-gray-200 align-middle">${stockDisplayHTML}</td>
      <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10 align-middle">${orderInputHTML}</td>
    `;
    tableBody.appendChild(row);
  });

  const kpiTotal = document.getElementById('kpiTotalSkus');
  if (kpiTotal) kpiTotal.innerText = cachedItems.length;

  if(userRole === "VENDOR") {
    const vKpi = document.getElementById('kpiTotalValue');
    if(vKpi) vKpi.innerText = "N/A";
  } else {
    const vKpi = document.getElementById('kpiTotalValue');
    if(vKpi) vKpi.innerText = formatCurrency(totalValue);
  }
  const lowKpi = document.getElementById('kpiLowStock');
  if (lowKpi) lowKpi.innerText = `${lowStockCount} Items`;
}

function applyAiSuggestion() {
  const qtyInputs = document.querySelectorAll('.order-qty');
  let appliedCount = 0;
  qtyInputs.forEach(input => {
    const idx = input.getAttribute('data-index');
    if (cachedItems[idx] && cachedItems[idx].aiSuggestedQty > 0) {
      const maxQty = parseInt(input.getAttribute('max')) || 0;
      const targetQty = Math.min(cachedItems[idx].aiSuggestedQty, maxQty);
      if (targetQty > 0) {
        input.value = targetQty;
        appliedCount++;
      }
    }
  });
  if (appliedCount > 0) {
    showToast(`AI 분석 결과로 ${appliedCount}개 품목의 발주 수량이 세팅되었습니다.`, "success");
    calculateOrderTotal();
  } else {
    showToast("적용할 AI 추천 데이터가 없습니다. (최근 90일 데이터 분석)", "error");
  }
}

function calculateOrderTotal() {
  if(userRole === "VENDOR") return; 
  const qtyInputs = document.querySelectorAll('.order-qty');
  let subtotal = 0;
  qtyInputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    const maxQty = parseInt(input.getAttribute('max')) || 999;
    if (qty > maxQty) { input.value = maxQty; showToast("재고 수량을 초과하여 주문할 수 없습니다.", "error"); return; }
    if (qty > 0) { const idx = input.getAttribute('data-index'); if (cachedItems[idx]) subtotal += (qty * Number(cachedItems[idx].price)); }
  });
  const taxAmt = subtotal * taxRateObj.rate;
  const grandTotal = subtotal + taxAmt;
  
  const eleSub = document.getElementById('orderSubtotal');
  const eleTax = document.getElementById('orderTaxAmt');
  const eleGrand = document.getElementById('orderGrandTotal');
  if(eleSub) eleSub.innerText = formatCurrency(subtotal);
  if(eleTax) eleTax.innerText = formatCurrency(taxAmt);
  if(eleGrand) eleGrand.innerText = formatCurrency(grandTotal);
}

// 🌟 [최적화] 스마트 Diff 방화벽 로직 유지
async function toggleStockEditMode() {
  if (isSubmitting) return; // 광클 방어
  const btn = document.getElementById('toggleStockBtn');
  const filter = document.getElementById('regionFilter');
  const orderContainer = document.getElementById('orderActionContainer');
  
  if (!isStockEditMode) {
    isStockEditMode = true;
    if(btn) { btn.innerHTML = "💾 SAVE ALL"; btn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); btn.classList.replace('hover:bg-black', 'hover:bg-emerald-700'); }
    if (filter) filter.disabled = true; 
    if (orderContainer) orderContainer.classList.add('hidden');
    renderTableItems(); 
  } else {
    const inputs = document.querySelectorAll('.stock-region-input');
    const updateMap = {};
    let hasChanges = false;
    
    inputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region');
      const v = parseInt(input.value) || 0;
      const original = parseInt(input.getAttribute('data-original')) || 0;
      
      if (v !== original) {
        if(!updateMap[c]) updateMap[c] = {};
        updateMap[c][r] = v;
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      isStockEditMode = false; 
      if(btn) { btn.innerHTML = "⚙️ MANAGE"; btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
      if (filter) filter.disabled = false; 
      if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
      renderTableItems(); 
      return; 
    }

    isSubmitting = true;
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ SAVING..."; btn.classList.add('animate-pulse'); }
    const updates = Object.keys(updateMap).map(c => ({ code: c, stockBreakdown: updateMap[c] }));

    try {
      const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_STOCK, token: sessionToken, stockUpdates: updates })
      });
      const result = JSON.parse(await response.text());

      if (result.success) {
        showToast("재고가 안전하게 동기화되었습니다.", "success");
        setTimeout(() => fetchItems(), 1000); 
      } else throw new Error(result.message);
    } catch (err) { 
      showToast("업데이트 실패: " + err.message, "error"); 
    } finally {
      isStockEditMode = false; isSubmitting = false;
      if(btn) { btn.disabled = false; btn.innerHTML = "⚙️ MANAGE"; btn.classList.remove('animate-pulse'); btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black'); }
      if (filter) filter.disabled = false; 
      if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
    }
  }
}

function attachImageHoverEffect() {
  const tableBody = document.getElementById('itemTableBody');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const previewImg = document.getElementById('imagePreview');
  if (!tableBody || !previewContainer || !previewImg) return;
  tableBody.addEventListener('mouseover', (e) => { if (e.target.classList.contains('item-thumbnail')) { previewImg.src = e.target.src; previewContainer.classList.remove('hidden'); setTimeout(() => { previewContainer.classList.remove('scale-95', 'opacity-0'); previewContainer.classList.add('scale-100', 'opacity-100'); }, 10); } });
  tableBody.addEventListener('mousemove', (e) => { if (e.target.classList.contains('item-thumbnail')) { const x = Math.min(e.clientX + 20, window.innerWidth - 300); const y = Math.min(e.clientY + 20, window.innerHeight - 300); previewContainer.style.left = x + 'px'; previewContainer.style.top = y + 'px'; } });
  tableBody.addEventListener('mouseout', (e) => { if (e.target.classList.contains('item-thumbnail')) { previewContainer.classList.remove('scale-100', 'opacity-100'); previewContainer.classList.add('scale-95', 'opacity-0'); setTimeout(() => { previewContainer.classList.add('hidden'); previewImg.src = ''; }, 200); } });
}

async function submitOrder() {
  if(userRole === "VENDOR" || isSubmitting) return;
  const qtyInputs = document.querySelectorAll('.order-qty');
  const orderItems = [];
  qtyInputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) { const idx = input.getAttribute('data-index'); if (cachedItems[idx]) orderItems.push({ code: cachedItems[idx].code, name: cachedItems[idx].name, price: cachedItems[idx].price, qty: qty }); }
  });
  
  if (orderItems.length === 0) { showToast("발주 수량을 최소 1개 이상 입력해 주세요.", "error"); return; }
  
  const grandTotal = document.getElementById('orderGrandTotal').innerText;
  if (!confirm(`총 ${orderItems.length}개 품목 (세금 포함 총액: ${grandTotal})\n발주를 서버로 전송하시겠습니까?`)) return;

  isSubmitting = true;
  const submitBtn = document.querySelector('button[onclick="submitOrder()"]');
  const originalHTML = submitBtn ? submitBtn.innerHTML : "SUBMIT ORDER";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "<span>⏳</span> PROCESSING..."; submitBtn.classList.add('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.ORDER, token: sessionToken, clientName: clientName, clientState: currentClientState, items: orderItems })
    });
    const result = JSON.parse(await response.text());
    if (result.success) {
      showToast(`발주가 완료되었습니다! (번호: ${result.batchId})`, "success"); setTimeout(() => fetchItems(), 1500); 
    } else showToast("접수 실패: " + result.message, "error"); 
  } catch (error) { 
    showToast("통신 오류 발생.", "error"); 
  } finally { 
    isSubmitting = false;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); } 
  }
}

// 🌟 [신규 통합] 벤더 다이렉트 엑셀 업로드 엔진 (SheetJS 활용)
function handleExcelUpload(event) {
  event.preventDefault();
  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];
  if (!file) return;

  const validExts = [".xlsx", ".xls", ".csv"];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExts.includes(fileExt)) return showToast("지원하지 않는 엑셀 포맷입니다 (.xlsx, .xls)", "error");

  const statusText = document.getElementById('uploadStatusText');
  if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Scanning Document...</span>`;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
      
      processExcelData(jsonData, file.name);
      
    } catch(err) {
      showToast("파일 파싱 중 오류가 발생했습니다.", "error");
      if(statusText) statusText.innerHTML = "Drag & Drop vendor excel file here";
    }
  };
  reader.readAsArrayBuffer(file);
}

async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector').value;
  if (!targetRegion) {
    showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel file here";
    return;
  }

  if (cachedMappings.length === 0) {
    showToast("벤더 매핑 DB가 아직 로드되지 않았습니다. 잠시 후 다시 시도하세요.", "error");
    return;
  }

  let mappedUpdates = {};
  let successCount = 0;
  let failCount = 0;

  jsonData.forEach(row => {
    // 벤더사마다 다른 헤더명을 스마트하게 파악
    const vItemCode = String(row["Item#"] || row["Item Code"] || row["품번"] || row["Barcode"] || "").trim();
    const vQty = row["Qty"] || row["Quantity"] || row["수량"] || row["Stock"] || 0;
    const parsedQty = parseInt(vQty);

    if (vItemCode !== "" && !isNaN(parsedQty)) {
      const mapObj = cachedMappings.find(m => m.vendorCode.toLowerCase() === vItemCode.toLowerCase());
      if (mapObj) {
        if(!mappedUpdates[mapObj.hqCode]) mappedUpdates[mapObj.hqCode] = {};
        mappedUpdates[mapObj.hqCode][targetRegion] = parsedQty;
        successCount++;
      } else {
        failCount++;
      }
    }
  });

  if (successCount === 0) {
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel file here";
    showToast("매칭되는 품목이 0건입니다. Vendor_Mapping DB를 확인하세요.", "error");
    return;
  }

  const finalStockUpdates = Object.keys(mappedUpdates).map(hqCode => ({
    code: hqCode,
    stockBreakdown: mappedUpdates[hqCode]
  }));

  document.getElementById('uploadStatusText').innerHTML = `<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${successCount} Items...</span>`;
  
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_STOCK, token: sessionToken, stockUpdates: finalStockUpdates })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      showToast(`엑셀 처리 완료: ${successCount}건 성공 (실패: ${failCount}건)`, "success");
      document.getElementById('uploadStatusText').innerHTML = `<span class="text-emerald-600 font-bold">✅ Uploaded: ${filename}</span>`;
      setTimeout(() => fetchItems(), 1500); // UI 갱신
    } else throw new Error(result.message);
  } catch (err) {
    showToast("엑셀 동기화 실패: " + err.message, "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel file here";
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if(!dropZone) return;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-[#E84C60]/10', 'border-[#E84C60]'); });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-[#E84C60]/10', 'border-[#E84C60]'); });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('bg-[#E84C60]/10', 'border-[#E84C60]'); handleExcelUpload(e); });
  
  const fileInput = document.getElementById('excelFileInput');
  if(fileInput) fileInput.addEventListener('change', handleExcelUpload);
}

// 윈도우 객체 바인딩 (HTML에서 인라인 함수 호출 방어용)
window.submitOrder = submitOrder; 
window.fetchItems = fetchItems; 
window.toggleStockEditMode = toggleStockEditMode; 
window.applyRegionFilter = applyRegionFilter; 
window.applyAiSuggestion = applyAiSuggestion; 
window.calculateOrderTotal = calculateOrderTotal;
window.handleExcelUpload = handleExcelUpload;

// 🌟 시작 시 매핑 DB 로드 후 카탈로그 렌더링 (병렬 처리)
document.addEventListener('DOMContentLoaded', () => {
  setupDragAndDrop();
  if (userRole === "MASTER" || userRole === "VENDOR") {
    fetchMappings().then(() => fetchItems());
  } else {
    fetchItems();
  }
});
