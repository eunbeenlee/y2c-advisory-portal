// assets/js/dashboard.js

// 1. 보안 체크 (비로그인자 튕겨내기)
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었거나 비정상적인 접근입니다.");
  window.location.href = "index.html";
}

// 2. 화면 상단 유저 이름 렌더링
document.getElementById('userNameDisplay').innerText = clientName;
if(userRole === "MASTER") {
  document.getElementById('navTitle').innerText = "HQ Executive Dashboard";
} else {
  document.getElementById('navTitle').innerText = "Franchisee Dashboard";
}

// 3. 로그아웃 기능
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear(); // 저장된 브라우저 세션 찌꺼기 삭제
  window.location.href = "index.html";
});

// 4. 매출 차트 그리기 (초기엔 임시 데이터, 백엔드 연동 전)
// *추후 GAS 연동 코드를 작성하여 진짜 데이터로 덮어씌울 예정입니다.
const ctx = document.getElementById('salesChart').getContext('2d');
const salesChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Monthly Net Sales ($)',
      data: [12000, 19500, 15000, 22000, 25600, 28000, 31000, 29000, 32000, 35000, 38000, 42000], 
      borderColor: '#E53935',
      backgroundColor: 'rgba(229, 57, 53, 0.1)', // 그래프 아래 옅은 붉은색 채우기
      borderWidth: 2,
      fill: true,
      tension: 0.4 // 선을 부드럽게 곡선으로
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
});

// 임시 매출 합계 렌더링
document.getElementById('totalSales').innerText = "$ 331,100";
