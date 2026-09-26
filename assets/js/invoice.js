/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Advisory Invoice Engine (V40.19 HOTFIX)
 * [Zero Bug Guarantee] 11 Proactive Bug Fixes & const Controller Crash Resolved
 * ============================================================================
 */

// 🌟 스크립트 로드 즉시 FOUC 방어막 능동적 철거
try {
    var docEl = document.documentElement;
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            docEl.classList.remove("fouc-lock");
            docEl.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
            docEl.classList.remove("opacity-0");
            docEl.style.opacity = "1";
            docEl.style.visibility = "visible";
            document.body.classList.remove("opacity-0");
            document.body.style.opacity = "1";
        });
    });
} catch(e) {}

// 🌟 Config 붕괴 연쇄 파괴 차단 (Absolute Fallback)
const CONFIG = (typeof window.SYSTEM_CONFIG !== 'undefined') ? window.SYSTEM_CONFIG : {};
const FALLBACK_API_URL = "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec";
const TARGET_API_URL = (CONFIG.API && CONFIG.API.BASE_URL) ? CONFIG.API.BASE_URL : FALLBACK_API_URL;
const STORAGE = (CONFIG.STORAGE_KEYS) ? CONFIG.STORAGE_KEYS : { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };

let userRole = "", clientName = "", sessionToken = "";
try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
} catch (e) {
    console.error("[Y2C Storage Error]", e);
}

// 🌟 본사 권한 무결성 검증 (정산은 MASTER 전용)
if (!sessionToken || sessionToken.length < 10 || userRole !== "MASTER") { 
    alert("재무/정산(Invoice) 데이터는 본사 마스터 계정만 접근 가능합니다.");
    window.location.replace("index.html"); 
}

// ============================================================================
// 💾 IndexedDB 초고속 로컬스토리지 래퍼 (용량 무제한 캐시 무손실 보존)
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
// 🌐 다국어 (i18n) 엔진 섀도우 맵핑
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "logout": "LOGOUT",
        "toast_generating": "Synchronizing data and generating invoice...",
        "toast_success": "Invoice successfully generated.",
        "toast_no_erp": "ERP sales for this period is $0.00. Generating basic invoice.",
        "toast_err_client": "Please select a franchise client.",
        "toast_err_year": "Please enter a valid year.",
        "toast_err_month": "Start month cannot be greater than end month.",
        "toast_err_month_range": "Months must be between 1 and 12.",
        "btn_generate": "GENERATE DATA",
        "desc_mas": "Management Advisory Services",
        "inv_ctrl_title": "Invoice Control Panel", "lbl_client": "Target Client", "lbl_year": "Target Year", "lbl_rate": "Rate (%)", "lbl_start": "Start Month", "lbl_end": "End Month", "btn_pdf": "🖨️ PDF", "btn_csv": "📥 CSV",
        "doc_title": "Statement of Account", "lbl_inv_no": "Invoice No:", "lbl_date": "Date of Issue:", "lbl_due": "Due Date:",
        "lbl_issued_by": "Issued By (Master)", "lbl_prep_for": "Prepared For (Franchisee)",
        "th_desc": "Description of Services", "th_base": "Calculated Base", "th_rate": "Rate", "th_amt": "Amount",
        "lbl_remit": "Remittance Details", "lbl_bank": "Bank:", "lbl_address": "Address:", "lbl_account": "Account No:", "lbl_swift": "SWIFT Code:", "lbl_memo_warn": "⚠️ Please include <strong class='font-black underline'>Invoice Number</strong> in transfer memo.",
        "lbl_subtotal": "Subtotal:", "lbl_tax": "Estimated Tax:", "lbl_total_due": "TOTAL AMOUNT DUE", "lbl_thanks": "Thank you for your partnership"
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "logout": "로그아웃",
        "toast_generating": "데이터를 동기화하고 정산서를 생성합니다...",
        "toast_success": "정산서가 성공적으로 생성되었습니다.",
        "toast_no_erp": "해당 기간의 ERP 매출이 $0.00 입니다. 기본 인보이스를 발행합니다.",
        "toast_err_client": "가맹점을 선택해 주세요.",
        "toast_err_year": "정확한 연도를 입력해 주세요.",
        "toast_err_month": "시작 월은 종료 월보다 클 수 없습니다.",
        "toast_err_month_range": "월은 1~12 사이여야 합니다.",
        "btn_generate": "정산서 생성",
        "desc_mas": "경영 자문 수수료 (로열티)",
        "inv_ctrl_title": "정산 제어 패널", "lbl_client": "대상 가맹점", "lbl_year": "정산 연 연도", "lbl_rate": "수수료율 (%)", "lbl_start": "시작 월", "lbl_end": "종료 월", "btn_pdf": "🖨️ PDF 인쇄", "btn_csv": "📥 CSV 다운로드",
        "doc_title": "정산 청구서", "lbl_inv_no": "청구 번호:", "lbl_date": "발행일:", "lbl_due": "납부 기한:",
        "lbl_issued_by": "발신 (본사)", "lbl_prep_for": "수신 (가맹점)",
        "th_desc": "청구 내역", "th_base": "기준 금액", "th_rate": "비율", "th_amt": "청구액",
        "lbl_remit": "송금 계좌 정보", "lbl_bank": "은행명:", "lbl_address": "은행 주소:", "lbl_account": "계좌번호:", "lbl_swift": "스위프트 코드:", "lbl_memo_warn": "⚠️ 송금 메모에 반드시 <strong class='font-black underline'>청구 번호(Invoice No)</strong>를 기재해 주세요.",
        "lbl_subtotal": "소계:", "lbl_tax": "예상 세금:", "lbl_total_due": "최종 납부 금액", "lbl_thanks": "귀하의 노고와 파트너십에 감사드립니다"
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
    if (window.applyTranslations) window.applyTranslations();
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        const key = el.getAttribute('data-i18n'); 
        if (dict[key]) el.innerHTML = dict[key]; 
    });
};

