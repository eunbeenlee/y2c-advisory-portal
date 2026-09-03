// assets/js/dashboard.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인해 주세요.");
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = clientName;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

let salesChart;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 🌟 선택된 연도를 파라미터로 받아 서버와 통신하는 함수
async function fetchDashboardData(targetYear) {
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

// 🌟 차트 렌더링 함수
function renderChart(monthlyData, year) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  document.getElementById('chartTitle').innerText = `Monthly Revenue Trend (${year})`;
  
  if (salesChart) {
    salesChart.destroy();
  }
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: `Net Sales (${year}) - CAD`,
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

// 🌟 연도 셀렉트 박스 이벤트 리스너 연결
document.getElementById('yearSelector').addEventListener('change', (e) => {
  const selectedYear = e.target.value;
  fetchDashboardData(selectedYear);
});

// 페이지 최초 진입 시 기본 2026년 데이터로 로드
window.addEventListener('DOMContentLoaded', () => {
  const initialYear = document.getElementById('yearSelector').value;
  fetchDashboardData(initialYear);
});
