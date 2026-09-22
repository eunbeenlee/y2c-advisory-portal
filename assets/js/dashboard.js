/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Dashboard Engine (V17.50 Turbo)
 * [Absolute Null-Safe] 빈칸, 쉼표 완벽 방어 및 초스무스 렌더링/OOM 100% 제어
 * ============================================================================
 */

// 🌟 스크립트 로드 즉시 FOUC 방어막 강제 철거 (초스무스 페이드인 브라우저 동기화)
try {
    var docEl = document.documentElement;
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            docEl.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
            docEl.classList.remove("opacity-0");
            docEl.style.opacity = "1";
            document.body.classList.remove("opacity-0");
            document.body.style.opacity = "1";
        });
    });
} catch(e) {}

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };

let userRole = "", clientName = "", sessionToken = "";
try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
} catch (e) {
    console.error("[Y2C Storage Error]", e);
}

// 🌟 [방어 18] 토큰 및 VENDOR 접근 원천 차단
if (!sessionToken || userRole === "VENDOR") {
    alert("보안 세션이 유효하지 않거나 해당 메뉴의 열람 권한이 없습니다.");
    window.location.replace("index.html");
}

// ============================================================================
// 🌐 글로벌 다국어 (i18n) 엔진
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

let currentLang = 'en';
try { currentLang = localStorage.getItem('y2c_lang') === 'ko' ? 'ko' : 'en'; } catch(e){}

window.changeLanguage = function(lang) {
    const safeLang = lang === "ko" ? "ko" : "en";
    currentLang = safeLang; 
    try { localStorage.setItem('y2c_lang', safeLang); } catch(e){}
    
    const btnEn = document.getElementById('lang_en'), btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = safeLang === 'en' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    
    // 🌟 [방어 22] 언어 변경 시 차트 렌더링 파괴 없이 레이블만 즉시 번역 (무손실 업데이트)
    if (salesChartInstance && salesChartInstance.data && salesChartInstance.data.datasets) {
        salesChartInstance.data.datasets[0].label = I18N_DICT[currentLang] ? I18N_DICT[currentLang]["chart_label"] : "Total Revenue (CAD)";
        salesChartInstance.update();
    }
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang]; if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (dict[key]) el.innerHTML = dict[key]; });
};

// ============================================================================
// 🔒 [방어 V17.50] Absolute Null-Safe Parsers (재무 오염 100% 방어망)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
}

function safeDisplay(value, fallback = "-") {
    if (value == null) return fallback;
    const str = String(value).trim();
    if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "nan") return fallback;
    return escapeHtml(str);
}

function parseStrictNonNegativeInteger(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (!/^\d+$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isSafeInteger(num) || num < 0) return 0; 
    return num; 
}

// 🌟 [방어 1, 2] 재무 소수점 파서: 가격에 포함된 쉼표(,), 공백, 문자열 에러를 0.00으로 치환
function parseStrictDecimal(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isFinite(num)) return 0; 
    return num; 
}

// 🌟 [방어 3] 센트 단위 정밀 교정 
function roundToCents(amount) { 
    return Math.round(parseStrictDecimal(amount) * 100) / 100; 
}

// 🌟 [방어 20] 재무 출력 Null-Safe 포맷터
const formatCurrency = (amount) => { 
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(parseStrictDecimal(amount)); 
};

// 🌟 [방어 14] 상단 프로필 렌더링 오류 방어
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName, "MASTER");
const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

// 🌟 [방어 16] 글로벌 토스트 스팸(Z-Index 붕괴) 방지기 (폰트 동기화)
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]', icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg whitespace-pre-line"></span>`;
    toast.querySelector('.toast-msg').textContent = String(message);
    container.appendChild(toast);
    
    requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => { toast.remove(); if (container && container.childNodes.length === 0) container.remove(); }, 300); }, 3500);
}

function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    ['navDashboard', 'navRecipes', 'navAdmin', 'navInvoice'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });

    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id), allowedRoles = rbacRules[id];
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale'); el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>'; el.removeAttribute('href'); 
            const clone = el.cloneNode(true); clone.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast("해당 메뉴는 열람 권한이 없습니다.", "error"); }); el.parentNode.replaceChild(clone, el);
        }
    });
}

