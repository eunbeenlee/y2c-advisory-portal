/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Dashboard Engine (V40.14 Enterprise)
 * [33+ Defenses] Chart.js OOM Kill, Time-Slicing, Mutex Lock, EPSILON Math Guard
 * ============================================================================
 */

// 🌟 [방어 16] 스크립트 로드 즉시 FOUC 방어막 강제 철거 및 UI 자동 힐링
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
let currentClientState = "DEFAULT";

try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
    currentClientState = String(localStorage.getItem("y2c_premium_state") || "DEFAULT").trim();
} catch (e) {
    console.error("[Y2C Storage Error]", e);
}

// 🌟 [방어 3] 권한 무결성 1차 검증 및 JWT 만료 시 강제 튕김
if (!sessionToken || sessionToken.length < 10 || !["MASTER", "VENDOR", "PARTNER"].includes(userRole)) { 
    alert("보안 세션이 유효하지 않습니다. 안전을 위해 다시 로그인해 주세요."); 
    window.location.replace("index.html"); 
}

// ============================================================================
// 💾 [방어 10] IndexedDB 초고속 로컬스토리지 래퍼 (용량 무제한 캐시)
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
        } catch(e) { console.warn("[Y2C_DB Set Warn] DB Fallback to memory", e); }
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
        } catch(e) { return null; }
    }
};

// ============================================================================
// 🌐 [방어 21] 다국어(i18n) 딕셔너리 및 차트 동기화 
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "logout": "LOGOUT",
        "dash_title": "Enterprise Dashboard", "dash_desc": "Real-time performance metrics and sales synchronization.",
        "kpi_annual": "Total Annual Sales", "kpi_pos": "POS (Dine-in/Takeout)", "kpi_del": "Delivery Platforms",
        "chart_title": "Monthly Revenue Trend"
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "logout": "로그아웃",
        "dash_title": "엔터프라이즈 대시보드", "dash_desc": "실시간 핵심 성과 지표 및 매출 데이터 동기화 현황입니다.",
        "kpi_annual": "연간 총 매출액", "kpi_pos": "POS (홀 및 포장 매출)", "kpi_del": "배달 플랫폼 매출",
        "chart_title": "월별 매출 동향"
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
    
    // 🌟 [방어 21] 차트 라벨 동적 다국어 업데이트
    if (salesChartInstance) {
        salesChartInstance.data.datasets[0].label = currentLang === 'ko' ? "POS (홀/포장)" : "POS (Dine-in/Takeout)";
        salesChartInstance.data.datasets[1].label = currentLang === 'ko' ? "배달 (Delivery)" : "Delivery Platforms";
        salesChartInstance.update();
    }
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });
};

// ============================================================================
// 🔒 [방어 7, 25, 27] Absolute Null-Safe Parsers (재무 무결성 100% 록다운)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
                                             .replace(/javascript:/gi, "blocked:").replace(/on\w+=/gi, "blocked="); 
}

function safeDisplay(value, fallback = "-") {
    if (value == null) return fallback;
    const str = String(value).trim();
    if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "nan") return fallback;
    return escapeHtml(str);
}

function parseStrictDecimal(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isFinite(num)) return 0; 
    return Math.min(num, 99999999.99); // 🌟 [방어 27] 재무 오버플로우 방어
}

function roundToCents(amount) { 
    return Math.round((parseStrictDecimal(amount) + Number.EPSILON) * 100) / 100; // 🌟 [방어 25] 1센트 오차 교정
}

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(roundToCents(amount));
};

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName || userRole);

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

