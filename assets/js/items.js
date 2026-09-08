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

// 🌟 [방화벽] VENDOR 권한 접속 시 불필요 UI 차단
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
let isStockEditMode = false; 
let currentClientState = cachedClientState; 
let masterViewRegion = "ALL"; 
let taxRateObj = { name: "Standard Tax (13%)", rate: 0.13 };
let isSubmitting = false;

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
  
  const inboundFilter = document.getElementById('inboundRegionSelector');
  if (inboundFilter) {
    inboundFilter.innerHTML = `<option value="">-- Select Hub Region for Inbound --</option>`;
    regions.forEach(reg => { inboundFilter.innerHTML += `<option value="${reg}">Hub: ${reg}</option>`; });
  }
}

function applyRegionFilter() {
  masterViewRegion = document.getElementById('regionFilter').value;
  renderTableItems(); 
}

// 🌟 [신규] 다중 유통기한 임박 판단 (가장 첫 번째 날짜 기준 판별)
function checkExpWarning(expDateStr) {
  if (!expDateStr || expDateStr === "-") return false;
  // 문자열 예: "2026-10-13:42 | 2026-12-08:6" -> 첫 번째 날짜 추출
  const firstDateStr = expDateStr.split('|')[0].split(':')[0].trim();
  const dateMatch = firstDateStr.match(/\d{4}-\d{2}-\d{2}/);
  if (!dateMatch) return false;
  
  const expDate = new Date(dateMatch[0] + "T00:00:00"); // 시간 영향 배제
  const today = new Date();
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  return (diffDays <= 30); 
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

    let expDisplayHTML = '';
    let expDateVal = "";
    if (isMasterOrVendor && masterViewRegion !== "ALL") {
      expDateVal = item.expBreakdown && item.expBreakdown[masterViewRegion] ? item.expBreakdown[masterViewRegion] : "";
    } else if (!isMasterOrVendor) {
      expDateVal = item.expBreakdown && item.expBreakdown[currentClientState] ? item.expBreakdown[currentClientState] : "";
    }
    
    if (expDateVal) {
      const isExpWarn = checkExpWarning(expDateVal);
      const expColorClass = isExpWarn ? "text-[#E84C60] bg-[#E84C60]/10 border-[#E84C60]/30" : "text-emerald-700 bg-emerald-50 border-emerald-200";
      const expIcon = isExpWarn ? "⚠️" : "🕒";
      expDisplayHTML = `<div class="mt-1.5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm ${expColorClass}"><span>${expIcon}</span> EXP: ${expDateVal}</div>`;
    }

    let stockDisplayHTML = '', orderInputHTML = '';
    
    if (isStockEditMode && isMasterOrVendor) {
      let editInputs = '';
      for (const reg in item.stockBreakdown) {
        const currentRegStock = item.stockBreakdown[reg];
        const currentRegExp = item.expBreakdown && item.expBreakdown[reg] ? item.expBreakdown[reg] : "";
        
        editInputs += `<div class="flex flex-col gap-1 bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100 mb-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[9px] font-black text-emerald-800">${reg} STOCK</span>
            <input type="number" min="0" data-code="${item.code}" data-region="${reg}" data-type="stock" data-original="${currentRegStock}" value="${currentRegStock}" class="stock-region-input w-14 bg-white border border-emerald-400 rounded px-1 text-center text-[11px] font-bold focus:outline-none">
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-[9px] font-black text-emerald-800">${reg} EXP</span>
            <input type="text" placeholder="YYYY-MM-DD:Qty" data-code="${item.code}" data-region="${reg}" data-type="exp" data-original="${currentRegExp}" value="${currentRegExp}" class="exp-region-input w-full bg-white border border-emerald-400 rounded px-1 text-center text-[10px] font-bold focus:outline-none placeholder-emerald-200">
          </div>
        </div>`;
      }
      stockDisplayHTML = `<div class="flex flex-col w-full">${editInputs}</div>`;
      orderInputHTML = `<input type="number" disabled placeholder="-" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
    } 
    else if (isMasterOrVendor && !isStockEditMode) {
      stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
      orderInputHTML = `<input type="number" disabled placeholder="${userRole}" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[10px] font-black text-gray-400 opacity-50 cursor-not-allowed uppercase">`;
    } 
    else {
      if (isSoldOut) {
        stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[10px] font-black ${stockBadgeClass} uppercase tracking-wider whitespace-nowrap">Sold Out</span>${expDisplayHTML}</div>`;
        orderInputHTML = `<input type="number" disabled placeholder="0" class="w-20 sm:w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 py-1.5 text-center text-[13px] font-bold text-gray-400 opacity-50 cursor-not-allowed">`;
      } else {
        stockDisplayHTML = `<div class="flex flex-col items-center"><span class="text-[13px] sm:text-sm font-black font-mono ${stockBadgeClass}">${displayStock}</span>${expDisplayHTML}</div>`;
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

  if (document.getElementById('kpiTotalSkus')) document.getElementById('kpiTotalSkus').innerText = cachedItems.length;
  if (document.getElementById('kpiTotalValue')) document.getElementById('kpiTotalValue').innerText = userRole === "VENDOR" ? "N/A" : formatCurrency(totalValue);
  if (document.getElementById('kpiLowStock')) document.getElementById('kpiLowStock').innerText = `${lowStockCount} Items`;
}

function applyAiSuggestion() {
  const qtyInputs = document.querySelectorAll('.order-qty');
  let appliedCount = 0;
  qtyInputs.forEach(input => {
    const idx = input.getAttribute('data-index');
    if (cachedItems[idx] && cachedItems[idx].aiSuggestedQty > 0) {
      const maxQty = parseInt(input.getAttribute('max')) || 0;
      const targetQty = Math.min(cachedItems[idx].aiSuggestedQty, maxQty);
      if (targetQty > 0) { input.value = targetQty; appliedCount++; }
    }
  });
  if (appliedCount > 0) { showToast(`AI 분석: ${appliedCount}개 품목 세팅 완료`, "success"); calculateOrderTotal(); } 
  else { showToast("적용할 AI 추천 데이터가 없습니다.", "error"); }
}

function calculateOrderTotal() {
  if(userRole === "VENDOR") return; 
  const qtyInputs = document.querySelectorAll('.order-qty');
  let subtotal = 0;
  qtyInputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    const maxQty = parseInt(input.getAttribute('max')) || 999;
    if (qty > maxQty) { input.value = maxQty; showToast("재고 수량을 초과할 수 없습니다.", "error"); return; }
    if (qty > 0) { const idx = input.getAttribute('data-index'); if (cachedItems[idx]) subtotal += (qty * Number(cachedItems[idx].price)); }
  });
  const taxAmt = subtotal * taxRateObj.rate;
  if(document.getElementById('orderSubtotal')) document.getElementById('orderSubtotal').innerText = formatCurrency(subtotal);
  if(document.getElementById('orderTaxAmt')) document.getElementById('orderTaxAmt').innerText = formatCurrency(taxAmt);
  if(document.getElementById('orderGrandTotal')) document.getElementById('orderGrandTotal').innerText = formatCurrency(subtotal + taxAmt);
}