// ============================================================================
// 🌟 [방어 7, 8, 11] 25초 절대 백오프 통신 엔진 (CORS 강제 패싱)
// ============================================================================
async function executeApi(action, payload = {}, retries = 2) {
    if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");
    let lastNetworkError;
    const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

    for (let i = 0; i <= retries; i++) {
        let controller = new AbortController();
        let timeoutId = setTimeout(() => controller.abort(), 25000); // 25초 킬스위치

        try {
            const response = await fetch(CONFIG.API?.BASE_URL || "", {
                method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const httpError = new Error(`HTTP ${response.status}`);
                httpError.httpStatus = response.status;
                throw httpError;
            }

            const rawText = await response.text();
            controller = null;
            
            let jsonResult;
            try { jsonResult = JSON.parse(rawText); } 
            catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷과 일치하지 않습니다."); }

            if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 형식이 올바르지 않습니다.");

            if (!jsonResult.success) {
                if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
                    alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
                    window.location.replace("index.html");
                    return;
                }
                throw new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
            }
            return jsonResult;
        } catch (err) {
            clearTimeout(timeoutId);
            lastNetworkError = err;

            if (err && err.httpStatus) {
                if (err.httpStatus === 429) throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)");
                if (err.httpStatus === 503) throw new Error("서버가 점검 중입니다. (HTTP 503)");
                throw err;
            }

            if (err.message && err.message.includes("Failed to fetch")) {
                throw new Error("🚨 서버 접근이 차단되었습니다(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight font-inter'>구글 배포 설정을 확인하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (25s 대기열 초과)" : (lastNetworkError?.message || "서버 통신 실패."));
}

// ⚡ 무거운 외부 라이브러리(Chart.js) 지연 로딩 
async function loadHeavyLibrary(url, objName) {
    if (window[objName] !== undefined) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = url;
        script.onload = () => resolve(true); script.onerror = () => reject(false);
        document.head.appendChild(script);
    });
}

// ============================================================================
// 📊 대시보드 핵심 데이터 파이프라인 (Omni-Parser 2.0 및 Null-Safe 연동)
// ============================================================================
let salesChartInstance = null; 
let isFetching = false; // 🌟 [방어 10] 물리적 연타 잠금 플래그

async function loadDashboardData() {
    if (isFetching) return;
    
    const yearSelector = document.getElementById('dashYearSelector');
    // 🌟 [방어 15] 연도 파서 안전망 적용
    let targetYear = parseStrictNonNegativeInteger(yearSelector?.value);
    if (targetYear === 0) targetYear = new Date().getFullYear();
    
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.classList.add('animate-spin', 'text-[#E84C60]');

    isFetching = true;

    try {
        const result = await executeApi("get_dashboard", { 
            year: targetYear, 
            targetYear: targetYear,
            clientName: userRole === "MASTER" ? "ALL" : clientName 
        });

        if (result && result.success) {
            // 🌟 [방어 9] 백엔드 데이터 뎁스(Depth) 파편화 완벽 방어
            const dataPayload = result.data || result.dashboardData || result.records || result || {};
            let rawRecords = Array.isArray(dataPayload) ? dataPayload : (Array.isArray(dataPayload.records) ? dataPayload.records : (Array.isArray(dataPayload.monthlyData) ? dataPayload.monthlyData : []));
            
            let calcPos = 0, calcDel = 0, calcTotal = 0;
            // 🌟 [방어 29] 누락된 달(Month) 데이터가 있어도 완벽한 12개월 배열 규격 고정 보장
            let chartArr = Array(12).fill(0);

            if (rawRecords.length > 0 && typeof rawRecords[0] === 'object') {
                rawRecords.forEach(r => {
                    const m = (parseStrictNonNegativeInteger(r.month) || 1) - 1;
                    
                    // 🌟 [방어 1, 3] 재무 쉼표(,) 및 Null Absolute 방어 교정 연산
                    const p = parseStrictDecimal(r.pos || r.posSales);
                    const d = parseStrictDecimal(r.delivery || r.deliverySales);
                    let t = parseStrictDecimal(r.total || r.totalSales || r.amount);
                    if (t === 0) t = roundToCents(p + d);
                    
                    if (m >= 0 && m < 12) {
                        chartArr[m] = t;
                        calcPos = roundToCents(calcPos + p);
                        calcDel = roundToCents(calcDel + d);
                        calcTotal = roundToCents(calcTotal + t);
                    }
                });
            } else if (rawRecords.length > 0 && typeof rawRecords[0] === 'number') {
                chartArr = rawRecords.slice(0, 12).map(v => parseStrictDecimal(v));
                calcTotal = chartArr.reduce((a,b) => roundToCents(a+b), 0);
            }

            if (calcTotal === 0 && dataPayload && typeof dataPayload === 'object' && !Array.isArray(dataPayload)) {
                calcPos = parseStrictDecimal(dataPayload.ytdPos || dataPayload.posSales || dataPayload.pos);
                calcDel = parseStrictDecimal(dataPayload.ytdDelivery || dataPayload.deliverySales || dataPayload.delivery);
                calcTotal = parseStrictDecimal(dataPayload.ytdTotal || dataPayload.totalSales || dataPayload.total);
                if (calcTotal === 0) calcTotal = roundToCents(calcPos + calcDel);
            }

            const elemTotal = document.getElementById('dashYtdTotal');
            const elemPos = document.getElementById('dashYtdPos');
            const elemDel = document.getElementById('dashYtdDelivery');

            if (elemTotal) elemTotal.textContent = formatCurrency(calcTotal);
            if (elemPos) elemPos.textContent = formatCurrency(calcPos);
            if (elemDel) elemDel.textContent = formatCurrency(calcDel);

            // 🌟 [방어 6] Chart CDN 로드 실패 시에도 대시보드가 죽지 않는 자체 회복(Self-Healing) 우회
            try {
                await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/chart.js", "Chart");
                renderSalesChart(chartArr);
            } catch (err) {
                console.warn("[Y2C Telemetry] Chart.js load fallback", err);
                showToast("차트 엔진 렌더링 지연. 데이터는 정상 반영되었습니다.", "success");
            }
            
            const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
            showToast(`${targetYear}: ${msgObj["toast_sync_success"]}`, "success");
        } else {
            const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
            throw new Error(result?.message || msgObj["toast_no_data"]);
        }
    } catch (err) {
        console.error("[Y2C Telemetry Dashboard Load Error]:", err);
        try {
            await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/chart.js", "Chart");
            renderSalesChart(Array(12).fill(0));
        } catch(e) {}
        
        const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
        showToast(`${msgObj["toast_sync_fail"]}: ${err.message}`, "error");
    } finally {
        isFetching = false;
        if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E84C60]');
    }
}

