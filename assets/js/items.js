// assets/js/items.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해 주세요.");
  window.location.href = "index.html";
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName;

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

let cachedItems = [];

async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');
  const errorBanner = document.getElementById('errorBanner');
  
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');
  
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-24 text-center">
        <div class="flex flex-col items-center justify-center space-y-4">
          <svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-[13px] font-bold text-gray-400 tracking-wide">Syncing catalog from secure database...</p>
        </div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.ITEMS })
    });

    const responseText = await response.text();
    let result = JSON.parse(responseText);

    if (result.success) {
      tableBody.innerHTML = ''; 
      cachedItems = result.items || [];
      
      if (cachedItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 공급 품목이 없습니다.</td></tr>`;
        return;
      }

      const inputClass = "order-qty w-20 sm:w-24 bg-white/70 border border-gray-300 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-gray-900 focus:border-[#E84C60] focus:ring-2 focus:ring-[#E84C60]/20 focus:bg-white outline-none shadow-sm transition-all";

      cachedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50/50 transition-colors duration-200";
        row.innerHTML = `
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${item.code || '-'}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-extrabold tracking-tight">${item.name || '-'}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap">
            <span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">
              ${item.category || 'General'}
            </span>
          </td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-black text-right font-mono">${formatCurrency(item.price || 0)}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10">
            <input type="number" min="0" value="0" data-index="${index}" class="${inputClass}">
          </td>
        `;
        tableBody.appendChild(row);
      });
      
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Item Fetch Error:", error);
    if (errorBanner) {
      errorBanner.classList.remove('hidden');
      const errText = document.getElementById('errorBannerText');
      if (errText) errText.innerText = error.message;
    }
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">Failed to load items. Please click retry.</td></tr>`;
  }
}

async function submitOrder() {
  const qtyInputs = document.querySelectorAll('.order-qty');
  const orderItems = [];

  qtyInputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      const idx = input.getAttribute('data-index');
      const item = cachedItems[idx];
      if (item) {
        orderItems.push({ code: item.code, name: item.name, price: item.price, qty: qty });
      }
    }
  });

  if (orderItems.length === 0) {
    alert("발주할 품목의 수량을 최소 1개 이상 입력해 주세요.");
    return;
  }

  if (!confirm(`[${clientName}] 총 ${orderItems.length}개 품목에 대한 발주를 전송하시겠습니까?`)) {
    return;
  }

  // 🌟 [2번 방어 로직] 발주 버튼 비활성화
  const submitBtn = document.querySelector('button[onclick="submitOrder()"]');
  const originalHTML = submitBtn ? submitBtn.innerHTML : "Submit Order";
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>⏳</span> PROCESSING...";
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed', 'animate-pulse');
  }

  try {
    // config.js에 ORDER: "save_order"가 있어야 함
    const ENDPOINT = SYSTEM_CONFIG.API.ENDPOINTS.ORDER || "save_order";
    
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: ENDPOINT, clientName: clientName, items: orderItems })
    });

    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText); } 
    catch(err) { throw new Error("서버 응답 파싱 중 오류"); }

    if (result.success) {
      alert(`🎉 발주가 성공적으로 접수되었습니다!\n(접수 번호: ${result.batchId})`);
      qtyInputs.forEach(input => input.value = 0); // 성공 시 수량 초기화
    } else {
      alert("발주 접수 실패: " + result.message);
    }
  } catch (error) {
    console.error("Order Submit Error:", error);
    alert("발주 전송 중 통신 오류가 발생했습니다.");
  } finally {
    // 🌟 버튼 복구
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse');
    }
  }
}

window.submitOrder = submitOrder;
window.fetchItems = fetchItems;
window.addEventListener('DOMContentLoaded', fetchItems);