// 스마트 Diff 관리 에디터
async function toggleStockEditMode() {
  if (isSubmitting) return; 
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
    const stockInputs = document.querySelectorAll('.stock-region-input');
    const expInputs = document.querySelectorAll('.exp-region-input');
    const updateMap = {};
    let hasChanges = false;
    
    stockInputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region');
      const v = parseInt(input.value) || 0;
      const original = parseInt(input.getAttribute('data-original')) || 0;
      if (v !== original) {
        if(!updateMap[c]) updateMap[c] = { stockBreakdown: {}, expBreakdown: {} };
        updateMap[c].stockBreakdown[r] = v; hasChanges = true;
      }
    });

    expInputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region');
      const v = String(input.value).trim();
      const original = String(input.getAttribute('data-original')).trim();
      if (v !== original) {
        if(!updateMap[c]) updateMap[c] = { stockBreakdown: {}, expBreakdown: {} };
        updateMap[c].expBreakdown[r] = v; hasChanges = true;
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
    
    const updates = Object.keys(updateMap).map(c => ({ 
      code: c, stockBreakdown: updateMap[c].stockBreakdown, expBreakdown: updateMap[c].expBreakdown
    }));

    try {
      const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_STOCK, token: sessionToken, stockUpdates: updates })
      });
      const result = JSON.parse(await response.text());

      if (result.success) {
        showToast("재고 및 유통기한이 동기화되었습니다.", "success");
        setTimeout(() => fetchItems(), 1000); 
      } else throw new Error(result.message);
    } catch (err) { showToast("업데이트 실패: " + err.message, "error"); } 
    finally {
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
    if (result.success) { showToast(`발주가 완료되었습니다! (번호: ${result.batchId})`, "success"); setTimeout(() => fetchItems(), 1500); } 
    else showToast("접수 실패: " + result.message, "error"); 
  } catch (error) { showToast("통신 오류 발생.", "error"); } 
  finally { isSubmitting = false; if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); } }
}