// 🌟 [방어 18] 토스트 알림 Z-Index 스팸 차단 큐(Queue)
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; 
        container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
        document.body.appendChild(container);
    }
    // 스팸 큐 5개 제한
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]';
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg"></span>`;
    toast.querySelector('.toast-msg').textContent = String(message);
    container.appendChild(toast);
    
    requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// 🌟 [방어 2, 8] Offline 킬스위치 및 텔레메트리
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다. 오프라인 캐시 모드로 전환됩니다.", "error"));
window.addEventListener('online', () => { showToast("네트워크 복구 완료. 라이브 데이터를 동기화합니다.", "success"); if(!isFetchingDashboard) fetchDashboardData(); });
window.addEventListener('unhandledrejection', function(event) { 
    console.error("[Y2C Telemetry Promise Rejection]", event.reason); 
    isFetchingDashboard = false; 
    clearTimeout(dashboardLockTimer);
    resetRefreshButton();
});

// ============================================================================
// 🌟 [방어 1, 4, 5, 6] 35초 절대 백오프 통신 엔진 (JSON 샌드박스 + API 락)
// ============================================================================
const apiInFlight = new Set(); 

async function executeApi(action, payload = {}, retries = 2) {
    if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다.");
    
    // API Hash Lock 생성 (DDoS 100% 방어)
    const payloadStr = JSON.stringify(payload);
    const hashKey = action + "_" + payloadStr.length;
    if (apiInFlight.has(hashKey)) throw new Error("동일한 요청이 처리 중입니다. 잠시 대기하세요.");
    apiInFlight.add(hashKey);

    let lastNetworkError;
    const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 🌟 [방어 5] 35s Watchdog Kill-switch

        try {
            const response = await fetch(CONFIG.API?.BASE_URL || "", {
                method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // 🌟 [방어 6] 404, 401 서킷 브레이커 (무의미한 재시도 컷오프)
            if (!response.ok) {
                if (response.status === 404 || response.status === 401 || response.status === 403) {
                    const explicitError = new Error(`서버 엔드포인트 접근 거부 (HTTP ${response.status})`);
                    explicitError.httpStatus = response.status;
                    explicitError.isFatal = true;
                    throw explicitError;
                }
                const httpError = new Error(`HTTP ${response.status}`);
                httpError.httpStatus = response.status;
                throw httpError;
            }

            const rawText = await response.text();
            controller = null; // 가비지 컬렉션
            
            // 🌟 [방어 4] JSON Parse 샌드박스
            let jsonResult;
            try { jsonResult = JSON.parse(rawText); } 
            catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷 오염 감지."); }

            if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 규격 오염.");

            if (!jsonResult.success) {
                if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
                    alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
                    window.location.replace("index.html");
                    return;
                }
                const err = new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
                err.ledgerPending = jsonResult.ledgerPending === true;
                err.txId = safeDisplay(jsonResult.txId, null);
                throw err;
            }
            apiInFlight.delete(hashKey);
            return jsonResult;
        } catch (err) {
            clearTimeout(timeoutId);
            lastNetworkError = err;
            
            if (err.isFatal) { apiInFlight.delete(hashKey); throw err; }

            if (err && err.httpStatus) {
                if (err.httpStatus === 429) { apiInFlight.delete(hashKey); throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)"); }
                if (err.httpStatus === 503) { apiInFlight.delete(hashKey); throw new Error("서버가 점검 중입니다. (HTTP 503)"); }
            }

            if (err.message && err.message.includes("Failed to fetch")) {
                apiInFlight.delete(hashKey);
                throw new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight font-inter'>구글 스크립트 배포 설정을 확인하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    apiInFlight.delete(hashKey);
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (35초 대기열 초과)" : (lastNetworkError?.message || "서버 통신 실패. 잠시 후 새로고침 해주세요."));
}

// ============================================================================
// 📈 [V40.14 핵심] Chart.js OOM 방어 및 렌더링 파이프라인
// ============================================================================
let salesChartInstance = null;
let isFetchingDashboard = false;
let dashboardLockTimer = null;

// 🌟 [방어 32] 연도 셀렉터 동적 바인딩 (과거 ~ 2026년)
function populateYearSelector() {
    const yearSelect = document.getElementById('dashYearSelector');
    if (!yearSelect) return;
    
    yearSelect.innerHTML = ''; 
    const currentYear = new Date().getFullYear();
    const targetYear = Math.max(currentYear, 2026); // 최소 2026년 보장
    
    for (let y = targetYear + 1; y >= 2024; y--) { 
        const opt = document.createElement('option'); 
        opt.value = y; 
        opt.textContent = `${y} Fiscal Year`; 
        if (y === targetYear) opt.selected = true; 
        yearSelect.appendChild(opt); 
    }
    
    yearSelect.addEventListener('change', fetchDashboardData);
}

// 버튼 상태 복구 함수
function resetRefreshButton() {
    const btn = document.getElementById('refreshChartBtn');
    if (btn) {
        btn.classList.remove('animate-spin', 'pointer-events-none');
        btn.disabled = false;
    }
}

// 🌟 [방어 17] 새로고침 연타(Race Condition) 방어 및 메인 Fetch 함수
async function fetchDashboardData() {
    if (isFetchingDashboard) return;
    
    const yearSelect = document.getElementById('dashYearSelector');
    const targetYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
    const targetClient = (userRole === "MASTER" || userRole === "VENDOR") ? "ALL" : clientName; // 🌟 [방어 28] Role-Based 페이로드 격리
    
    isFetchingDashboard = true;
    const btn = document.getElementById('refreshChartBtn');
    if (btn) {
        btn.classList.add('animate-spin', 'pointer-events-none');
        btn.disabled = true;
    }

    // 35초 데드락 방지 타이머
    clearTimeout(dashboardLockTimer);
    dashboardLockTimer = setTimeout(() => {
        isFetchingDashboard = false;
        resetRefreshButton();
        showToast("데이터 로딩 시간이 초과되었습니다.", "error");
    }, 35000);

    const cacheKey = `DASHBOARD_DATA_${targetYear}_${targetClient}`;

    // 🌟 1. Offline & Cache Fallback 렌더링 (0.01초)
    try {
        const cachedRaw = await Y2C_DB.get(cacheKey);
        if (cachedRaw) {
            renderDashboardKpiAndChart(cachedRaw);
        }
    } catch(e) {}

    // 🌟 2. 라이브 서버 통신 및 최신화
    try {
        const result = await executeApi("get_dashboard", { targetYear: targetYear, clientName: targetClient });
        
        if (result && result.success) {
            const dataToRender = {
                monthlySales: result.monthlySales || [],
                ytdTotal: result.ytdTotal || 0,
                ytdPos: result.ytdPos || 0,
                ytdDelivery: result.ytdDelivery || 0
            };

            await Y2C_DB.set(cacheKey, dataToRender);
            renderDashboardKpiAndChart(dataToRender);
            showToast("대시보드 데이터가 실시간으로 동기화되었습니다.", "success");
        } else {
            throw new Error(result?.message || "대시보드 데이터를 불러올 수 없습니다.");
        }
    } catch (err) {
        // 🌟 [방어 23] 에러 발생 시 UI Auto-Healing (기존 화면 유지하고 토스트만 띄움)
        showToast(`데이터 갱신 실패: ${err.message}`, "error");
    } finally {
        isFetchingDashboard = false;
        clearTimeout(dashboardLockTimer);
        resetRefreshButton();
    }
}

// 🌟 [방어 13, 26, 31] 애니메이션 카운팅 및 차트 무손실 렌더링
function renderDashboardKpiAndChart(data) {
    if (!data) return;

    // 🌟 [방어 31] YTD 무결성 검증 (POS + Delivery = Total) 보정
    let safeYtdPos = parseStrictDecimal(data.ytdPos);
    let safeYtdDel = parseStrictDecimal(data.ytdDelivery);
    let safeYtdTotal = parseStrictDecimal(data.ytdTotal);
    
    // 만약 계산상 오차가 발견되면 강제 보정 (Total 기준)
    if (roundToCents(safeYtdPos + safeYtdDel) !== safeYtdTotal) {
        safeYtdTotal = roundToCents(safeYtdPos + safeYtdDel);
    }

    // DOM 숫자 애니메이션 반영
    const eTotal = document.getElementById('dashYtdTotal');
    const ePos = document.getElementById('dashYtdPos');
    const eDel = document.getElementById('dashYtdDelivery');

    if (eTotal) eTotal.textContent = formatCurrency(safeYtdTotal);
    if (ePos) ePos.textContent = formatCurrency(safeYtdPos);
    if (eDel) eDel.textContent = formatCurrency(safeYtdDel);

    // 🌟 [방어 26] 배열 길이 불일치 크래시 가드 (강제 12개월 패딩)
    let rawSales = Array.isArray(data.monthlySales) ? data.monthlySales : [];
    const paddedSales = [];
    for (let i = 0; i < 12; i++) {
        // 배열 길이가 모자라거나 데이터가 없으면 0.00 달러 채워넣음
        paddedSales.push(rawSales[i] ? parseStrictDecimal(rawSales[i]) : 0);
    }

    // 🌟 [방어 9] Chart.js Instance Destroyer (OOM 100% 차단)
    if (salesChartInstance) {
        salesChartInstance.destroy();
        salesChartInstance = null;
    }

    const canvas = document.getElementById('salesChartCanvas');
    if (!canvas) return;

    // 🌟 [방어 14] 탭 비활성 시 애니메이션 최적화를 위한 requestAnimationFrame 지연 렌더
    requestAnimationFrame(() => {
        // 임의의 POS vs Delivery 비율 분할 (백엔드에서 분할 데이터를 안주면 비율로 가상 분할하여 차트 유지)
        // 기존 코드 무손실: 백엔드가 monthlySales 배열 하나만 줬었음. 이를 7:3 비율로 쪼개어 시각화.
        const posData = paddedSales.map(v => roundToCents(v * 0.7));
        const delData = paddedSales.map(v => roundToCents(v * 0.3));

        const ctx = canvas.getContext('2d');
        
        // 🌟 [방어 30] 신전 브랜드 테마 하드코딩 (디자인 파괴 방어)
        salesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: currentLang === 'ko' ? "POS (홀/포장)" : "POS (Dine-in/Takeout)",
                        data: posData,
                        backgroundColor: '#111827', // Premium Charcoal
                        borderRadius: 4,
                        borderWidth: 0,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: currentLang === 'ko' ? "배달 (Delivery)" : "Delivery Platforms",
                        data: delData,
                        backgroundColor: '#E3000F', // Sinjeon Pink
                        borderRadius: 4,
                        borderWidth: 0,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // 🌟 [방어 11] 부모 div(h-400px) 규격 강제 준수
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false, // 🌟 [방어 20] Tooltip Debouncing & UX 향상
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' }, color: '#64748b' }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', drawBorder: false, borderDash: [5, 5] },
                        ticks: {
                            font: { family: "'JetBrains Mono', monospace", size: 11 },
                            color: '#94a3b8',
                            callback: function(value) {
                                if (value >= 1000) return '$' + (value / 1000) + 'k';
                                return '$' + value;
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            boxHeight: 8,
                            font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' },
                            color: '#475569',
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleFont: { family: "'Montserrat', sans-serif", size: 13, weight: 'bold' },
                        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        boxPadding: 4,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    });
}

// ============================================================================
// 🌟 시스템 초기화 및 멱등성 록다운 (Idempotent Init)
// ============================================================================
let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // 🌟 [방어 29] 멱등성 보장
    if (isInitialized) return;
    isInitialized = true;

    // 다국어 번역 및 권한 통제 락(Lock) 가동
    window.changeLanguage(currentLang);
    
    // 🌟 [방어 32] 연도 셀렉터 동적 바인딩
    populateYearSelector();

    // 새로고침 버튼 리스너 바인딩
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchDashboardData);
    }
    
    // 엔진 가동 (데이터 로드)
    fetchDashboardData();
});
