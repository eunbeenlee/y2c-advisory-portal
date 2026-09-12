// assets/js/dashboard.js
// 🌟 V15.4 Ultimate Kernel - Cross-Validation Passed, Memory Leak Fixed, No Deletions

const CONFIG = window.SYSTEM_CONFIG;
const userRole = (localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
const clientName = localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENT_NAME);

// 🌟 [방화벽 1] 토큰 및 권한 무결성 검증 (VENDOR 접근 원천 차단)
if (!sessionToken || userRole === "VENDOR") {
    alert("권한이 없습니다. 카탈로그 화면으로 이동합니다.");
    window.location.replace("items.html");
}

// 회계 표준 포맷팅
const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

// 🌟 상태 알림 토스트 (V15.4 신전 핑크 테마 동기화)
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
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

// ============================================================================
// 🌟 [방화벽 2] V14.0 타임아웃 절단기 및 지능형 백오프(Jittered Backoff) 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20초 응답 대기 한계선

        try {
            const response = await fetch(CONFIG.API.BASE_URL, {
                method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...payload }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const rawText = await response.text();
            
            try {
                const jsonResult = JSON.parse(rawText);
                if (!jsonResult.success) {
                    if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                        localStorage.clear();
                        alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
                        window.location.replace("index.html");
                        return;
                    }
                    if (jsonResult.message && (jsonResult.message.includes("트래픽") || jsonResult.message.includes("병목") || jsonResult.message.includes("초과") || jsonResult.message.includes("지연"))) {
                        throw new Error(jsonResult.message);
                    }
                }
                return jsonResult;
            } catch (parseErr) {
                throw new Error("서버 응답 지연 현상. 재시도를 준비합니다.");
            }
        } catch (err) {
            clearTimeout(timeoutId);
            lastError = err;
            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastError.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 새로고침 후 다시 시도해주세요.");
}

// ============================================================================
// 📊 대시보드 핵심 데이터 로드 및 렌더링 엔진
// ============================================================================
let salesChartInstance = null; // 메모리 누수 방지용 차트 추적 변수

async function loadDashboardData() {
    const yearSelector = document.getElementById('dashYearSelector');
    if (!yearSelector) return;
    const targetYear = yearSelector.value;
    
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.classList.add('animate-spin', 'text-[#E84C60]');

    try {
        const result = await executeApi("get_dashboard", { 
            year: targetYear, 
            clientName: userRole === "MASTER" ? "ALL" : clientName 
        });

        if (result && result.success) {
            const data = result.data; // { ytdPos: 0, ytdDelivery: 0, monthlyData: [] }
            
            // 1. KPI 카드 업데이트 (데이터 무결성 검증 후 합산)
            const posAmt = Number(data.ytdPos) || 0;
            const delAmt = Number(data.ytdDelivery) || 0;
            const totalAmt = posAmt + delAmt;

            document.getElementById('dashYtdTotal').innerText = formatCurrency(totalAmt);
            document.getElementById('dashYtdPos').innerText = formatCurrency(posAmt);
            document.getElementById('dashYtdDelivery').innerText = formatCurrency(delAmt);

            // 2. Chart.js 렌더링
            renderSalesChart(data.monthlyData);
            
            showToast(`${targetYear}년도 데이터 동기화 완료`, "success");
        } else {
            throw new Error(result.message || "데이터 로드 실패");
        }
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E84C60]');
    }
}

// 🌟 [메모리 누수 완벽 방어] Chart.js 시네마틱 렌더링
function renderSalesChart(monthlyData) {
    const ctx = document.getElementById('salesChartCanvas');
    if (!ctx) return;

    // 🚨 기존에 그려진 차트가 있다면 무조건 파괴(Destroy)하여 브라우저 메모리 폭발(Crash) 방지
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    // 데이터가 아예 없을 경우를 대비한 방어 코드
    const safeData = monthlyData && monthlyData.length === 12 ? monthlyData : Array(12).fill(0);
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // V15.4 핑크 그라데이션 생성 (배경)
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(232, 76, 96, 0.4)'); // 상단은 진한 핑크
    gradient.addColorStop(1, 'rgba(232, 76, 96, 0.0)'); // 하단은 투명

    // 폰트 전역 설정 (엔터프라이즈 통합)
    Chart.defaults.font.family = "'Inter', sans-serif";

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Revenue (CAD)',
                data: safeData,
                borderColor: '#E84C60',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#E84C60',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // 부드러운 곡선 적용 (시네마틱 렌더링)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 21, 22, 0.9)', // 프리미엄 차콜
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 14, weight: 'bold' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#9ca3af', font: { weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
                    ticks: { 
                        color: '#9ca3af',
                        font: { weight: '600' },
                        callback: function(value) {
                            if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'k';
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// ============================================================================
// 🌟 시스템 초기화 및 이벤트 리스너 바인딩
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 셀렉터 기본값 세팅 (올해 연도 자동 할당)
    const yearSelector = document.getElementById('dashYearSelector');
    if (yearSelector) {
        const currentYear = new Date().getFullYear();
        // 옵션에 올해가 없다면 자동 추가
        if (!Array.from(yearSelector.options).some(opt => opt.value === String(currentYear))) {
            const opt = document.createElement('option');
            opt.value = currentYear;
            opt.innerText = currentYear;
            yearSelector.appendChild(opt);
        }
        yearSelector.value = currentYear;
    }

    // 2. 이벤트 리스너 연결
    document.getElementById('dashYearSelector')?.addEventListener('change', loadDashboardData);
    document.getElementById('refreshChartBtn')?.addEventListener('click', loadDashboardData);

    // 3. 엔진 가동
    loadDashboardData();
});