// 🌟 [엔터프라이즈] AI Vision & SheetJS 통합 핸들러
async function handleExcelUpload(event) {
  event.preventDefault();
  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];
  if (!file) return;

  const validExcelExts = [".xlsx", ".xls", ".csv"];
  const validImgExts = [".png", ".jpg", ".jpeg"];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  const statusText = document.getElementById('uploadStatusText');

  // 1. 엑셀 파싱
  if (validExcelExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Parsing Excel Document...</span>`;
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
        if(statusText) statusText.innerHTML = "Drag & Drop vendor excel/image here";
      }
    };
    reader.readAsArrayBuffer(file);
  } 
  // 2. 🌟 이미지 OCR 처리
  else if (validImgExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">AI Vision OCR Scanning...</span>`;
    try {
      if (typeof Tesseract === 'undefined') throw new Error("Tesseract.js 로드 실패");
      const result = await Tesseract.recognize(file, 'eng+kor', {
        logger: m => {
          if (m.status === 'recognizing text' && statusText) {
            const pct = Math.floor(m.progress * 100);
            statusText.innerHTML = `<span class="text-indigo-500 font-bold">AI Vision Parsing: ${pct}%</span>`;
          }
        }
      });
      processOCRText(result.data.text, file.name);
    } catch(err) {
      showToast("이미지 인식 실패: " + err.message, "error");
      if(statusText) statusText.innerHTML = "Drag & Drop vendor excel/image here";
    }
  } else {
    return showToast("지원하지 않는 포맷입니다 (.xlsx, .jpg, .png)", "error");
  }
}

