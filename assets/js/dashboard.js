// assets/js/dashboard.js
// 🌟 V15.7 Ultimate Kernel - Omni-Parser 2.0 (ERP Data Sync), No Deletions

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };
const userRole = (localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
const sessionToken = localStorage.getItem(STORAGE.USER_TOKEN);
const clientName = localStorage.getItem(STORAGE.CLIENT_NAME);

// 🌟 [방화벽 1] 토큰 및 권한 무결성 검증 (VENDOR 접근 원천 차단)
if (!sessionToken || userRole === "VENDOR") {
    alert("권한이 없습니다. 카탈로그 화면으로 이동합니다.");
    window.location.replace("items.html");
}

// 회계 표준 포맷팅 (Null-Safe 방어)
const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(safeAmount);
};

// 🌟 상태 알림 토스트 (V15.7 신전 핑크 테마 동기화)
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
// 🌟 [방화벽 2] 타임아웃 절단기 및 지능형 백오프(Jittered Backoff) 통신 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20초 한계선

        try {
            const response = await fetch(CONFIG.API?.BASE_URL || "", {
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
    throw new Error(lastError?.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 새로고침 후 다시 시도해주세요.");
}

// ============================================================================
// 📊 대시보드 핵심 데이터 로드 및 렌더링 엔진 (Omni-Parser 2.0 방어탑재)
// ============================================================================
let salesChartInstance = null; // 메모리 누수 방지용

async function loadDashboardData() {
    const yearSelector = document.getElementById('dashYearSelector');
    if (!yearSelector) return;
    const targetYear = yearSelector.value || new Date().getFullYear();
    
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.classList.add('animate-spin', 'text-[#E84C60]');

    try {
        // 백엔드 통신: get_dashboard (만약 백엔드가 ALL 파라미터를 못받을 경우를 대비해 targetYear 중복전송)
        const result = await executeApi("get_dashboard", { 
            year: targetYear, 
            targetYear: targetYear,
            clientName: userRole === "MASTER" ? "ALL" : clientName 
        });

        // 디버깅 용이성을 위한 콘솔 출력 (실서버 방해 안됨)
        console.log(`[Dashboard ${targetYear} API Response]`, result);

        if (result && result.success) {
            // 🚨 [핵심 오류 수정] Omni-Parser 2.0: ERP Sales 데이터 배열 완벽 매핑
            const dataPayload = result.data || result.dashboardData || result.records || result;
            
            // 데이터가 ERP Sales처럼 records 배열 형식으로 넘어올 경우 완벽 추출
            let rawRecords = Array.isArray(dataPayload) ? dataPayload : (dataPayload.records || dataPayload.monthlyData || []);
            
            let calcPos = 0, calcDel = 0, calcTotal = 0;
            let chartArr = Array(12).fill(0);

            if (rawRecords.length > 0 && typeof rawRecords[0] === 'object') {
                // 객체 배열 파싱 [{month: 1, pos: 100, delivery: 50...}]
                rawRecords.forEach(r => {
                    const m = (parseInt(r.month) || 1) - 1;
                    const p = Number(r.pos || r.posSales || 0);
                    const d = Number(r.delivery || r.deliverySales || 0);
                    const t = Number(r.total || r.totalSales || r.amount || (p + d) || 0);
                    
                    if (m >= 0 && m < 12) {
                        chartArr[m] = t;
                        calcPos += p;
                        calcDel += d;
                        calcTotal += t;
                    }
                });
            } else if (rawRecords.length > 0 && typeof rawRecords[0] === 'number') {
                // 단순 숫자 배열 [100, 200, 300...]
                chartArr = rawRecords.slice(0, 12).map(v => Number(v)||0);
                calcTotal = chartArr.reduce((a,b) => a+b, 0);
            }

            // 만약 배열이 비어있었다면, 루트 객체의 ytd 값을 스캔하는 2차 백업 플랜
            if (calcTotal === 0) {
                calcPos = Number(dataPayload.ytdPos || dataPayload.posSales || dataPayload.pos || 0);
                calcDel = Number(dataPayload.ytdDelivery || dataPayload.deliverySales || dataPayload.delivery || 0);
                calcTotal = Number(dataPayload.ytdTotal || dataPayload.totalSales || dataPayload.total || (calcPos + calcDel));
            }

            // 1. KPI 텍스트 렌더링
            const elemTotal = document.getElementById('dashYtdTotal');
            const elemPos = document.getElementById('dashYtdPos');
            const elemDel = document.getElementById('dashYtdDelivery');

            if (elemTotal) elemTotal.innerText = formatCurrency(calcTotal);
            if (elemPos) elemPos.innerText = formatCurrency(calcPos);
            if (elemDel) elemDel.innerText = formatCurrency(calcDel);

            // 2. Chart.js 렌더링
            renderSalesChart(chartArr);
            
            showToast(`${targetYear}년도 데이터 동기화 완료`, "success");
        } else {
            throw new Error(result?.message || "데이터를 불러올 수 없습니다.");
        }
    } catch (err) {
        console.error("Dashboard Load Error:", err);
        // 에러 발생 시 UI가 멈추지 않도록 기본 차트(0) 렌더링 강제 보장
        renderSalesChart(Array(12).fill(0));
        showToast("대시보드 데이터 로드 오류: " + (err.message || "알 수 없는 오류"), "error");
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E84C60]');
    }
}

// 🌟 [메모리 누수 완벽 방어] Chart.js 시네마틱 렌더링
function renderSalesChart(monthlyData) {
    const ctx = document.getElementById('salesChartCanvas');
    if (!ctx) return;

    // 🚨 차트 인스턴스 파괴 (브라우저 메모리 폭발 방지)
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // V15.7 핑크 그라데이션
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(232, 76, 96, 0.4)');
    gradient.addColorStop(1, 'rgba(232, 76, 96, 0.0)');

    Chart.defaults.font.family = "'Inter', sans-serif";

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Revenue (CAD)',
                data: monthlyData,
                borderColor: '#E84C60',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
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
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 21, 22, 0.9)',
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

// 🌟 [누락 해결] ERP Sales와 100% 동일한 로딩가능 연도 리스트 생성
function populateDashYearSelector() {
    const yearSelector = document.getElementById('dashYearSelector');
    if (!yearSelector) return;
    
    yearSelector.innerHTML = '';
    const currentYear = new Date().getFullYear();
    
    // 2022년도부터 내년도까지 렌더링 (admin.js와 동기화)
    for (let y = currentYear + 2; y >= 2022; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y + " Fiscal Year";
        if (y === currentYear) opt.selected = true;
        yearSelector.appendChild(opt);
    }
}

// ============================================================================
// 🌟 시스템 초기화 및 이벤트 리스너 바인딩
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 연도 셀렉터 동기화
    populateDashYearSelector();

    // 2. 이벤트 리스너 연결
    document.getElementById('dashYearSelector')?.addEventListener('change', loadDashboardData);
    document.getElementById('refreshChartBtn')?.addEventListener('click', loadDashboardData);

    // 3. 엔진 가동
    loadDashboardData();
});
