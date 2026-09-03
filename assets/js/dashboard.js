// assets/js/dashboard.js

// 1. 세션 보안 검증 (비로그인 접근 차단)
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인해 주세요.");
  window.location.href = "index.html";
}

// 2. UI 헤더 정보 매핑 (마스터 프랜차이즈 및 유저 정보 반영)
document.getElementById('userNameDisplay').innerText = clientName;

// 로그아웃 처리
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// 전역 차트 변수
let salesChart;

// CAD 화폐 포맷팅 함수
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 3. 🌟 서버(GAS)에서 대시보드 데이터를 안전하게 불러오는 핵심 함수
async function fetchDashboardData(targetYear = 2026) {
  // 로딩 상태 표시
  document.getElementById('totalSales').innerText = "Loading...";
  document.getElementById('posSales').innerText = "Loading...";
  document.getElementById('deliverySales').innerText = "Loading...";

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.DASHBOARD,
        clientName: clientName,
        year: targetYear
      })
    });

    // 💡 HTML 에러 응답 충돌(Unexpected token) 원천 방어 로직
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Server Raw Response:", responseText);
      throw new Error("서버에서 올바른 JSON 데이터를 반환하지 않았습니다. (GAS 배포 URL 및 권한 재확인 필요)");
    }

    if (result.success) {
      // 상단 요약 카드 카드 데이터 업데이트
      document.getElementById('totalSales').innerText = formatCurrency(result.ytdTotal);
      document.getElementById('posSales').innerText = formatCurrency(result.ytdPos);
      document.getElementById('deliverySales').innerText = formatCurrency(result.ytdDelivery);
      
      // 월별 매출 추이 차트 렌더링
      renderChart(result.monthlySales, targetYear);
    } else {
      alert("데이터를 불러오지 못했습니다: " + result.message);
    }
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    alert(error.message || "서버 통신 중 오류가 발생했습니다.");
    
    document.getElementById('totalSales').innerText = "$0.00";
    document.getElementById('posSales').innerText = "$0.00";
    document.getElementById('deliverySales').innerText = "$0.00";
  }
}

// 4. 🌟 Chart.js 시각화 렌더링 함수
function renderChart(monthlyData, year) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  
  if (salesChart) {
    salesChart.destroy(); // 기존 차트 초기화 (연도 변경 시 깜빡임 방지)
  }
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: `Net Sales Trend (${year}) - CAD`,
        data: monthlyData,
        borderColor: '#E53935', // 신전 시그니처 레드
        backgroundColor: 'rgba(229, 57, 53, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.35, // 부드러운 곡선 효과
        pointBackgroundColor: '#B71C1C',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { 
          position: 'top',
          labels: { font: { weight: 'bold' } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Sales: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.04)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// 5. 페이지 로드 시 기본 2026년 데이터 호출 실행
window.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData(2026);
});