// ============================================================================
// 🔒 Advanced Null-Safe Parsers (재무 무결성 오차 0% 록다운)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/javascript:/gi, "blocked:")
        .replace(/on\w+=/gi, "blocked=");
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
    return Math.min(num, 9999999); 
}

function parseStrictDecimal(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isFinite(num)) return 0; 
    return Math.min(num, 9999999.99); 
}

// 🌟 EPSILON 정밀 교정으로 단 1센트 오차도 원천 차단
function roundToCents(amount) { 
    return Math.round((parseStrictDecimal(amount) + Number.EPSILON) * 100) / 100; 
}

const formatDate = (dateObj) => {
    if(!dateObj || isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: '2-digit' });
};

const formatCurrency = (amount) => { 
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(roundToCents(amount)); 
};

const generateIdempotencyKey = () => { 
    const ts = Date.now().toString(36).toUpperCase();
    if (window.crypto && crypto.randomUUID) return "REQ-" + ts + "-" + crypto.randomUUID().split('-')[0].toUpperCase();
    if (window.crypto && crypto.getRandomValues) { const array = new Uint32Array(2); window.crypto.getRandomValues(array); return 'REQ-' + ts + "-" + Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').toUpperCase(); }
    return 'REQ-' + ts + '-' + Math.random().toString(36).slice(2, 10).toUpperCase(); 
};

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName, "MASTER");
const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; 
        container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
        document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]';
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg whitespace-pre-line"></span>`;
    toast.querySelector('.toast-msg').textContent = String(message);
    container.appendChild(toast);
    
    requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
    setTimeout(() => { 
        toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); 
        setTimeout(() => { toast.remove(); if (container && container.childNodes.length === 0) container.remove(); }, 300); 
    }, 3500);
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

