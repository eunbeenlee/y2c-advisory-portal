// assets/js/dashboard.js
// 🌟 V17.9 Ultimate Kernel - Zero Deletion, Lazy Library Loading(Chart.js), Dynamic i18n, CORS Preflight Shield, Telemetry

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

// ============================================================================
// 🌐 글로벌 번역 (i18n) 엔진 탑재
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "logout": "LOGOUT",
        "dash_title": "Enterprise Dashboard", "dash_desc": "Real-time key performance indicators and sales analytics overview.",
        "kpi_annual": "Total Annual Sales", "kpi_pos": "POS (Dine-in & Takeout)", "kpi_del": "Delivery Platforms",
        "chart_title": "Monthly Revenue Trends", "btn_refresh": "Refresh Chart", "chart_label": "Total Revenue (CAD)",
        "toast_sync_success": "Data synchronization complete", "toast_sync_fail": "Dashboard load error", "toast_no_data": "Unable to load data."
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "logout": "로그아웃",
        "dash_title": "엔터프라이즈 대시보드", "dash_desc": "실시간 핵심 성과 지표(KPI) 및 가맹점 매출 분석 오버뷰.",
        "kpi_annual": "연간 총 매출액", "kpi_pos": "홀 & 포장 (POS)", "kpi_del": "배달 플랫폼",
        "chart_title": "월별 매출 동향 (트렌드)", "btn_refresh": "차트 새로고침", "chart_label": "총 매출액 (CAD)",
        "toast_sync_success": "데이터 동기화 완료", "toast_sync_fail": "대시보드 로드 오류", "toast_no_data": "데이터를 불러올 수 없습니다."
    }
};

let currentLang = localStorage.getItem('y2c_lang') || 'en';

window.changeLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('y2c_lang', lang);
    
    const btnEn = document.getElementById('lang_en');
    const btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = lang === 'en' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = lang === 'ko' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (window.applyTranslations) window.applyTranslations();
    
    // 언어 변경 시 차트 레이블 즉시 업데이트 (재렌더링 불필요 무손실 기법)
    if (salesChartInstance && salesChartInstance.data && salesChartInstance.data.datasets) {
        salesChartInstance.data.datasets[0].label = I18N_DICT[currentLang] ? I18N_DICT[currentLang]["chart_label"] : "Total Revenue (CAD)";
        salesChartInstance.update();
    }
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang];
    if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });
};

// 상단 프로필 및 로그아웃 바인딩
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName || userRole;

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    localStorage.clear(); 
    window.location.replace("index.html"); 
});

const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(safeAmount);
};

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
// 🔒 투명성 보장형 글로벌 권한 통제 엔진 (Transparent RBAC)
// ============================================================================
function applyGlobalRbacNavigation() {
    const rbacRules = {
        'navDashboard': ['MASTER', 'PARTNER'], 
        'navRecipes': ['MASTER', 'PARTNER'],   
        'navAdmin': ['MASTER', 'VENDOR'],      
        'navInvoice': ['MASTER']               
    };

    ['navDashboard', 'navRecipes', 'navAdmin', 'navInvoice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });

    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id);
        const allowedRoles = rbacRules[id];
        
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale');
            el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>';
            el.removeAttribute('href'); 
            
            const clone = el.cloneNode(true);
            clone.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                showToast("해당 메뉴는 열람 권한이 없습니다.", "error");
            });
            el.parentNode.replaceChild(clone, el);
        }
    });
}

