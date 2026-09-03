// assets/js/dashboard.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해주세요.");
  window.location.href = "index.html";
}

// 사용자 헤더 설정
document.getElementById('userNameDisplay').innerText = clientName;
document.getElementById('navTitle').innerText = userRole === "MASTER" ? "HQ Executive Dashboard" : "Franchisee Dashboard";

// 로그아웃
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// 차트 객체를 전역으로 선언
let salesChart;

// 숫자 포맷팅 (달러 기호 및 콤마)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 🌟 GAS 백엔드에서 실제 데이터를 가져오는 핵심 함수
async function fetchDashboardData() {
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.DASHBOARD,
        clientName: clientName,
        year: 2026 // 기준 연도 (필요시 HTML에 셀렉트 박스를 달아 동적으로 변경 가능)
      })
    });

    const result = await response.json();

    if (result.success) {
      // 1. 상단 요약 카드 데이터 덮어쓰기
      document.getElementById('totalSales').innerText = formatCurrency(result.ytdTotal);
      document.getElementById('posSales').innerText = formatCurrency(result.ytdPos);
      document.getElementById('deliverySales').innerText = formatCurrency(result.ytdDelivery);
      
      // 2. 차트 렌더링
      renderChart(result.monthlySales);
    } else {
      alert("데이터를 불러오는데 실패했습니다: " + result.message);
    }
  } catch (error) {
    console.error("Dashboard Data Fetch Error:", error);
    alert("서버 통신 중 오류가 발생했습니다.");
  }
}

// 🌟 불러온 데이터로 Chart.js 그리기
function renderChart(monthlyData) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  
  // 기존 차트가 있다면 파괴하고 다시 그림 (연도 변경 등을 대비)
  if(salesChart) { salesChart.destroy(); }
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Monthly Net Sales (CAD)',
        data: monthlyData, // 구글 시트에서 가져온 실제 배열 데이터
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#B71C1C',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) { return formatCurrency(context.raw); }
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// 페이지가 로드되면 즉시 데이터를 가져옴
window.addEventListener('DOMContentLoaded', fetchDashboardData);
