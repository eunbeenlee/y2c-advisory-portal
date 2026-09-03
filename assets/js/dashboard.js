// assets/js/dashboard.js

// 1. 보안 세션 및 권한 검증
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해 주세요.");
  window.location.href = "index.html";
}

// 2. UI 권한별 네비게이션 격리 (FRANCHISEE인 경우 마스터 전용 인보이스 메뉴 원천 차단)
if (userRole === "MASTER") {
  const navInvoice = document.getElementById('navInvoice');
  if (navInvoice) navInvoice.classList.remove('hidden');
} else {
  // 가맹점주 계정인 경우 상단 타이틀을 매장 전용 뷰로 전환
  const portalSubtitle = document.getElementById('portalSubtitle');
  if (portalSubtitle) portalSubtitle.innerText = `Franchise Portal — ${clientName}`;
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

let salesChart;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 3. 🌟 서버(GAS)에서 대시보드 데이터를 안전하게 불러오는 함수 (오류 방어 포함)
async function fetchDashboardData(targetYear) {
  document.getElementById('totalSales').innerText = "Loading...";
  document.getElementById('posSales').innerText = "Loading...";
  document.getElementById('deliverySales').innerText = "Loading...";

  const errorBanner = document.getElementById('errorBanner');
  if (errorBanner) errorBanner.classList.add('hidden');

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

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Server Raw Response:", responseText);
      throw new Error("서버에서 올바른 JSON 데이터를 반환하지 않았습니다.");
    }

    if (result.success) {
      document.getElementById('totalSales').innerText = formatCurrency(result.ytdTotal);
      document.getElementById('posSales').innerText = formatCurrency(result.ytdPos);
      document.getElementById('deliverySales').innerText = formatCurrency(result.ytdDelivery);
      
      renderChart(result.monthlySales, targetYear);
    } else {
      throw new Error(result.message || "데이터를 불러오지 못했습니다.");
    }
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    if (errorBanner) {
      errorBanner.classList.remove('hidden');
      const errorBannerText = document.getElementById('errorBannerText');
      if (errorBannerText) errorBannerText.innerText = error.message;
    }
    
    document.getElementById('totalSales').innerText = "$0.00";
    document.getElementById('posSales').innerText = "$0.00";
    document.getElementById('deliverySales').innerText = "$0.00";
  }
}

// 4. 🌟 차트 렌더링 함수 (권한별 타이틀 및 라벨 분기)
function renderChart(monthlyData, year) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  const chartTitle = document.getElementById('chartTitle');
  
  if (chartTitle) {
    chartTitle.innerText = userRole === "MASTER" 
      ? `Consolidated Monthly Revenue Trend (${year})` 
      : `Store Performance Trend - ${clientName} (${year})`;
  }
  
  if (salesChart) {
    salesChart.destroy();
  }
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: userRole === "MASTER" ? `Total Net Sales (${year}) - CAD` : `${clientName} Sales (${year}) - CAD`,
        data: monthlyData,
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#B71C1C',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top', labels: { font: { weight: 'bold' } } },
        tooltip: {
          callbacks: {
            label: function(context) { return ` Sales: ${formatCurrency(context.raw)}`; }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.04)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// 연도 변경 셀렉트 박스 이벤트 리스너
const yearSelector = document.getElementById('yearSelector');
if (yearSelector) {
  yearSelector.addEventListener('change', (e) => {
    fetchDashboardData(e.target.value);
  });
}

// 페이지 최초 진입 시 실행
window.addEventListener('DOMContentLoaded', () => {
  const initialYear = yearSelector ? yearSelector.value : "2026";
  fetchDashboardData(initialYear);
});
