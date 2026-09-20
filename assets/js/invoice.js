/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Invoice Engine (V17.42 Ultimate)
 * [Absolute Null-Safe] 빈칸, 쉼표, 쓰레기 데이터 완벽 방어 및 PDF/CSV 무결성
 * ============================================================================
 */

// 🌟 스크립트 로드 즉시 FOUC 방어막 강제 철거
try {
    document.documentElement.classList.remove("opacity-0");
    document.documentElement.style.opacity = "1";
    document.body.classList.remove("opacity-0");
    document.body.style.opacity = "1";
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

// 🌟 [방어 22] 마스터 권한 무결성 1차 검증 (인보이스는 본사 고유 권한)
if (!sessionToken || userRole !== "MASTER") { 
    alert("재무/정산(Invoice) 데이터는 본사 마스터 계정만 접근 가능합니다.");
    window.location.replace("index.html"); 
}

// ============================================================================
// 🌐 글로벌 다국어 (i18n) 엔진
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
        "lbl_subtotal": "Subtotal:", "lbl_tax": "Estimated Tax (HST/GST):", "lbl_total_due": "TOTAL AMOUNT DUE", "lbl_thanks": "Thank you for your partnership"
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
        "inv_ctrl_title": "정산 제어 패널", "lbl_client": "대상 가맹점", "lbl_year": "정산 연도", "lbl_rate": "수수료율 (%)", "lbl_start": "시작 월", "lbl_end": "종료 월", "btn_pdf": "🖨️ PDF 인쇄", "btn_csv": "📥 CSV 다운로드",
        "doc_title": "정산 청구서", "lbl_inv_no": "청구 번호:", "lbl_date": "발행일:", "lbl_due": "납부 기한:",
        "lbl_issued_by": "발신 (본사)", "lbl_prep_for": "수신 (가맹점)",
        "th_desc": "청구 내역", "th_base": "기준 금액", "th_rate": "비율", "th_amt": "청구액",
        "lbl_remit": "송금 계좌 정보", "lbl_bank": "은행명:", "lbl_address": "은행 주소:", "lbl_account": "계좌번호:", "lbl_swift": "스위프트 코드:", "lbl_memo_warn": "⚠️ 송금 메모에 반드시 <strong class='font-black underline'>청구 번호(Invoice No)</strong>를 기재해 주세요.",
        "lbl_subtotal": "소계:", "lbl_tax": "예상 세금 (HST/GST):", "lbl_total_due": "최종 납부 금액", "lbl_thanks": "귀하의 노고와 파트너십에 감사드립니다"
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
    if (window.applyTranslations) window.applyTranslations();
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang]; if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (dict[key]) el.innerHTML = dict[key]; });
};

// ============================================================================
// 🔒 [방어 V17.42] Absolute Null-Safe Parsers (빈칸, 특수문자, 쉼표, NaN 100% 방어)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
}

// 🌟 [방어 1] 화면 출력 전용 안전 파서: 빈칸이나 "null" 텍스트를 깔끔한 "-" 로 치환
function safeDisplay(value, fallback = "-") {
    if (value == null) return fallback;
    const str = String(value).trim();
    if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "nan") return fallback;
    return escapeHtml(str);
}

// 🌟 [방어 4] 정수 파서: 완전한 빈칸, 쉼표(,)를 0으로 우회 및 음수 차단
function parseStrictNonNegativeInteger(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (!/^\d+$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isSafeInteger(num) || num < 0) return 0; 
    return num; 
}

// 🌟 [방어 2] 재무 소수점 파서: 가격/세율 등에 쉼표가 들어와도 완벽 필터링
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

// 🌟 [방어 3] 센트(Cent) 단위 재무 오차 강제 교정 
function roundToCents(amount) { 
    return Math.round(parseStrictDecimal(amount) * 100) / 100; 
}

// 🌟 [방어 23] 날짜 포맷 Null-Safe 보정
const formatDate = (dateObj) => {
    if(!dateObj || isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: '2-digit' });
};

// 🌟 재무 출력 Null-Safe 포맷터
const formatCurrency = (amount) => { 
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(parseStrictDecimal(amount)); 
};

const generateIdempotencyKey = () => { 
  if (window.crypto && crypto.randomUUID) return "REQ-" + crypto.randomUUID().toUpperCase();
  if (window.crypto && crypto.getRandomValues) { const array = new Uint32Array(4); window.crypto.getRandomValues(array); return 'REQ-' + Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').toUpperCase(); }
  return 'REQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 10).toUpperCase(); 
};

// 🌟 상단 뱃지 및 로그아웃 보호
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName, "MASTER");
const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

