// assets/js/items.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);

if (!sessionToken || !clientName) {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = clientName;
document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = "index.html"; });

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

// 🌟 대기업식 자동 주입 토스트 알림 (HTML 수정 불필요)
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
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

async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');
  const errorBanner = document.getElementById('errorBanner');
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');
  
  tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-24 text-center"><p class="text-[13px] font-bold text-gray-400">Syncing catalog from secure database...</p></td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.ITEMS, token: sessionToken }) 
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      tableBody.innerHTML = ''; 
      cachedItems = result.items || [];
      if (cachedItems.length === 0) return tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 공급 품목이 없습니다.</td></tr>`;

      const inputClass = "order-qty w-20 sm:w-24 bg-white/70 border border-gray-300 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-gray-900 focus:border-[#E84C60] outline-none shadow-sm transition-all";
      cachedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50/50 transition-colors duration-200";
        row.innerHTML = `
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${item.code || '-'}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-extrabold tracking-tight">${item.name || '-'}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap"><span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${item.category || 'General'}</span></td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-black text-right font-mono">${formatCurrency(item.price || 0)}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10">
            <input type="number" min="0" value="0" data-index="${index}" class="${inputClass}">
          </td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      if (result.message.includes("만료") || result.message.includes("로그인") || result.message.includes("유효하지")) {
        alert("보안 세션이 종료되었습니다. 다시 로그인해 주세요."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message);
    }
  } catch (error) {
    if (errorBanner) { errorBanner.classList.remove('hidden'); document.getElementById('errorBannerText').innerText = error.message; }
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">Failed to load items.</td></tr>`;
  }
}

async function submitOrder() {
  const qtyInputs = document.querySelectorAll('.order-qty');
  const orderItems = [];

  qtyInputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      const idx = input.getAttribute('data-index');
      if (cachedItems[idx]) orderItems.push({ code: cachedItems[idx].code, name: cachedItems[idx].name, price: cachedItems[idx].price, qty: qty });
    }
  });

  if (orderItems.length === 0) {
    showToast("발주할 품목의 수량을 최소 1개 이상 입력해 주세요.", "error");
    return;
  }

  // 발주 전송 의사 확인
  if (!confirm(`총 ${orderItems.length}개 품목에 대한 발주를 전송하시겠습니까?`)) return;

  const submitBtn = document.querySelector('button[onclick="submitOrder()"]');
  const originalHTML = submitBtn ? submitBtn.innerHTML : "SUBMIT ORDER";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "<span>⏳</span> PROCESSING..."; submitBtn.classList.add('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.ORDER, token: sessionToken, clientName: clientName, items: orderItems })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      showToast(`발주가 성공적으로 접수되었습니다! (번호: ${result.batchId})`, "success");
      qtyInputs.forEach(input => input.value = 0); // 성공 시 UI 초기화
    } else { 
      showToast("발주 접수 실패: " + result.message, "error"); 
    }
  } catch (error) { 
    showToast("발주 전송 중 통신 오류가 발생했습니다.", "error");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }
  }
}

window.submitOrder = submitOrder; window.fetchItems = fetchItems;
window.addEventListener('DOMContentLoaded', fetchItems);
