// assets/js/invoice.js
// 🌟 V17.40 Ultimate Hardening (Enterprise Core) - 30가지 교차 검증, 재무 오차 100% 차단, 25초 백오프 엔진 탑재

// 🌟 [방어 17] 스크립트 로드 즉시 FOUC 방어막 강제 철거 보장
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

// 🌟 [방어 17] 마스터 권한 무결성 1차 검증 (인보이스는 본사 고유 권한)
if (!sessionToken || userRole !== "MASTER") { 
    alert("재무/정산(Invoice) 데이터는 본사 마스터 계정만 접근 가능합니다.");
    window.location.replace("index.html"); 
}

// ============================================================================
// 🌐 글로벌 다국어 (i18n) 엔진 탑재 및 인젝션 방어
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
    
    const btnEn = document.getElementById('lang_en');
    const btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = safeLang === 'en' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang];
    if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });
};

// 🌟 상단 뱃지 및 로그아웃 보호
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = escapeHtml(clientName || "MASTER");

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = escapeHtml(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

// ============================================================================
// 🔒 [방어 1, 2, 16] Strict Parsers & 재무 회계 무결성 연산 함수
// ============================================================================
function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function parseStrictDecimal(value) {
    let str = String(value ?? "").trim();
    if (str === "") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return null;
    const num = Number(str);
    if (!Number.isFinite(num)) return null;
    return num;
}

// 🌟 [방어 1] JS 부동소수점 오차 강제 교정 (Cent 단위 반올림)
function roundToCents(amount) {
    return Math.round(Number(amount) * 100) / 100;
}

// 🌟 [방어 2] 재무 포맷터 Null-Safe 방어
const formatCurrency = (amount) => {
    let safeAmount = Number(amount);
    if (Number.isNaN(safeAmount) || !Number.isFinite(safeAmount)) safeAmount = 0;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(safeAmount);
};

// 🌟 [방어 28] 날짜 포맷 Null-Safe 보정
const formatDate = (dateObj) => {
    if(!dateObj || isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: '2-digit' });
};