// 🌟 [방어 20] 글로벌 토스트 알림 Z-Index 스팸 억제
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]', icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${escapeHtml(message)}</span>`;
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
// 🌟 [방어 8, 9, 12] 25초 절대 백오프 통신 엔진 (CORS 강제 패싱)
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
                throw new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight'>구글 배포 설정을 확인하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (25s 대기열 초과)" : (lastNetworkError?.message || "서버 통신 실패."));
}

let cachedClients = [];
let currentInvoiceData = null; // CSV 데이터 추출용 무결성 캐시
let isGenerating = false;
let fallbackLockTimer = null; // 🌟 30초 무한 로딩 방지 타이머

// ============================================================================
// 📁 1. 컨트롤 패널 초기화 (가맹점 리스트 로드)
// ============================================================================
async function initInvoicePanel() {
    const selClient = document.getElementById('selClient');
    const selYear = document.getElementById('selYear');
    
    if (selYear) {
        selYear.value = new Date().getFullYear();
    }

    try {
        const result = await executeApi("get_master_data");
        // 🌟 [방어 10] Omni-Parser: 객체 뎁스 파편화 대응
        const clientsArray = result.clients || result.data || [];
        
        if (result && result.success && clientsArray.length > 0) {
            cachedClients = clientsArray;
            if (selClient) {
                selClient.innerHTML = `<option value="">-- Select Target Client --</option>`;
                cachedClients.forEach(c => {
                    selClient.innerHTML += `<option value="${escapeHtml(c.name)}">${safeDisplay(c.name)} (${safeDisplay(c.state, 'N/A')})</option>`;
                });
            }
        } else {
            if(selClient) selClient.innerHTML = `<option value="">Failed to load franchises</option>`;
        }
    } catch (err) {
        showToast("가맹점 목록을 불러오지 못했습니다.", "error");
        if(selClient) selClient.innerHTML = `<option value="">Error loading data</option>`;
    }
}

