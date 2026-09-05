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

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
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
      
      const regionInfo = result.appliedState === "Default" || !result.appliedState ? "Standard" : result.appliedState;
      const headerTitle = document.getElementById('catalogHeaderTitle');
      if (headerTitle) {
        headerTitle.innerHTML = `<span class="text-2xl">📦</span> Supply Item Catalog 
          <span class="ml-3 text-[10px] sm:text-[11px] bg-[var(--y2c-gold)]/10 text-[var(--y2c-gold)] px-3 py-1.5 rounded-lg border border-[var(--y2c-gold)]/30 tracking-widest uppercase shadow-sm whitespace-nowrap">
            ${regionInfo} Pricing
          </span>`;
      }

      if (cachedItems.length === 0) return tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 공급 품목이 없습니다.</td></tr>`;

      const inputClass = "order-qty w-20 sm:w-24 bg-white/70 border border-gray-300 rounded-xl px-2 sm:px-3 py-1.5 text-center text-[13px] font-bold text-gray-900 focus:border-[#E84C60] outline-none shadow-sm transition-all";
      
      cachedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50/50 transition-colors duration-200";
        
        // 🌟 클래스에 'item-thumbnail'과 'cursor-zoom-in' 추가
        const imgTag = item.image && item.image.trim() !== '' 
          ? `<img src="${item.image}" alt="${item.code}" class="item-thumbnail cursor-zoom-in w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-gray-200 shadow-sm shrink-0 bg-white hover:border-[#E84C60] transition-colors">` 
          : `<div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-[9px] font-bold text-gray-400 border border-gray-200 shadow-sm shrink-0">No Img</div>`;

        row.innerHTML = `
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[11px] sm:text-[12px] font-mono font-bold text-gray-500 tracking-wider">${item.code || '-'}</td>
          <td class="px-5 sm:px-6 py-4 flex items-center gap-4">
            ${imgTag}
            <span class="text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-extrabold tracking-tight whitespace-normal break-keep">${item.name || '-'}</span>
          </td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap"><span class="px-3 py-1.5 inline-flex text-[10px] font-black rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${item.category || 'General'}</span></td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-[13px] sm:text-sm text-[var(--premium-charcoal)] font-black text-right font-mono">${formatCurrency(item.price || 0)}</td>
          <td class="px-5 sm:px-6 py-4 whitespace-nowrap text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10">
            <input type="number" min="0" value="0" data-index="${index}" class="${inputClass}">
          </td>
        `;
        tableBody.appendChild(row);
      });
      
      // 🌟 [추가 로직] 이미지 돋보기 기능 (Hover Zoom)
      attachImageHoverEffect();

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

// 🌟 마우스 오버 시 돋보기 기능을 처리하는 헬퍼 함수
function attachImageHoverEffect() {
  const tableBody = document.getElementById('itemTableBody');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const previewImg = document.getElementById('imagePreview');

  if (!tableBody || !previewContainer || !previewImg) return;

  tableBody.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('item-thumbnail')) {
      previewImg.src = e.target.src;
      previewContainer.classList.remove('hidden');
      // 부드러운 확대 애니메이션
      setTimeout(() => {
        previewContainer.classList.remove('scale-95', 'opacity-0');
        previewContainer.classList.add('scale-100', 'opacity-100');
      }, 10);
    }
  });

  tableBody.addEventListener('mousemove', (e) => {
    if (e.target.classList.contains('item-thumbnail')) {
      // 마우스 커서 우측 하단에 고정
      previewContainer.style.left = (e.clientX + 20) + 'px';
      previewContainer.style.top = (e.clientY + 20) + 'px';
    }
  });

  tableBody.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('item-thumbnail')) {
      previewContainer.classList.remove('scale-100', 'opacity-100');
      previewContainer.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        previewContainer.classList.add('hidden');
        previewImg.src = '';
      }, 200);
    }
  });
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
      qtyInputs.forEach(input => input.value = 0); 
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