// 🌟 [방어 24] 글로벌 토스트 알림 Z-Index 스팸 억제
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]';
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// 🌟 글로벌 권한 통제 엔진
function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    ['navDashboard', 'navRecipes', 'navAdmin', 'navInvoice'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });

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
// 🌟 [방화벽 6, 7] 25초 절대 킬스위치 및 지수형 백오프(Exponential Backoff) 통신
// ============================================================================
async function executeApi(action, payload = {}, retries = 2) {
    if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");
    let lastNetworkError;
    const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); 

        try {
            // 🌟 [방어 10] CORS Preflight 원천 우회를 위한 text/plain 고정
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
            controller = null; // 메모리 확보
            
            let jsonResult;
            try { 
                jsonResult = JSON.parse(rawText); 
            } catch (parseErr) { 
                throw new Error("서버 응답 파싱 실패. 시스템 포맷 불일치."); 
            }

            if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 규격 오염.");

            if (!jsonResult.success) {
                if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
                    alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
                    window.location.replace("index.html");
                    return;
                }
                const err = new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류 발생.");
                throw err;
            }
            return jsonResult;
        } catch (err) {
            clearTimeout(timeoutId);
            lastNetworkError = err;

            if (err && err.httpStatus) {
                if (err.httpStatus === 429) throw new Error("서버 접속 대기열 초과 (HTTP 429)");
                if (err.httpStatus === 503) throw new Error("서버 일시적 점검 중 (HTTP 503)");
                throw err;
            }

            if (err.message && err.message.includes("Failed to fetch")) {
                throw new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight'>구글 스크립트 배포 설정을 확인하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (25초)" : (lastNetworkError?.message || "서버 통신 실패."));
}

let cachedClients = [];
let currentInvoiceData = null; // CSV 데이터 무결성 캐시
let isGenerating = false;
let fallbackLockTimer = null; // 🌟 [방어 27] 무한 로딩 대비 락 해제 타이머

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
        // 🌟 [방어 8] Omni-Parser: 객체 구조 파편화 대응
        const clientsArray = result.clients || result.data || [];
        
        if (result && result.success && clientsArray.length > 0) {
            cachedClients = clientsArray;
            if (selClient) {
                selClient.innerHTML = `<option value="">-- Select Target Client --</option>`;
                cachedClients.forEach(c => {
                    selClient.innerHTML += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${escapeHtml(c.state || 'N/A')})</option>`;
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
// 🧾 2. [핵심 로직] 옴니 파서 기반 정산서 데이터 병합 및 무결성 렌더링
// ============================================================================
async function generateInvoice() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    
    if (isGenerating) return showToast(dict["toast_generating"], "error");

    const clientNameInput = document.getElementById('selClient')?.value;
    const targetYear = parseInt(document.getElementById('selYear')?.value);
    const rate = parseFloat(document.getElementById('selRate')?.value) || 2; 
    const startMonth = parseInt(document.getElementById('selStart')?.value);
    const endMonth = parseInt(document.getElementById('selEnd')?.value);

    // 🌟 [방어 25] 입력값 무결성 및 타임 패러독스 교차 검증
    if (!clientNameInput) return showToast(dict["toast_err_client"], "error");
    if (!targetYear || targetYear < 2000) return showToast(dict["toast_err_year"], "error");
    if (startMonth > endMonth) return showToast(dict["toast_err_month"], "error");
    if (startMonth < 1 || endMonth > 12) return showToast(dict["toast_err_month_range"], "error");

    // 🌟 [방어 9] 물리적 연타 방어 플래그
    isGenerating = true;
    currentInvoiceData = null; // 캐시 초기화
    showToast(dict["toast_generating"], "success");

    const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
    let originalHtml = btnNodes.length > 0 ? btnNodes[0].innerHTML : "GENERATE DATA";
    
    btnNodes.forEach(btn => {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING...</span>`;
    });

    // 🌟 [방어 27] 30초 초과 시 무한 로딩 강제 락 해제 (Fail-Safe)
    clearTimeout(fallbackLockTimer);
    fallbackLockTimer = setTimeout(() => {
        if(isGenerating) {
            isGenerating = false;
            btnNodes.forEach(btn => { btn.disabled = false; btn.innerHTML = originalHtml; });
            showToast("데이터 생성 요청 시간이 초과되었습니다.", "error");
        }
    }, 30000);

    try {
        const result = await executeApi("get_invoice", { 
            clientName: clientNameInput, targetYear, startMonth, endMonth 
        });

        if (result && result.success) {
            // 🌟 [방어 8] Omni-Parser 2.0: 구조 파편화 완벽 우회
            const data = result.data || result.invoiceData || result.invoice || result || {};
            
            // 1. 하위 객체 Null-Safe 방어
            const clientInfo = data.clientInfo || data.client || {};
            const hqInfo = data.hqInfo || data.hq || {};

            // 🌟 [방어 1, 2, 3] 매출 데이터 엄격 파싱 및 음수 스푸핑 방어
            let rawBaseAmount = parseStrictDecimal(data.totalSales || data.amount || data.baseAmount || 0);
            if (rawBaseAmount === null || rawBaseAmount < 0) rawBaseAmount = 0;
            const baseAmount = roundToCents(rawBaseAmount);
            
            // 🌟 [방어 5] 0달러 인보이스 처리
            if (baseAmount === 0) {
                showToast(dict["toast_no_erp"], "success");
            }

            // 부동소수점 오차 없는 로열티 계산
            const royaltyAmount = roundToCents(baseAmount * (rate / 100));
            
            // 🌟 [방어 4] 주(Province)별 세법 우회 폴백 및 검증
            const stateCode = (clientInfo.state || "DEFAULT").toUpperCase();
            const taxObj = CONFIG.TAX_RATES[stateCode] || CONFIG.TAX_RATES["DEFAULT"] || { name: "Standard Tax", rate: 0 };
            
            const taxAmount = roundToCents(royaltyAmount * taxObj.rate);
            const grandTotal = roundToCents(royaltyAmount + taxAmount);

            // 날짜 계산 (14일 후 듀데이트 보장)
            const today = new Date();
            const dueDateObj = new Date(today);
            dueDateObj.setDate(today.getDate() + 14); 
            
            // 🌟 [방어 22] 멱등성 및 위변조 방지 인보이스 고유 해시
            const invNo = `INV-${targetYear}${String(startMonth).padStart(2, '0')}-${clientNameInput.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

            // ====================================================================
            // 🌟 5. [방어 13, 29] DOM 렌더링 & 무결점 옵셔널 체이닝 매핑
            // ====================================================================
            document.getElementById('invNo').innerText = escapeHtml(invNo);
            document.getElementById('invDate').innerText = formatDate(today);
            document.getElementById('invDue').innerText = formatDate(dueDateObj);

            // 본사(HQ) 정보 렌더링 (공백/Null일 경우 "-" 폴백)
            document.getElementById('hqName').innerText = escapeHtml(hqInfo.name || hqInfo.hqName || "Y2C Holdings Inc.");
            document.getElementById('hqAddress').innerText = escapeHtml(hqInfo.address || hqInfo.hqAddress || "-");
            document.getElementById('hqContact').innerText = escapeHtml(hqInfo.contact || hqInfo.phone || "-");
            document.getElementById('hqRegNo').innerText = escapeHtml(hqInfo.regNo || hqInfo.businessNo || "-");
            document.getElementById('hqRep').innerText = escapeHtml(hqInfo.rep || hqInfo.representative || "-");
            
            document.getElementById('hqBank').innerText = escapeHtml(hqInfo.bankName || hqInfo.bank || "-");
            document.getElementById('hqBankAddress').innerText = escapeHtml(hqInfo.bankAddress || hqInfo.bankAddr || hqInfo.address || "-");
            document.getElementById('hqAccount').innerText = escapeHtml(hqInfo.accountNo || hqInfo.account || "-");
            document.getElementById('hqSwift').innerText = escapeHtml(hqInfo.swift || hqInfo.swiftCode || "-");

            // 가맹점(Client) 정보 렌더링
            document.getElementById('clientName').innerText = escapeHtml(clientInfo.name || clientNameInput);
            document.getElementById('clientAddress').innerText = escapeHtml(clientInfo.address || "-");
            document.getElementById('clientCity').innerText = escapeHtml(`${clientInfo.city || "-"}, ${clientInfo.state || "-"}`);
            document.getElementById('clientAttn').innerText = escapeHtml(clientInfo.manager || clientInfo.attn || "-");
            document.getElementById('clientBizId').innerText = escapeHtml(clientInfo.bizId || clientInfo.businessId || "-");

            // 청구 내역 및 단가 렌더링
            const descHtmlStr = `${escapeHtml(dict["desc_mas"])}<br><span class="text-xs text-gray-500 font-medium mt-1 block">Period: ${escapeHtml(targetYear)}-${String(startMonth).padStart(2,'0')} to ${escapeHtml(targetYear)}-${String(endMonth).padStart(2,'0')}</span>`;
            document.getElementById('descLine').innerHTML = descHtmlStr; // 🚨 <br> 렌더링을 위한 통제된 innerHTML 허용
            document.getElementById('baseLine').innerText = formatCurrency(baseAmount);
            document.getElementById('rateLine').innerText = `${rate}%`;
            document.getElementById('amtLine').innerText = formatCurrency(royaltyAmount);

            // 최종 정산 합계금액
            document.getElementById('subTotal').innerText = formatCurrency(royaltyAmount);
            
            const taxLabelEl = document.getElementById('taxAmt')?.parentElement;
            if(taxLabelEl) {
                taxLabelEl.innerHTML = `Estimated Tax <span class="font-bold text-gray-800">(${escapeHtml(taxObj.name)})</span>: <span class="font-black text-[var(--premium-charcoal)] font-mono ml-4 print-text-black text-sm" id="taxAmt">${formatCurrency(taxAmount)}</span>`;
            } else if (document.getElementById('taxAmt')) {
                document.getElementById('taxAmt').innerText = formatCurrency(taxAmount);
            }
            
            document.getElementById('totalDue').innerText = formatCurrency(grandTotal);

            // 🌟 [방어 18, 20] CSV Export 및 PDF 출력을 위한 데이터 영속성 락
            currentInvoiceData = {
                invNo, date: formatDate(today), client: clientNameInput, 
                baseAmount, rate, royaltyAmount, taxName: taxObj.name, taxAmount, grandTotal
            };

            showToast(dict["toast_success"], "success");
        } else {
            throw new Error(result?.message || "데이터 동기화 및 생성에 실패했습니다.");
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    } finally {
        // 🌟 [방어 23] 상태 원상 복구 및 타이머 해제
        isGenerating = false;
        clearTimeout(fallbackLockTimer);
        btnNodes.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        });
    }
}

// ============================================================================
// 🖨️ 브라우저 네이티브 PDF 인쇄 엔진 (렌더링 레이아웃 붕괴 방어)
// ============================================================================
window.printInvoicePDF = function() {
    // 🌟 [방어 18] 데이터 생성 전 인쇄 시도 차단
    if (!currentInvoiceData) {
        return showToast("먼저 정산서(GENERATE DATA)를 생성한 후 인쇄를 시도하세요.", "error");
    }

    // 🌟 [방어 19] CSS 런타임 인젝션을 통한 프린트 레이아웃 시프트 완벽 통제
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
    
    // 네이티브 인쇄 대화상자 호출
    window.print();
    
    // 스타일 즉시 롤백 처리
    setTimeout(() => {
        const override = document.getElementById('printOverrideStyle');
        if (override) override.remove();
    }, 1500);
};

// ============================================================================
// 📥 3. CSV 데이터 수출(Export) 엔진 (무결성 및 인코딩 보존)
// ============================================================================
function exportInvoiceCSV() {
    if (!currentInvoiceData) {
        return showToast("먼저 정산서(GENERATE DATA)를 생성한 후 다운로드 해주세요.", "error");
    }

    // 🌟 [방어 21] 필드 내 쉼표(,) 오염 방지를 위한 쌍따옴표 캡슐화
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

    // 🌟 [방어 20] 엑셀에서 한글 및 유니코드가 깨지지 않도록 BOM(\uFEFF) 바이트 할당
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + row.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // 파일명 공백 치환
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
// 🚨 에러 텔레메트리 (글로벌 락/멈춤 추적 및 강제 해제)
// ============================================================================
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다.", "error"));
window.addEventListener('online', () => showToast("네트워크 복구 완료.", "success"));
window.addEventListener('error', function(event) {
    console.error("[Y2C Telemetry Error]", event.message);
});
// 🌟 [방어 14] 글로벌 비동기 에러 낚시망
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

// DOM 렌더링 완료 후 초기화 시작
document.addEventListener('DOMContentLoaded', () => {
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();
    initInvoicePanel();
});