// ============================================================================
// 🌟 [방화벽 2] 지능형 백오프(Jittered Backoff) 통신 엔진 (CORS 방어 포함)
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastError;
    if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");

    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); 

        try {
            // 🚨 CORS Preflight 원천 우회를 위한 text/plain 강제 사용
            const response = await fetch(CONFIG.API?.BASE_URL || "", {
                method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
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

            if (err.message && err.message.includes("Failed to fetch")) {
                throw new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight'>구글 스크립트 배포 설정을 '모든 사용자(Anyone)'로 변경하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastError?.message || "서버 통신 실패. 새로고침 해주세요.");
}

// ============================================================================
// ⚡ [V17.9 신규] 무거운 외부 라이브러리 지연 로딩 (Lazy Loading Code Splitting)
// ============================================================================
async function loadHeavyLibrary(url, objName) {
    if (window[objName] !== undefined) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = () => reject(false);
        document.head.appendChild(script);
    });
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
        const result = await executeApi("get_dashboard", { 
            year: targetYear, 
            targetYear: targetYear,
            clientName: userRole === "MASTER" ? "ALL" : clientName 
        });

        if (result && result.success) {
            // 🚨 Omni-Parser 2.0: ERP Sales 데이터 배열 완벽 매핑
            const dataPayload = result.data || result.dashboardData || result.records || result;
            let rawRecords = Array.isArray(dataPayload) ? dataPayload : (dataPayload.records || dataPayload.monthlyData || []);
            
            let calcPos = 0, calcDel = 0, calcTotal = 0;
            let chartArr = Array(12).fill(0);

            if (rawRecords.length > 0 && typeof rawRecords[0] === 'object') {
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
                chartArr = rawRecords.slice(0, 12).map(v => Number(v)||0);
                calcTotal = chartArr.reduce((a,b) => a+b, 0);
            }

            if (calcTotal === 0) {
                calcPos = Number(dataPayload.ytdPos || dataPayload.posSales || dataPayload.pos || 0);
                calcDel = Number(dataPayload.ytdDelivery || dataPayload.deliverySales || dataPayload.delivery || 0);
                calcTotal = Number(dataPayload.ytdTotal || dataPayload.totalSales || dataPayload.total || (calcPos + calcDel));
            }

            const elemTotal = document.getElementById('dashYtdTotal');
            const elemPos = document.getElementById('dashYtdPos');
            const elemDel = document.getElementById('dashYtdDelivery');

            if (elemTotal) elemTotal.innerText = formatCurrency(calcTotal);
            if (elemPos) elemPos.innerText = formatCurrency(calcPos);
            if (elemDel) elemDel.innerText = formatCurrency(calcDel);

            // ⚡ [V17.9 신규] Chart.js 지연 로딩 (로딩 속도 대폭 향상)
            try {
                await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/chart.js", "Chart");
                renderSalesChart(chartArr);
            } catch (err) {
                console.warn("[Y2C Telemetry] Chart.js load failed:", err);
                showToast("차트 엔진 렌더링 지연. 다시 시도해 주세요.", "error");
            }
            
            const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
            showToast(`${targetYear}: ${msgObj["toast_sync_success"]}`, "success");
        } else {
            const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
            throw new Error(result?.message || msgObj["toast_no_data"]);
        }
    } catch (err) {
        console.error("[Y2C Telemetry Dashboard Load Error]:", err);
        // 실패 시 빈 차트 렌더링 방어
        try {
            await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/chart.js", "Chart");
            renderSalesChart(Array(12).fill(0));
        } catch(e) {}
        
        const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
        showToast(`${msgObj["toast_sync_fail"]}: ${err.message}`, "error");
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E84C60]');
    }
}

// 🌟 [메모리 누수 완벽 방어] Chart.js 시네마틱 렌더링
function renderSalesChart(monthlyData) {
    const ctx = document.getElementById('salesChartCanvas');
    if (!ctx) return;

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(232, 76, 96, 0.4)');
    gradient.addColorStop(1, 'rgba(232, 76, 96, 0.0)');

    Chart.defaults.font.family = "'Inter', sans-serif";
    const currentLabel = I18N_DICT[currentLang] ? I18N_DICT[currentLang]["chart_label"] : "Total Revenue (CAD)";

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentLabel,
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

function populateDashYearSelector() {
    const yearSelector = document.getElementById('dashYearSelector');
    if (!yearSelector) return;
    
    yearSelector.innerHTML = '';
    const currentYear = new Date().getFullYear();
    
    for (let y = currentYear + 2; y >= 2022; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y + " Fiscal Year";
        if (y === currentYear) opt.selected = true;
        yearSelector.appendChild(opt);
    }
}

// 🚨 [V17.9 신규] 프론트엔드 에러 텔레메트리 (글로벌 락/멈춤 추적기)
window.addEventListener('error', function(event) {
    console.error("[Y2C Telemetry Error]", event.message);
});
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
});

// ============================================================================
// 🌟 시스템 초기화 및 이벤트 리스너 바인딩
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 🌟 글로벌 번역 및 투명성 보장 접근 제어 락 가동
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();

    // 연도 셀렉터 동기화
    populateDashYearSelector();

    // 이벤트 리스너 연결
    document.getElementById('dashYearSelector')?.addEventListener('change', loadDashboardData);
    document.getElementById('refreshChartBtn')?.addEventListener('click', loadDashboardData);

    // 🚀 데이터 로드 및 렌더링 즉시 시작
    loadDashboardData();
});