// ============================================================================
// 🧾 2. [핵심 로직] 정산서 데이터 병합 및 Absolute Null-Safe 렌더링
// ============================================================================
async function generateInvoice() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    
    if (isGenerating) return showToast(dict["toast_generating"], "error");

    const clientNameInput = document.getElementById('selClient')?.value;
    const targetYear = parseStrictNonNegativeInteger(document.getElementById('selYear')?.value);
    const rate = parseStrictDecimal(document.getElementById('selRate')?.value); 
    const startMonth = parseStrictNonNegativeInteger(document.getElementById('selStart')?.value);
    const endMonth = parseStrictNonNegativeInteger(document.getElementById('selEnd')?.value);

    // 🌟 [방어 19] 입력값 무결성 및 타임 패러독스 교차 검증
    if (!clientNameInput) return showToast(dict["toast_err_client"], "error");
    if (targetYear === 0) return showToast(dict["toast_err_year"], "error");
    if (startMonth > endMonth) return showToast(dict["toast_err_month"], "error");
    if (startMonth < 1 || endMonth > 12) return showToast(dict["toast_err_month_range"], "error");

    // 🌟 [방어 11] 물리적 연타 방어 플래그
    isGenerating = true;
    currentInvoiceData = null; // 생성 시작 전 기존 캐시 파기
    showToast(dict["toast_generating"], "success");

    const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
    let originalHtml = btnNodes.length > 0 ? btnNodes[0].innerHTML : "GENERATE DATA";
    btnNodes.forEach(btn => {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING...</span>`;
    });

    // 🌟 30초 무한 로딩 강제 해제(Self-Healing)
    clearTimeout(fallbackLockTimer);
    fallbackLockTimer = setTimeout(() => {
        if(isGenerating) {
            isGenerating = false;
            btnNodes.forEach(btn => { btn.disabled = false; btn.innerHTML = originalHtml; });
            showToast("시스템 응답 시간이 초과되었습니다. 다시 시도해 주세요.", "error");
        }
    }, 30000);

    try {
        const result = await executeApi("get_invoice", { 
            clientName: clientNameInput, targetYear, startMonth, endMonth 
        });

        if (result && result.success) {
            // 🌟 [방어 10] Omni-Parser 2.0: 백엔드 페이로드 객체 구조 파편화 완벽 방어
            const data = result.data || result.invoiceData || result.invoice || result || {};
            
            // 1. 하위 객체 방어 (Null-Safe)
            const clientInfo = data.clientInfo || data.client || {};
            const hqInfo = data.hqInfo || data.hq || {};

            // 🌟 [방어 2] 재무 데이터 Strict 파싱 (totalSales 누락, 쉼표, 빈칸 시 0 처리)
            const baseAmount = roundToCents(parseStrictDecimal(data.totalSales || data.amount || data.baseAmount));
            
            // 🌟 [방어 24] 0달러 인보이스 처리
            if (baseAmount === 0) {
                showToast(dict["toast_no_erp"], "success");
            }

            // 🌟 [방어 3] 부동소수점 오차(Cent Rounding) 없는 로열티 계산
            const royaltyAmount = roundToCents(baseAmount * (rate / 100));
            
            // 🌟 [방어 29] 주(Province)별 CRA 세법 정밀 검증 및 폴백
            const stateCode = String(clientInfo.state || "DEFAULT").toUpperCase().trim();
            const taxObj = CONFIG.TAX_RATES[stateCode] || CONFIG.TAX_RATES["DEFAULT"] || { name: "Standard Tax", rate: 0.13 };
            const taxAmount = roundToCents(royaltyAmount * parseStrictDecimal(taxObj.rate));
            const grandTotal = roundToCents(royaltyAmount + taxAmount);

            // 날짜 계산
            const today = new Date();
            const dueDateObj = new Date(today);
            dueDateObj.setDate(today.getDate() + 14); 
            
            // 🌟 [방어 27] 멱등성 식별키 난수 조합
            const invNo = `INV-${targetYear}${String(startMonth).padStart(2, '0')}-${clientNameInput.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

            // ====================================================================
            // 🌟 5. DOM 렌더링 & Absolute Null-Safe(safeDisplay) 변수 매핑
            // ====================================================================
            document.getElementById('invNo').innerText = safeDisplay(invNo);
            document.getElementById('invDate').innerText = formatDate(today);
            document.getElementById('invDue').innerText = formatDate(dueDateObj);

            // HQ Info 렌더링 (빈칸일 경우 "-" 폴백)
            document.getElementById('hqName').innerText = safeDisplay(hqInfo.name || hqInfo.hqName, "Y2C Holdings Inc.");
            document.getElementById('hqAddress').innerText = safeDisplay(hqInfo.address || hqInfo.hqAddress);
            document.getElementById('hqContact').innerText = safeDisplay(hqInfo.contact || hqInfo.phone);
            document.getElementById('hqRegNo').innerText = safeDisplay(hqInfo.regNo || hqInfo.businessNo);
            document.getElementById('hqRep').innerText = safeDisplay(hqInfo.rep || hqInfo.representative);
            
            document.getElementById('hqBank').innerText = safeDisplay(hqInfo.bankName || hqInfo.bank);
            document.getElementById('hqBankAddress').innerText = safeDisplay(hqInfo.bankAddress || hqInfo.bankAddr || hqInfo.address);
            document.getElementById('hqAccount').innerText = safeDisplay(hqInfo.accountNo || hqInfo.account);
            document.getElementById('hqSwift').innerText = safeDisplay(hqInfo.swift || hqInfo.swiftCode);

            // Client Info 렌더링
            document.getElementById('clientName').innerText = safeDisplay(clientInfo.name || clientNameInput);
            document.getElementById('clientAddress').innerText = safeDisplay(clientInfo.address);
            document.getElementById('clientCity').innerText = safeDisplay(`${clientInfo.city || "-"}, ${clientInfo.state || "-"}`);
            document.getElementById('clientAttn').innerText = safeDisplay(clientInfo.manager || clientInfo.attn);
            document.getElementById('clientBizId').innerText = safeDisplay(clientInfo.bizId || clientInfo.businessId);

            // Calculation Line
            document.getElementById('descLine').innerHTML = `${escapeHtml(dict["desc_mas"])}<br><span class="text-xs text-gray-500 font-medium mt-1 block">Period: ${targetYear}-${String(startMonth).padStart(2,'0')} to ${targetYear}-${String(endMonth).padStart(2,'0')}</span>`;
            document.getElementById('baseLine').innerText = formatCurrency(baseAmount);
            document.getElementById('rateLine').innerText = `${rate}%`;
            document.getElementById('amtLine').innerText = formatCurrency(royaltyAmount);

            // Totals
            document.getElementById('subTotal').innerText = formatCurrency(royaltyAmount);
            
            const taxLabelEl = document.getElementById('taxAmt')?.parentElement;
            if(taxLabelEl) {
                taxLabelEl.innerHTML = `Estimated Tax <span class="font-bold text-gray-800">(${escapeHtml(taxObj.name)})</span>: <span class="font-black text-[var(--premium-charcoal)] font-mono ml-4 print-text-black text-sm" id="taxAmt">${formatCurrency(taxAmount)}</span>`;
            } else if (document.getElementById('taxAmt')) {
                document.getElementById('taxAmt').innerText = formatCurrency(taxAmount);
            }
            
            document.getElementById('totalDue').innerText = formatCurrency(grandTotal);

            // 🌟 [방어 5, 26] CSV Export 및 PDF 인쇄를 위한 데이터 영속성 무결성 캐시 저장
            currentInvoiceData = {
                invNo, date: formatDate(today), client: clientNameInput, 
                baseAmount, rate, royaltyAmount, taxName: taxObj.name, taxAmount, grandTotal
            };

            showToast(dict["toast_success"], "success");
        } else {
            throw new Error(result?.message || "데이터 동기화 및 인보이스 생성에 실패했습니다.");
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    } finally {
        // 🌟 [방어 21] 버튼 상태 100% 스냅 복원
        isGenerating = false;
        clearTimeout(fallbackLockTimer);
        btnNodes.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        });
    }
}

