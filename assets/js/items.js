// assets/js/items.js

// 1. 보안 체크 (비로그인자 차단)
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해주세요.");
  window.location.href = "index.html";
}

// 사용자 헤더 설정 및 로그아웃
document.getElementById('userNameDisplay').innerText = clientName;
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// 화폐 포맷팅 함수
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 2. 백엔드(GAS)에서 품목 리스트 데이터 호출
async function fetchItems() {
  const tableBody = document.getElementById('itemTableBody');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.ITEMS
      })
    });

    const result = await response.json();

    if (result.success) {
      tableBody.innerHTML = ''; // 기존 로딩 텍스트 지우기
      
      if (result.items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">등록된 품목이 없습니다.</td></tr>`;
        return;
      }

      // 가져온 배열을 HTML 테이블 Row(tr)로 변환하여 삽입
      result.items.forEach(item => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 transition-colors";
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.code}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-bold">${item.name}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              ${item.category}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">${formatCurrency(item.price)}</td>
        `;
        tableBody.appendChild(row);
      });
      
    } else {
      tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-bold">Error: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Item Fetch Error:", error);
    tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-bold">네트워크 통신 오류가 발생했습니다.</td></tr>`;
  }
}

// 페이지가 켜지자마자 데이터 불러오기 실행
window.addEventListener('DOMContentLoaded', fetchItems);
