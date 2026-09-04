// assets/js/dashboard.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);

if (!sessionToken || !clientName) { window.location.href = "index.html"; }
document.getElementById('userNameDisplay').innerText = clientName;
document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = "index.html"; });

// 🌟 대기업식 자동 주입 토스트 알림
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]';
  const icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

let salesChartInstance = null;
const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

async function fetchDashboardData(targetYear) {
  const errorBanner = document.getElementById('errorBanner');
  if (errorBanner) errorBanner.classList.add('hidden');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.DASHBOARD, token: sessionToken, clientName: clientName, year: targetYear })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      document.getElementById('totalSales').innerText = formatCurrency(result.ytdTotal || 0);
      document.getElementById('posSales').innerText = formatCurrency(result.ytdPos || 0);
      document.getElementById('deliverySales').innerText = formatCurrency(result.ytdDelivery || 0);
      renderChart(result.monthlySales || [0,0,0,0,0,0,0,0,0,0,0,0], targetYear);
    } else { 
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message); 
    }
  } catch (error) {
    showToast("대시보드 데이터를 가져오지 못했습니다.", "error");
    if (errorBanner) { errorBanner.classList.remove('hidden'); document.getElementById('errorBannerText').innerText = error.message; }
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
      datasets: [{ label: `Monthly Net Sales (${year})`, data: dataArr, borderColor: '#E84C60', backgroundColor: 'rgba(232, 76, 96, 0.1)', borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#E84C60', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A1516', titleFont: { size: 13 }, bodyFont: { size: 14, weight: 'bold' }, padding: 12, displayColors: false, callbacks: { label: function(context) { return formatCurrency(context.parsed.y); } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: '600' }, color: '#9ca3af', callback: function(value) { return '$' + (value/1000) + 'k'; } } },
        x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' }, color: '#9ca3af' } }
      },
      interaction: { intersect: false, mode: 'index' },
    }
  });
}

// 🌟 현재 연도 자동 추출 및 드롭다운 주입 로직
window.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();
  const yearSelect = document.getElementById('yearSelector');
  
  if (yearSelect) {
    let hasYear = Array.from(yearSelect.options).some(opt => opt.value == currentYear);
    if (!hasYear) yearSelect.add(new Option(currentYear, currentYear), yearSelect.options[0]);
    yearSelect.value = currentYear;
  }
  fetchDashboardData(currentYear);
});

document.getElementById('yearSelector')?.addEventListener('change', (e) => fetchDashboardData(e.target.value));