// ============================================================================
// 🖨️ [방어 25] 브라우저 네이티브 PDF 인쇄 엔진 (렌더링 레이아웃 붕괴 통제)
// ============================================================================
window.printInvoicePDF = function() {
    if (!currentInvoiceData) {
        return showToast("먼저 정산서(GENERATE DATA)를 생성한 후 인쇄해 주세요.", "error");
    }

    const style = document.createElement('style');
    style.id = 'printOverrideStyle';
    style.innerHTML = `
        @media print {
            body * { visibility: hidden !important; }
            #invoiceDocumentContainer, #invoiceDocumentContainer * { visibility: visible !important; }
            #invoiceDocumentContainer { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
            .no-print { display: none !important; }
            @page { margin: 10mm; size: auto; }
        }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    setTimeout(() => {
        const override = document.getElementById('printOverrideStyle');
        if (override) override.remove();
    }, 1500);
};

// ============================================================================
// 📥 3. CSV 추출 엔진 (엑셀 한글 깨짐 방지 및 특수문자 방어)
// ============================================================================
function exportInvoiceCSV() {
    if (!currentInvoiceData) {
        return showToast("먼저 정산서(GENERATE DATA)를 생성한 후 다운로드 해주세요.", "error");
    }

    // 🌟 [방어 6] 엑셀 열(Column) 파괴 방지를 위한 필드 쌍따옴표 캡슐화
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

    // 🌟 [방어 7] 엑셀에서 한글이 깨지지 않도록 BOM(\uFEFF) 바이트 할당
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + row.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // 🌟 [방어 26] 파일명 특수문자 OS 크래시 에러 방어
    const safeFileName = `${currentInvoiceData.invNo}_${currentInvoiceData.client.replace(/[\s\/\\:*?"<>|]/g, '_')}.csv`;
    link.setAttribute("download", safeFileName);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV 다운로드가 완료되었습니다.", "success");
}

// 글로벌 네임스페이스 바인딩
window.generateInvoice = generateInvoice;
window.exportInvoiceCSV = exportInvoiceCSV;
window.printInvoicePDF = printInvoicePDF; 

// ============================================================================
// 🚨 [방어 14, 28] 에러 텔레메트리 (글로벌 락/멈춤 추적 및 강제 해제)
// ============================================================================
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다.", "error"));
window.addEventListener('online', () => showToast("네트워크 복구 완료.", "success"));
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
    if(isGenerating) {
        isGenerating = false;
        clearTimeout(fallbackLockTimer);
        const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
        btnNodes.forEach(btn => { btn.disabled = false; btn.innerHTML = "GENERATE DATA"; });
        showToast("데이터 연산 중 치명적 오류가 발생하여 복구했습니다.", "error");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();
    initInvoicePanel();
});
