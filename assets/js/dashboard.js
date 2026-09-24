/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Dashboard Engine (V40.3 Ultra-Fast)
 * [Absolute Null-Safe] IndexedDB Cache, Race Condition 킬스위치, Canvas OOM 방어
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

// 🌟 권한 무결성 1차 검증 (보안 세션 만료 및 벤더 차단)
if (!sessionToken || userRole === "VENDOR") {
    alert("보안 세션이 유효하지 않거나 해당 메뉴의 열람 권한이 없습니다.");
    window.location.replace("index.html");
}

// ============================================================================
// 💾 [V40.3 신규 방어 1] IndexedDB 초고속 로컬스토리지 래퍼 (용량 무제한 캐시)
// ============================================================================
const Y2C_DB = {
    name: 'Y2C_Logistics_DB',
    version: 1,
    isSupported: !!window.indexedDB,
    init: function() {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) return reject("IndexedDB not supported");
            const req = indexedDB.open(this.name, this.version);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('cacheStore')) {
                    db.createObjectStore('cacheStore', { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    set: async function(key, data) {
        if (!this.isSupported) return;
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('cacheStore', 'readwrite');
                tx.objectStore('cacheStore').put({ id: key, data: data, timestamp: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch(e) { console.warn("[Y2C_DB Set Warn]", e); }
    },
    get: async function(key) {
        if (!this.isSupported) return null;
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('cacheStore', 'readonly');
                const req = tx.objectStore('cacheStore').get(key);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = () => reject(tx.error);
            });
        } catch(e) { console.warn("[Y2C_DB Get Warn]", e); return null; }
    }
};

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
        btnEn.className = safeLang === 'en' ? "px-2.5 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2.5 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2.5 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2.5 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    
    // 차트 레이블 무손실 즉각 번역
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
// 🔒 [방어 V40.3] Absolute Null-Safe Parsers (재무 오염 100% 방어망)
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

function roundToCents(amount) { 
    return Math.round(parseStrictDecimal(amount) * 100) / 100; 
}

const formatCurrency = (amount) => { 
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(parseStrictDecimal(amount)); 
};

// 🌟 상단 프로필 렌더링 오류 방어
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName, "MASTER");
const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

// 🌟 글로벌 토스트 스팸 방어 (font-inter 동기화 및 E3000F 테마 적용)
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]', icon = type === 'success' ? '✅' : '⚠️';
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
// 🌟 25초 절대 백오프 통신 엔진 (CORS 강제 패싱)
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
                throw new Error("🚨 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight font-inter'>구글 배포 설정을 확인하세요.</span>");
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
// 📊 [V40.3 핵심] 대시보드 데이터 파이프라인 (IndexedDB + Race Condition 락다운)
// ============================================================================
let salesChartInstance = null; 
let isFetching = false; 
let currentDashboardFetchId = 0; // 🌟 [신규 방어 2] 비동기 경합 조건(Race Condition) 킬스위치

async function loadDashboardData() {
    if (isFetching) return;
    
    const yearSelector = document.getElementById('dashYearSelector');
    let targetYear = parseStrictNonNegativeInteger(yearSelector?.value) || new Date().getFullYear();
    
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.classList.add('animate-spin', 'text-[#E3000F]');

    isFetching = true;
    
    // 🌟 요청 ID를 갱신하여 이전 요청이 늦게 도착해도 렌더링 무시
    const fetchId = ++currentDashboardFetchId;

    // 🌟 [신규 방어 1] SWR 로컬 캐시 엔진 IndexedDB 기반 적용 (5MB Quota 초과 방어)
    const cacheKey = `Y2C_DASH_${targetYear}_${userRole === "MASTER" ? "ALL" : clientName}`;
    try {
        const cachedData = await Y2C_DB.get(cacheKey);
        if (cachedData && fetchId === currentDashboardFetchId) {
            applyDashboardUI(cachedData, false); // 캐시 기반 즉시 렌더링
        }
    } catch(e) {}

    try {
        const result = await executeApi("get_dashboard", { 
            year: targetYear, 
            targetYear: targetYear,
            clientName: userRole === "MASTER" ? "ALL" : clientName 
        });

        // 🌟 [방어 2] 통신 완료 후 최신 요청ID가 아니면 폐기 (Race Condition 차단)
        if (fetchId !== currentDashboardFetchId) return;

        if (result && result.success) {
            // 🌟 페이로드 맵핑 파괴 방어 (0달러 버그 완벽 해결)
            const dashboardData = {
                monthlySales: Array.isArray(result.monthlySales) ? result.monthlySales : Array(12).fill(0),
                ytdTotal: parseStrictDecimal(result.ytdTotal),
                ytdPos: parseStrictDecimal(result.ytdPos),
                ytdDelivery: parseStrictDecimal(result.ytdDelivery)
            };
            
            // 호환성 안전망 (Fallback)
            if (dashboardData.monthlySales.every(v => v === 0) && result.records && Array.isArray(result.records)) {
                result.records.forEach(r => {
                    const m = (parseStrictNonNegativeInteger(r.month) || 1) - 1;
                    const p = parseStrictDecimal(r.pos || r.posSales);
                    const d = parseStrictDecimal(r.delivery || r.deliverySales);
                    let t = parseStrictDecimal(r.total || r.totalSales || r.amount);
                    if (t === 0) t = roundToCents(p + d);
                    
                    if (m >= 0 && m < 12) {
                        dashboardData.monthlySales[m] = t;
                        if(dashboardData.ytdTotal === 0) { 
                            dashboardData.ytdTotal = roundToCents(dashboardData.ytdTotal + t);
                            dashboardData.ytdPos = roundToCents(dashboardData.ytdPos + p);
                            dashboardData.ytdDelivery = roundToCents(dashboardData.ytdDelivery + d);
                        }
                    }
                });
            }

            // IndexedDB 덮어쓰기 저장
            try { await Y2C_DB.set(cacheKey, dashboardData); } catch(e) {}

            applyDashboardUI(dashboardData, true);
        } else {
            const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
            throw new Error(result?.message || msgObj["toast_no_data"]);
        }
    } catch (err) {
        console.error("[Y2C Telemetry Dashboard Load Error]:", err);
        
        // 에러 발생 시 차트 엔진 강제 구동으로 시스템 락 방지 (0 폴백)
        try {
            if(typeof Chart === 'undefined') {
                await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/chart.js", "Chart");
            }
            if(fetchId === currentDashboardFetchId) {
                renderSalesChart(Array(12).fill(0));
            }
        } catch(e) {}
        
        const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
        showToast(`${msgObj["toast_sync_fail"]}: ${err.message}`, "error");
    } finally {
        if (fetchId === currentDashboardFetchId) {
            isFetching = false;
            if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E3000F]');
        }
    }
}