// ============================================================================
// 🌟 [방어 4, 13] Chart.js 인스턴스 OOM 명시적 파괴 및 XSS 툴팁 래핑
// ============================================================================
function renderSalesChart(monthlyData) {
    const ctx = document.getElementById('salesChartCanvas');
    // 🌟 [방어 21] Canvas DOM 무결성 체크
    if (!ctx) return;

    // 🌟 [방어 4] Memory Leak (OOM) 완벽 방어를 위한 Try-Catch 래핑
    try {
        if (salesChartInstance) {
            salesChartInstance.destroy(); 
            salesChartInstance = null;
        }
    } catch (e) {
        console.warn("Chart destruction fallback", e);
    }

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(232, 76, 96, 0.4)');
    gradient.addColorStop(1, 'rgba(232, 76, 96, 0.0)');

    // 🌟 Inter 폰트 동기화
    Chart.defaults.font.family = "'Inter', sans-serif";
    const currentLabel = I18N_DICT[currentLang] ? I18N_DICT[currentLang]["chart_label"] : "Total Revenue (CAD)";

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: escapeHtml(currentLabel), // XSS 보호
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
            interaction: { mode: 'index', intersect: false },
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
                            // 🌟 [방어 13, 20] 툴팁 콜백 함수 내 XSS 및 NaN 무결성 방어
                            let label = escapeHtml(context.dataset.label || '');
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
                x: { grid: { display: false, drawBorder: false }, ticks: { color: '#9ca3af', font: { weight: '600' } } },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
                    ticks: { 
                        color: '#9ca3af', font: { weight: '600' },
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
        opt.textContent = y + " Fiscal Year";
        if (y === currentYear) opt.selected = true;
        yearSelector.appendChild(opt);
    }
}

// 🌟 [방어 12, 19] 프론트엔드 실시간 감지망 (글로벌 캐치)
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다.", "error"));
window.addEventListener('online', () => showToast("네트워크 복구 완료.", "success"));
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
    // 🌟 [방어 12] 예외 발생 시 버튼 및 플래그 강제 복원
    isFetching = false;
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E84C60]');
});

// ============================================================================
// 🌟 시스템 초기화 및 DOM 락(Lock)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();

    populateDashYearSelector();

    const yearSel = document.getElementById('dashYearSelector');
    if (yearSel) yearSel.addEventListener('change', loadDashboardData);
    
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadDashboardData);

    loadDashboardData();
});
