// assets/js/dashboard.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); // 🌟 보안 토큰

if (!sessionToken || !clientName) {
  alert("보안 세션이 만료되었습니다. 다시 로그인 해 주세요.");
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

let salesChartInstance = null;
const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

async function fetchDashboardData(targetYear) {
  const errorBanner = document.getElementById('errorBanner');
  if (errorBanner) errorBanner.classList.add('hidden');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      // 🌟 토큰 동봉
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.DASHBOARD, token: sessionToken, clientName: clientName, year: targetYear })
    });

    const responseText = await response.text();
    let result = JSON.parse(responseText);

    if (result.success) {
      document.getElementById('totalSales').innerText = formatCurrency(result.ytdTotal || 0);
      document.getElementById('posSales').innerText = formatCurrency(result.ytdPos || 0);
      document.getElementById('deliverySales').innerText = formatCurrency(result.ytdDelivery || 0);
      renderChart(result.monthlySales || [0,0,0,0,0,0,0,0,0,0,0,0], targetYear);
    } else { throw new Error(result.message); }
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    if (errorBanner) {
      errorBanner.classList.remove('hidden');
      const errText = document.getElementById('errorBannerText');
      if (errText) errText.innerText = error.message;
    }
  }
}

function renderChart(dataArr, year) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;
  if (salesChartInstance) salesChartInstance.destroy();

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [{
        label: `Monthly Net Sales (${year})`,
        data: dataArr,
        borderColor: '#E84C60',
        backgroundColor: 'rgba(232, 76, 96, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E84C60',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A1516', titleFont: { size: 13 }, bodyFont: { size: 14, weight: 'bold' }, padding: 12, displayColors: false, callbacks: { label: function(context) { return formatCurrency(context.parsed.y); } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: '600' }, color: '#9ca3af', callback: function(value) { return '$' + (value/1000) + 'k'; } } },
        x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' }, color: '#9ca3af' } }
      },
      interaction: { intersect: false, mode: 'index' },
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const currentYear = document.getElementById('yearSelector') ? document.getElementById('yearSelector').value : '2026';
  fetchDashboardData(currentYear);
});

document.getElementById('yearSelector')?.addEventListener('change', (e) => {
  fetchDashboardData(e.target.value);
});
