// assets/js/dashboard.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);

if (!sessionToken || !clientName) {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = clientName;
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

let salesChartInstance = null;
let currentChartData = []; // 엑셀 추출용 메모리 보관

async function fetchDashboardData(year) {
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.DASHBOARD, token: sessionToken, year: year })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      document.getElementById('totalSales').innerText = formatCurrency(result.ytdTotal);
      document.getElementById('posSales').innerText = formatCurrency(result.ytdPos);
      document.getElementById('deliverySales').innerText = formatCurrency(result.ytdDelivery);
      
      currentChartData = result.monthlySales; // CSV 내보내기용 저장
      renderChart(result.monthlySales);
    } else {
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message);
    }
  } catch (error) {
    const banner = document.getElementById('errorBanner');
    if(banner) {
      banner.classList.remove('hidden');
      document.getElementById('errorBannerText').innerText = "데이터를 불러오지 못했습니다. " + error.message;
    }
  }
}

function renderChart(data) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  if (salesChartInstance) salesChartInstance.destroy();
  salesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Net Sales (CAD)',
        data: data,
        backgroundColor: 'rgba(232, 76, 96, 0.85)',
        hoverBackgroundColor: '#C23347',
        borderRadius: 8,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A1516', titleFont: { size: 13 }, bodyFont: { size: 14, weight: 'bold' }, padding: 12, callbacks: { label: function(context) { return formatCurrency(context.raw); } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#9CA3AF', callback: function(value) { return '$' + (value / 1000) + 'k'; } } },
        x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 12, weight: 'bold' }, color: '#6B7280' } }
      }
    }
  });
}

// 🌟 [엔터프라이즈 기능] CSV 데이터 내보내기 (Export)
function exportDashboardCSV() {
  const year = document.getElementById('yearSelector').value;
  if (!currentChartData || currentChartData.length === 0) return alert("내보낼 데이터가 없습니다.");

  let csvContent = "\uFEFF"; // 한글 깨짐 방지 BOM
  csvContent += `Sinjeon Canada Performance Report - ${year}\n\n`;
  csvContent += "Month,Net Sales (CAD)\n";

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let total = 0;
  
  for (let i = 0; i < 12; i++) {
    let sales = Number(currentChartData[i]) || 0;
    total += sales;
    csvContent += `${months[i]},"${sales.toFixed(2)}"\n`;
  }
  
  csvContent += `\nTotal YTD,"${total.toFixed(2)}"\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `Y2C_Dashboard_Export_${year}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.exportDashboardCSV = exportDashboardCSV;

document.addEventListener('DOMContentLoaded', () => {
  const yearSelector = document.getElementById('yearSelector');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 3; y--) {
    const option = document.createElement('option');
    option.value = y; option.innerText = `${y} Fiscal Year`;
    yearSelector.appendChild(option);
  }
  yearSelector.addEventListener('change', (e) => fetchDashboardData(e.target.value));
  fetchDashboardData(currentYear);
});
