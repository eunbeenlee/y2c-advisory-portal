// assets/js/items.js

// 1. 보안 세션 검증 (비로그인 접근 차단)
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해 주세요.");
  window.location.href = "index.html";
}

// 2. 마스터 권한 여부 확인 후 인보이스 네비게이션 메뉴 노출
if (userRole === "MASTER") {
  const navInvoice = document.getElementById('navInvoice');
  if (navInvoice) navInvoice.classList.remove('hidden');
}

// 상단 프로필 유저명 및 로그아웃 바인딩
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName;

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

// CAD 화폐 포맷팅 함수
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 3. 🌟 서버(GAS)에서 품목 리스트를 안전하게 불러오는 핵심 비동기 함수
async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');
  const errorBanner = document.getElementById('errorBanner');
  
  if (!tableBody) return;

  if (errorBanner) errorBanner.classList.add('hidden');
  
  // 로딩 스피너 UI 렌더링
  tableBody.innerHTML = `
    <tr>
      <td colspan="4" class="px-6 py-16 text-center">
        <div class="flex flex-col items-center justify-center space-y-3">
          <svg class="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm font-bold text-gray-500">Loading catalog from secure database...</p>
        </div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.ITEMS
      })
    });

    // HTML 에러 응답 및 파싱 에러(Unexpected token) 원천 방어 로직
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Server Raw Response:", responseText);
      throw new Error("서버에서 올바른 JSON 데이터를 반환하지 않았습니다.");
    }

    if (result.success) {
      tableBody.innerHTML = ''; 
      
      if (!result.items || result.items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500 font-medium">등록된 공급 품목이 없습니다.</td></tr>`;
        return;
      }

      // 데이터 순회하며 테이블 행 생성
      result.items.forEach(item => {
        const row = document.createElement('tr');
        row.className = "hover:bg-red-50/40 transition-colors";
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-600">${item.code || '-'}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-extrabold">${item.name || '-'}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
              ${item.category || 'General'}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-black text-right">${formatCurrency(item.price || 0)}</td>
        `;
        tableBody.appendChild(row);
      });
      
    } else {
      throw new Error(result.message || "데이터를 불러오지 못했습니다.");
    }
  } catch (error) {
    console.error("Item Fetch Error:", error);
    if (errorBanner) {
      errorBanner.classList.remove('hidden');
      const errorText = document.getElementById('errorBannerText');
      if (errorText) errorText.innerText = error.message;
    }
    
    tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-red-500 font-bold">Failed to load items. Please click retry.</td></tr>`;
  }
}

// 페이지 로드 시 호출
window.addEventListener('DOMContentLoaded', fetchItems);