// 🌟 UI 반영 및 Chart.js 주입 (화면 번쩍임 방지)
function applyDashboardUI(data, isFromServer) {
    const elemTotal = document.getElementById('dashYtdTotal');
    const elemPos = document.getElementById('dashYtdPos');
    const elemDel = document.getElementById('dashYtdDelivery');

    if (elemTotal) elemTotal.textContent = formatCurrency(data.ytdTotal);
    if (elemPos) elemPos.textContent = formatCurrency(data.ytdPos);
    if (elemDel) elemDel.textContent = formatCurrency(data.ytdDelivery);

    try {
        if (typeof Chart === 'undefined') {
            loadHeavyLibrary("https://cdn.jsdelivr.net/npm/chart.js", "Chart").then(() => {
                renderSalesChart(data.monthlySales);
            });
        } else {
            renderSalesChart(data.monthlySales);
        }
    } catch (err) {
        console.warn("Chart rendering failed in UI apply", err);
    }
    
    if (isFromServer) {
        const msgObj = I18N_DICT[currentLang] || I18N_DICT['en'];
        const currentY = document.getElementById('dashYearSelector')?.value || new Date().getFullYear();
        showToast(`${currentY}: ${msgObj["toast_sync_success"]}`, "success");
    }
}

// ============================================================================
// 🌟 [방어 3, 4, 5] Chart.js OOM 방어 및 Retina Display 블러 방어
// ============================================================================
function renderSalesChart(monthlyData) {
    const ctx = document.getElementById('salesChartCanvas');
    if (!ctx) return;

    // 🌟 [신규 방어 4] 배열 오염 검증
    const safeData = Array.isArray(monthlyData) && monthlyData.length === 12 
        ? monthlyData.map(v => parseStrictDecimal(v)) 
        : Array(12).fill(0);

    const currentLabel = I18N_DICT[currentLang] ? I18N_DICT[currentLang]["chart_label"] : "Total Revenue (CAD)";

    // 🌟 [신규 방어 3] Memory Leak (OOM) 완전 방어를 위해 컨텍스트 파괴(Destroy) 후 안전하게 재생성
    // 기존 .update() 대신 destroy()를 호출하여 WebGL 메모리를 확실히 확보
    try {
        if (salesChartInstance) {
            salesChartInstance.destroy();
            salesChartInstance = null;
        }
    } catch(e) { console.warn("[Y2C Chart Destruct Error]", e); }

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 그라디언트 재생성 (OOM 억제)
    let gradient;
    try {
        gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(227, 0, 15, 0.4)');
        gradient.addColorStop(1, 'rgba(227, 0, 15, 0.0)');
    } catch(e) { gradient = 'rgba(227, 0, 15, 0.2)'; }

    // Inter 폰트 동기화
    Chart.defaults.font.family = "'Inter', sans-serif";

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: escapeHtml(currentLabel),
                data: safeData,
                borderColor: '#E3000F',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#E3000F',
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
            // 🌟 [신규 방어 5] 고해상도(Retina) 캔버스 블러(Blur) 방지 하드웨어 스케일링 강제
            devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 14, weight: 'bold' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
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

// 프론트엔드 실시간 에러 감지망
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다.", "error"));
window.addEventListener('online', () => showToast("네트워크 복구 완료.", "success"));
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
    isFetching = false;
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) refreshBtn.classList.remove('animate-spin', 'text-[#E3000F]');
});

// ============================================================================
// 🌟 시스템 초기화 및 이벤트 리스너 바인딩
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