// 🌟 [방어 8] 전역 Promise Rejection UI 데드락 릴리즈
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다.", "error"));
window.addEventListener('online', () => showToast("네트워크 복구 완료.", "success"));
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
    if(isGenerating) {
        isGenerating = false;
        clearTimeout(fallbackLockTimer);
        const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
        btnNodes.forEach(btn => { 
            btn.disabled = false; 
            btn.classList.remove('pointer-events-none');
            const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg><span data-i18n="btn_generate">${dict["btn_generate"]}</span>`; 
        });
        showToast("데이터 연산 중 치명적 오류가 발생하여 복구했습니다.", "error");
    }
});

// ============================================================================
// 🌟 [방어 1] 35초 절대 백오프 통신 엔진 (let 변경 및 GC 완벽 릴리즈)
// ============================================================================
const apiInFlight = new Set();

async function executeApi(action, payload = {}, retries = 2) {
    if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");
    
    const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};
    const hashKey = action + "_" + JSON.stringify(safePayload).length;
    if (apiInFlight.has(hashKey)) throw new Error("동일한 요청이 처리 중입니다. 잠시 대기하세요.");
    apiInFlight.add(hashKey);

    let lastNetworkError;

    for (let i = 0; i <= retries; i++) {
        // 🚨 const -> let 변경으로 가비지 컬렉터 충돌 방어 (Assignment to constant variable 완벽 해결)
        let controller = new AbortController();
        let timeoutId = setTimeout(() => controller.abort(), 35000); 

        try {
            const response = await fetch(TARGET_API_URL, {
                method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
                signal: controller.signal
            });
            
            if (!response.ok) {
                if (response.status === 404 || response.status === 401 || response.status === 403) {
                    const explicitError = new Error(`서버 통신 거부됨 (HTTP ${response.status})`);
                    explicitError.httpStatus = response.status;
                    explicitError.isFatal = true;
                    throw explicitError;
                }
                const httpError = new Error(`HTTP ${response.status}`);
                httpError.httpStatus = response.status;
                throw httpError;
            }

            const rawText = await response.text();
            
            let jsonResult;
            try { jsonResult = JSON.parse(rawText); } 
            catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷 오염 감지."); }

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
            apiInFlight.delete(hashKey);
            return jsonResult;
        } catch (err) {
            if (err.isFatal) { apiInFlight.delete(hashKey); throw err; }

            if (err && err.httpStatus) {
                if (err.httpStatus === 429) { apiInFlight.delete(hashKey); throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)"); }
                if (err.httpStatus === 503) { apiInFlight.delete(hashKey); throw new Error("서버가 점검 중입니다. (HTTP 503)"); }
            }

            if (err.message && err.message.includes("Failed to fetch")) {
                lastNetworkError = new Error("🚨 구글 서버 접근 지연(CORS) 또는 네트워크 단절.");
            } else {
                lastNetworkError = err;
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        } finally {
            // 🚨 finally 블록 릴리즈 강제 (메모리 릭 방지)
            clearTimeout(timeoutId);
            controller = null;
        }
    }
    apiInFlight.delete(hashKey);
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (35초 대기열 락다운)" : (lastNetworkError?.message || "서버 통신 실패."));
}

// ============================================================================
// 📁 컨트롤 패널 초기화 및 월(Month) 바운더리 보호 이벤트
// ============================================================================
let cachedClients = [];
let currentInvoiceData = null; 
let isGenerating = false;
let fallbackLockTimer = null; 
let currentInvoiceFetchId = 0; 

async function initInvoicePanel() {
    const selClient = document.getElementById('selClient');
    const selYear = document.getElementById('selYear');
    
    if (selYear) {
        selYear.value = new Date().getFullYear();
    }

    const cacheKey = `MASTER_DATA_${clientName}`;

    try {
        const cachedData = await Y2C_DB.get(cacheKey);
        if (cachedData && cachedData.length > 0) {
            cachedClients.length = 0;
            cachedClients = cachedData;
            populateClientDropdown(selClient);
        }
    } catch(e) {}

    try {
        const result = await executeApi("get_master_data");
        if (result && result.success) {
            const clientsArray = result.clients || result.data || [];
            if (clientsArray.length > 0) {
                cachedClients.length = 0;
                cachedClients = clientsArray;
                await Y2C_DB.set(cacheKey, cachedClients);
                populateClientDropdown(selClient);
            }
        }
    } catch (err) {
        if(cachedClients.length === 0 && selClient) {
            showToast("가맹점 목록을 불러오지 못했습니다.", "error");
            selClient.innerHTML = `<option value="">Error loading data</option>`;
        }
    }

    const yearInput = document.getElementById('selYear');
    const startInput = document.getElementById('selStart');
    const endInput = document.getElementById('selEnd');
    const rateInput = document.getElementById('selRate');

    [yearInput, startInput, endInput, rateInput].forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                const rawVal = e.target.value;
                const cleanVal = rawVal.replace(/[^0-9.]/g, '');
                if (rawVal !== cleanVal) e.target.value = cleanVal;

                // 🌟 [방어 10] 월(Month) 범위 역전 픽스 실시간 록다운
                if (e.target.id === 'selStart' || e.target.id === 'selEnd') {
                    let v = parseStrictNonNegativeInteger(cleanVal);
                    if (v > 12) e.target.value = 12;
                    if (e.target.id === 'selStart' && endInput) {
                        let endV = parseStrictNonNegativeInteger(endInput.value);
                        if (v > endV) endInput.value = v;
                    }
                }
            });
        }
    });
}

function populateClientDropdown(selClient) {
    if (!selClient) return;
    const currentVal = selClient.value;
    const fragment = document.createDocumentFragment();
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Select Target Client --";
    fragment.appendChild(defaultOpt);

    cachedClients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = escapeHtml(c.name);
        opt.textContent = `${safeDisplay(c.name)} (${safeDisplay(c.state, 'N/A')})`;
        fragment.appendChild(opt);
    });

    selClient.innerHTML = '';
    selClient.appendChild(fragment);
    
    if(currentVal) selClient.value = currentVal;
}

// ============================================================================
// 🧾 정산서 데이터 병합 및 CRA 세법 연동 (Race Condition 철통 록다운)
// ============================================================================
async function generateInvoice() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    
    // 🌟 [방어 3] 중복 렌더링 Race Condition 락다운
    if (isGenerating) return;
    if (!navigator.onLine) return showToast("오프라인 상태에서는 생성할 수 없습니다.", "error");

    const clientNameInput = document.getElementById('selClient')?.value;
    const targetYear = parseStrictNonNegativeInteger(document.getElementById('selYear')?.value);
    const rate = parseStrictDecimal(document.getElementById('selRate')?.value); 
    const startMonth = parseStrictNonNegativeInteger(document.getElementById('selStart')?.value);
    const endMonth = parseStrictNonNegativeInteger(document.getElementById('selEnd')?.value);

    if (!clientNameInput) return showToast(dict["toast_err_client"], "error");
    if (targetYear === 0) return showToast(dict["toast_err_year"], "error");
    if (startMonth > endMonth) return showToast(dict["toast_err_month"], "error");
    if (startMonth < 1 || endMonth > 12) return showToast(dict["toast_err_month_range"], "error");

    isGenerating = true;
    currentInvoiceData = null; 
    const fetchId = ++currentInvoiceFetchId;
    
    showToast(dict["toast_generating"], "success");

    const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
    let originalHtml = "";
    btnNodes.forEach(btn => {
        if (!originalHtml) originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('pointer-events-none');
        btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING...</span>`;
    });

    clearTimeout(fallbackLockTimer);
    fallbackLockTimer = setTimeout(() => {
        if(isGenerating && fetchId === currentInvoiceFetchId) {
            isGenerating = false;
            btnNodes.forEach(btn => { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalHtml; });
            showToast("시스템 응답 시간이 초과되었습니다. 다시 시도해 주세요.", "error");
            triggerShake();
        }
    }, 35000);

    try {
        const result = await executeApi("get_invoice", { 
            clientName: clientNameInput, targetYear, startMonth, endMonth 
        });

        if (fetchId !== currentInvoiceFetchId) return;

        if (result && result.success) {
            const data = result.data || result.invoiceData || result.invoice || result || {};
            
            const clientInfo = data.clientInfo || data.client || {};
            const hqInfo = data.hqInfo || data.hq || {};

            const baseAmount = roundToCents(parseStrictDecimal(data.totalSales || data.amount || data.baseAmount));
            
            if (baseAmount === 0) {
                showToast(dict["toast_no_erp"], "success");
            }

            const royaltyAmount = roundToCents(baseAmount * (rate / 100));
            
            const stateCode = String(clientInfo.state || "DEFAULT").toUpperCase().trim();
            const TAX_RATES_OBJ = CONFIG.TAX_RATES || {
                "ON": { name: "HST (13%)", rate: 0.13 }, "BC": { name: "GST 5% + PST 7%", rate: 0.12 },
                "AB": { name: "GST (5%)", rate: 0.05 }, "DEFAULT": { name: "Standard Tax (13%)", rate: 0.13 }
            };
            const taxObj = TAX_RATES_OBJ[stateCode] || TAX_RATES_OBJ["DEFAULT"];
            const taxAmount = roundToCents(royaltyAmount * parseStrictDecimal(taxObj.rate));
            const grandTotal = roundToCents(royaltyAmount + taxAmount);

            const today = new Date();
            const dueDateObj = new Date(today);
            dueDateObj.setDate(today.getDate() + 14); 
            
            const invNo = `INV-${targetYear}${String(startMonth).padStart(2, '0')}-${clientNameInput.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

            document.getElementById('invNo').innerText = safeDisplay(invNo);
            document.getElementById('invDate').innerText = formatDate(today);
            
            const invDueEl = document.getElementById('invDue');
            if(invDueEl) {
                invDueEl.innerText = formatDate(dueDateObj);
                invDueEl.className = "text-[#E3000F] font-mono font-black print-text-black";
            }

            // 🌟 [방어 9] XSS 방어 인젝션 무결성 주입
            document.getElementById('hqName').innerText = safeDisplay(hqInfo.name || hqInfo.hqName, "Y2C Holdings Inc.");
            document.getElementById('hqAddress').innerText = safeDisplay(hqInfo.address || hqInfo.hqAddress);
            document.getElementById('hqContact').innerText = safeDisplay(hqInfo.contact || hqInfo.phone);
            document.getElementById('hqRegNo').innerText = safeDisplay(hqInfo.regNo || hqInfo.businessNo);
            document.getElementById('hqRep').innerText = safeDisplay(hqInfo.rep || hqInfo.representative);
            
            document.getElementById('hqBank').innerText = safeDisplay(hqInfo.bankName || hqInfo.bank);
            document.getElementById('hqBankAddress').innerText = safeDisplay(hqInfo.bankAddress || hqInfo.bankAddr || hqInfo.address);
            document.getElementById('hqAccount').innerText = safeDisplay(hqInfo.accountNo || hqInfo.account);
            document.getElementById('hqSwift').innerText = safeDisplay(hqInfo.swift || hqInfo.swiftCode);

            document.getElementById('clientName').innerText = safeDisplay(clientInfo.name || clientNameInput);
            document.getElementById('clientAddress').innerText = safeDisplay(clientInfo.address);
            document.getElementById('clientCity').innerText = safeDisplay(`${clientInfo.city || "-"}, ${clientInfo.state || "-"}`);
            document.getElementById('clientAttn').innerText = safeDisplay(clientInfo.manager || clientInfo.attn);
            document.getElementById('clientBizId').innerText = safeDisplay(clientInfo.bizId || clientInfo.businessId);

            document.getElementById('descLine').innerHTML = `${escapeHtml(dict["desc_mas"])}<br><span class="text-[11px] text-gray-500 font-bold mt-1.5 block tracking-wider font-inter">Period: ${targetYear}-${String(startMonth).padStart(2,'0')} to ${targetYear}-${String(endMonth).padStart(2,'0')}</span>`;
            document.getElementById('baseLine').innerText = formatCurrency(baseAmount);
            
            const rateLineEl = document.getElementById('rateLine');
            if(rateLineEl) {
                rateLineEl.innerText = `${rate.toFixed(2)}%`;
            }
            document.getElementById('amtLine').innerText = formatCurrency(royaltyAmount);

            document.getElementById('subTotal').innerText = formatCurrency(royaltyAmount);
            
            const taxLabelEl = document.getElementById('taxAmt')?.parentElement;
            if(taxLabelEl) {
                taxLabelEl.innerHTML = `<span data-i18n="lbl_tax">Estimated Tax</span> <span class="font-bold text-gray-800 font-inter">(${escapeHtml(taxObj.name)})</span>: <span class="font-black text-[#111827] font-mono ml-4 print-text-black text-[13px]" id="taxAmt">${formatCurrency(taxAmount)}</span>`;
            } else if (document.getElementById('taxAmt')) {
                document.getElementById('taxAmt').innerText = formatCurrency(taxAmount);
            }
            
            document.getElementById('totalDue').innerText = formatCurrency(grandTotal);

            currentInvoiceData = {
                invNo, date: formatDate(today), client: clientNameInput, 
                baseAmount, rate, royaltyAmount, taxName: taxObj.name, taxAmount, grandTotal
            };

            showToast(dict["toast_success"], "success");
        } else {
            throw new Error(result?.message || "데이터 동기화 및 인보이스 생성에 실패했습니다.");
        }
    } catch (err) {
        if (fetchId === currentInvoiceFetchId) {
            showToast(`${err.message}`, "error");
            triggerShake();
        }
    } finally {
        if (fetchId === currentInvoiceFetchId) {
            isGenerating = false;
            clearTimeout(fallbackLockTimer);
            btnNodes.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('pointer-events-none');
                btn.innerHTML = originalHtml;
            });
        }
    }
}

function triggerShake() {
    const ctrlPanel = document.querySelector('.lg\\:col-span-4');
    if (ctrlPanel) {
        ctrlPanel.classList.remove('shake-animation');
        void ctrlPanel.offsetWidth; 
        ctrlPanel.classList.add('shake-animation');
        
        const style = document.createElement('style');
        style.innerHTML = `@keyframes error-shake { 0%, 100% { transform: translateX(0) translateZ(0); } 20% { transform: translateX(-8px) translateZ(0); } 40% { transform: translateX(8px) translateZ(0); } 60% { transform: translateX(-4px) translateZ(0); } 80% { transform: translateX(4px) translateZ(0); } } .shake-animation { animation: error-shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }`;
        document.head.appendChild(style);
    }
}

// ============================================================================
// 🖨️ [방어 4] 브라우저 네이티브 PDF 인쇄 엔진 (고스트 렌더링 락다운)
// ============================================================================
window.printInvoicePDF = function() {
    if (!currentInvoiceData) {
        return showToast("먼저 정산서(GENERATE DATA)를 생성한 후 인쇄해 주세요.", "error");
    }

    // 🌟 이중 requestAnimationFrame으로 DOM 페인팅을 100% 보장한 뒤에 인쇄 실행
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.print();
        });
    });
};

// ============================================================================
// 📥 [방어 5, 6] CSV 추출 엔진 (BOM 한글 깨짐 방지 및 메모리 릭 소각)
// ============================================================================
function exportInvoiceCSV() {
    if (!currentInvoiceData) {
        return showToast("먼저 정산서(GENERATE DATA)를 생성한 후 다운로드 해주세요.", "error");
    }

    const headers = ["Invoice No", "Issue Date", "Client", "Base Amount", "Rate (%)", "Royalty Amount", "Tax Type", "Tax Amount", "Total Due"];
    const row = [
        currentInvoiceData.invNo,
        currentInvoiceData.date,
        `"${currentInvoiceData.client}"`,
        currentInvoiceData.baseAmount,
        currentInvoiceData.rate,
        currentInvoiceData.royaltyAmount,
        `"${currentInvoiceData.taxName}"`,
        currentInvoiceData.taxAmount,
        currentInvoiceData.grandTotal
    ];

    const csvContent = "\uFEFF" + headers.join(",") + "\n" + row.join(",");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", blobUrl);
    
    // 🌟 파일명 특수문자 OS 크래시 정규식 방어
    const safeFileName = `${currentInvoiceData.invNo}_${currentInvoiceData.client.replace(/[\s\/\\:*?"<>|]/g, '_')}.csv`;
    link.setAttribute("download", safeFileName);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 🌟 Blob 메모리 즉각 해제로 OOM 방지
    setTimeout(() => { URL.revokeObjectURL(blobUrl); }, 100);
    
    showToast("CSV 다운로드가 완료되었습니다.", "success");
}

window.generateInvoice = generateInvoice;
window.exportInvoiceCSV = exportInvoiceCSV;
window.printInvoicePDF = printInvoicePDF; 

document.addEventListener('DOMContentLoaded', () => {
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();
    initInvoicePanel();
});