// OCR 텍스트 정규화
function processOCRText(text, filename) {
  const lines = text.split('\n');
  const jsonData = [];
  
  lines.forEach(line => {
    // 날짜에서 시간 정보가 딸려오더라도 순수 날짜만 분리 (\d{4}-\d{2}-\d{2})
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
    const expDate = dateMatch ? dateMatch[0] : "";
    
    // 바코드 13자리 혹은 영문숫자 조합 5자리 이상
    const barcodeMatch = line.match(/\b\d{13,14}\b/);
    const codeMatch = line.match(/\b[A-Z0-9]{5,15}\b/);
    const itemCode = (codeMatch ? codeMatch[0] : (barcodeMatch ? barcodeMatch[0] : ""));

    const nums = line.match(/\b\d+\b/g);
    let qty = 0;
    if (nums && nums.length > 0) {
      qty = parseInt(nums[nums.length - 1]);
    }
    if(itemCode && qty > 0) jsonData.push({ "Item#": itemCode, "Qty": qty, "Exp.Date": expDate });
  });

  if (jsonData.length === 0) {
    showToast("이미지에서 품번 및 수량 패턴을 찾지 못했습니다.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel/image here";
    return;
  }
  processExcelData(jsonData, filename + " (OCR)");
}

// 🌟 [핵심 보호 로직] 기존 재고 깎아먹지 않고 "더하기(+)" 및 유통기한 다중 병합
async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector').value;
  if (!targetRegion) {
    showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel/image here";
    return;
  }

  // 1단계: 업로드된 데이터 내에서 동일 품번, 동일 날짜끼리 병합 (임시 맵)
  let inboundMap = {};
  let successCount = 0;
  let failCount = 0;

  jsonData.forEach(row => {
    const vItemCode = String(row["Item#"] || row["Barcode"] || row["Item Code"] || "").trim();
    const vQty = parseInt(row["Qty"] || row["Quantity"] || row["수량"] || row["Stock"]) || 0;
    let vExp = String(row["Exp.Date"] || row["유통기한"] || "").trim();

    // 시간 정보 방어 (날짜만 칼같이 자름)
    const dateMatch = vExp.match(/\d{4}-\d{2}-\d{2}/);
    vExp = dateMatch ? dateMatch[0] : "";

    if (vItemCode !== "" && vQty > 0) {
      const matchedItem = cachedItems.find(item => item.code.toUpperCase() === vItemCode.toUpperCase());
      
      if (matchedItem) {
        const hqCode = matchedItem.code;
        if (!inboundMap[hqCode]) inboundMap[hqCode] = { totalQty: 0, batches: {} };
        
        inboundMap[hqCode].totalQty += vQty;
        if (vExp) {
          inboundMap[hqCode].batches[vExp] = (inboundMap[hqCode].batches[vExp] || 0) + vQty;
        }
        successCount++;
      } else { failCount++; }
    }
  });

  if (successCount === 0) {
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel/image here";
    showToast("마스터 DB와 매칭되는 품목이 0건입니다.", "error");
    return;
  }

  // 2단계: 기존 DB 재고 및 유통기한에 새로 들어온 데이터를 "안전하게 더하기(+)"
  const finalStockUpdates = Object.keys(inboundMap).map(hqCode => {
    const existingItem = cachedItems.find(i => i.code === hqCode);
    
    // 기존 총 재고 및 기존 유통기한 문자열 로드
    const existingStock = existingItem ? (existingItem.stockBreakdown[targetRegion] || 0) : 0;
    const existingExpStr = existingItem ? (existingItem.expBreakdown[targetRegion] || "") : "";

    // 🌟 1. 기존 유통기한 파싱하여 맵(Map)으로 만듦
    let mergedBatches = {};
    if (existingExpStr && existingExpStr !== "-") {
      existingExpStr.split('|').forEach(p => {
        if (p.includes(':')) {
          let parts = p.split(':');
          if (parts[0] && parseInt(parts[1]) > 0) {
            mergedBatches[parts[0].trim()] = parseInt(parts[1]);
          }
        } else if (p.trim() !== "") {
          mergedBatches[p.trim()] = 99999;
        }
      });
    }

    // 🌟 2. 새로 업로드된 날짜별 수량을 더함
    for (let d in inboundMap[hqCode].batches) {
      mergedBatches[d] = (mergedBatches[d] || 0) + inboundMap[hqCode].batches[d];
    }

    // 🌟 3. 날짜가 빠른 순서대로 정렬하여 문자열 재조립
    let sortedDates = Object.keys(mergedBatches).sort();
    let newExpArr = [];
    sortedDates.forEach(d => {
      if (mergedBatches[d] > 0 && mergedBatches[d] !== 99999) newExpArr.push(`${d}:${mergedBatches[d]}`);
      else if (mergedBatches[d] === 99999) newExpArr.push(d);
    });

    const finalExpStr = newExpArr.join(' | ');
    const finalStock = existingStock + inboundMap[hqCode].totalQty; // 기존 데이터 손실 방지 덧셈 연산!

    return {
      code: hqCode,
      stockBreakdown: { [targetRegion]: finalStock },
      expBreakdown: { [targetRegion]: finalExpStr }
    };
  });

  document.getElementById('uploadStatusText').innerHTML = `<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${successCount} Rows...</span>`;
  
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_STOCK, token: sessionToken, stockUpdates: finalStockUpdates })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      showToast(`입고 완료: 엑셀/이미지 ${successCount}줄 누적 성공`, "success");
      document.getElementById('uploadStatusText').innerHTML = `<span class="text-emerald-600 font-bold">✅ Uploaded: ${filename}</span>`;
      setTimeout(() => fetchItems(), 1500); 
    } else throw new Error(result.message);
  } catch (err) {
    showToast("동기화 실패: " + err.message, "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel/image here";
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

window.submitOrder = submitOrder; 
window.fetchItems = fetchItems; 
window.toggleStockEditMode = toggleStockEditMode; 
window.applyRegionFilter = applyRegionFilter; 
window.applyAiSuggestion = applyAiSuggestion; 
window.calculateOrderTotal = calculateOrderTotal;
window.handleExcelUpload = handleExcelUpload;

document.addEventListener('DOMContentLoaded', () => {
  setupDragAndDrop();
  fetchItems(); 
});
