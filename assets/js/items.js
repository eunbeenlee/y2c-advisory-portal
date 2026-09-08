// assets/js/items.js

const userRole = (localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);
// 🌟 캐싱된 접속자의 주(State) 정보
const cachedClientState = localStorage.getItem("y2c_premium_state") || "DEFAULT";

if (!sessionToken || !clientName) window.location.href = "index.html";

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
  document.getElementById('navDashboard')?.remove();
  document.getElementById('navRecipes')?.remove();
  document.getElementById('orderActionContainer')?.remove(); // 벤더는 결제창 파괴
}

if (userRole === "MASTER") {
  document.getElementById('navAdmin')?.classList.remove('hidden');
  document.getElementById('navInvoice')?.classList.remove('hidden');
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

async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-24 text-center"><div class="flex flex-col items-center justify-center space-y-4"><svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-[13px] font-bold text-gray-400 tracking-wide">Ultra-Fast Syncing SCM...</p></div></td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      // 🌟 [로딩 최적화] 캐싱된 State를 보내서 백엔드 DB 풀스캔 차단
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
      
      document.getElementById('kpiDashboard')?.classList.remove('hidden');
      document.getElementById('kpiLastUpdated').innerText = formatTimestamp(result.lastUpdated);

      if (userRole === "MASTER" || userRole === "VENDOR") {
        document.getElementById('masterInventoryControls')?.classList.remove('hidden');
        populateRegionFilter();
      } else {
        document.getElementById('aiSuggestBtn')?.classList.remove('hidden');
      }

      renderTableItems(); 
      attachImageHoverEffect(); 
      if(userRole !== "VENDOR") calculateOrderTotal(); 

    } else {
      if (result.message.includes("만료") || result.message.includes("로그인")) { alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return; }
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
  filter.innerHTML = `<option value="ALL">Canada Total</option>`;
  regions.forEach(reg => { filter.innerHTML += `<option value="${reg}">Hub: ${reg}</option>`; });
  filter.value = masterViewRegion;
}

function applyRegionFilter() {
  masterViewRegion = document.getElementById('regionFilter').value;
  renderTableItems(); 
}

function renderTableItems() {
  const tableBody = document.getElementById('itemTableBody');
  if (cachedItems.length === 0) return;
  tableBody.innerHTML = '';

  let totalValue = 0, lowStockCount = 0;
  const isMasterOrVendor = (userRole === "MASTER" || userRole === "VENDOR");

  const sLabel = document.getElementById('stockHeaderLabel');
  if (sLabel) sLabel.innerText = isMasterOrVendor ? (masterViewRegion === "ALL" ? "Canada Total Stock" : `Hub Stock (${masterViewRegion})`) : `Local Hub (${currentClientState})`;

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
        // 🌟 [성능 극대화] input 태그에 data-original 속성을 부여하여 나중에 수정 여부 파악
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

  document.getElementById('kpiTotalSkus').innerText = cachedItems.length;
  if(userRole === "VENDOR") {
    const vKpi = document.getElementById('kpiTotalValue');
    if(vKpi) vKpi.innerText = "N/A";
  } else {
    document.getElementById('kpiTotalValue').innerText = formatCurrency(totalValue);
  }
  document.getElementById('kpiLowStock').innerText = `${lowStockCount} Items`;
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
  document.getElementById('orderSubtotal').innerText = formatCurrency(subtotal);
  document.getElementById('orderTaxAmt').innerText = formatCurrency(taxAmt);
  document.getElementById('orderGrandTotal').innerText = formatCurrency(grandTotal);
}

// 🌟 [성능 극대화] 수정된 내역이 없으면 서버 통신 자체를 차단 (Smart Diff)
async function toggleStockEditMode() {
  const btn = document.getElementById('toggleStockBtn');
  const filter = document.getElementById('regionFilter');
  const orderContainer = document.getElementById('orderActionContainer');
  
  if (!isStockEditMode) {
    isStockEditMode = true;
    btn.innerHTML = "💾 SAVE ALL"; btn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); btn.classList.replace('hover:bg-black', 'hover:bg-emerald-700');
    if (filter) filter.disabled = true; 
    if (orderContainer) orderContainer.classList.add('hidden');
    renderTableItems(); 
  } else {
    
    const inputs = document.querySelectorAll('.stock-region-input');
    const updateMap = {};
    let hasChanges = false; // 변경 감지 플래그
    
    inputs.forEach(input => {
      const c = input.getAttribute('data-code'), r = input.getAttribute('data-region');
      const v = parseInt(input.value) || 0;
      const original = parseInt(input.getAttribute('data-original')) || 0;
      
      // 값이 수정된 항목만 색출
      if (v !== original) {
        if(!updateMap[c]) updateMap[c] = {};
        updateMap[c][r] = v;
        hasChanges = true;
      }
    });

    // 🌟 아무것도 안 고쳤으면 서버 부하 없이 즉시 닫기
    if (!hasChanges) {
      isStockEditMode = false; btn.innerHTML = "⚙️ MANAGE"; 
      btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black');
      if (filter) filter.disabled = false; 
      if (orderContainer && userRole !== "VENDOR") orderContainer.classList.remove('hidden');
      renderTableItems(); // 원래 화면으로 렌더링
      return; 
    }

    // 변경 사항이 있을 때만 서버로 전송
    btn.disabled = true; btn.innerHTML = "⏳ SAVING..."; btn.classList.add('animate-pulse');
    const updates = Object.keys(updateMap).map(c => ({ code: c, stockBreakdown: updateMap[c] }));

    try {
      const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_STOCK, token: sessionToken, stockUpdates: updates })
      });
      const result = JSON.parse(await response.text());

      if (result.success) {
        showToast("물류 재고가 안전하게 동기화되었습니다.", "success");
        setTimeout(() => fetchItems(), 1000); 
      } else throw new Error(result.message);
    } catch (err) { showToast("업데이트 실패: " + err.message, "error"); } 
    finally {
      isStockEditMode = false; btn.disabled = false; btn.innerHTML = "⚙️ MANAGE"; btn.classList.remove('animate-pulse');
      btn.classList.replace('bg-emerald-600', 'bg-[var(--premium-charcoal)]'); btn.classList.replace('hover:bg-emerald-700', 'hover:bg-black');
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
  if(userRole === "VENDOR") return;
  const qtyInputs = document.querySelectorAll('.order-qty');
  const orderItems = [];
  qtyInputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) { const idx = input.getAttribute('data-index'); if (cachedItems[idx]) orderItems.push({ code: cachedItems[idx].code, name: cachedItems[idx].name, price: cachedItems[idx].price, qty: qty }); }
  });
  
  if (orderItems.length === 0) { showToast("발주 수량을 입력해 주세요.", "error"); return; }
  
  const grandTotal = document.getElementById('orderGrandTotal').innerText;
  if (!confirm(`총 ${orderItems.length}개 품목 (세금 포함 총액: ${grandTotal})\n발주를 전송하시겠습니까?`)) return;

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
  } catch (error) { showToast("통신 오류 발생.", "error"); } 
  finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); } }
}

window.submitOrder = submitOrder; window.fetchItems = fetchItems; window.toggleStockEditMode = toggleStockEditMode; window.applyRegionFilter = applyRegionFilter; window.applyAiSuggestion = applyAiSuggestion; window.calculateOrderTotal = calculateOrderTotal;
window.addEventListener('DOMContentLoaded', fetchItems);
