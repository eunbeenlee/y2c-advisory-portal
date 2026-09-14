// assets/js/invoice.js
// 🌟 V17.1 Ultimate Kernel - Zero Deletion, i18n Translation Engine, PDF Print Restored, CORS Shield

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };
const userRole = (localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(STORAGE.CLIENT_NAME);
const sessionToken = localStorage.getItem(STORAGE.USER_TOKEN); 

// 🌟 [방화벽 1] 마스터 권한 무결성 검증 (인보이스는 본사 고유 권한)
if (!sessionToken || userRole !== "MASTER") { 
    alert("재무/정산(Invoice) 데이터는 본사 마스터 계정만 접근 가능합니다.");
    window.location.replace("index.html"); 
}

// ============================================================================
// 🌐 글로벌 번역 (i18n) 엔진 탑재
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
        "desc_mas": "Management Advisory Services"
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
        "desc_mas": "경영 자문 수수료 (로열티)"
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

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName || "MASTER";

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    localStorage.clear(); 
    window.location.replace("index.html"); 
});

// 회계 표준 포맷팅 (Null-Safe 방어)
const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(safeAmount);
};
const formatDate = (dateObj) => {
    if(!dateObj) return "-";
    return dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: '2-digit' });
};

// 🌟 [UI] 상태 알림 토스트 메시지 (V17.1 신전 핑크 테마 동기화)
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
// 🔒 [V17.1 업그레이드] 투명성 보장형 글로벌 권한 통제 엔진 (Transparent RBAC)
// ============================================================================
function applyGlobalRbacNavigation() {
    const rbacRules = {
        'navDashboard': ['MASTER', 'PARTNER'], 
        'navRecipes': ['MASTER', 'PARTNER'],   
        'navAdmin': ['MASTER', 'VENDOR'],      
        'navInvoice': ['MASTER']               
    };

    // 1. 모든 GNB 탭 강제 노출 (시스템 스케일 증명)
    ['navDashboard', 'navRecipes', 'navAdmin', 'navInvoice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });

    // 2. 권한 락(Lock) 처리 및 이벤트 강제 탈취 (이벤트 복제)
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
// 🌟 [방화벽 2] 타임아웃 절단기 및 지능형 백오프(Jittered Backoff) 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastError;
    if (!navigator.onLine) throw new Error("네트워크(Wi-Fi/데이터)가 끊어졌습니다.");

    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20초 응답 대기 한계선

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
            
            // 🚨 CORS 에러(Failed to fetch) 강제 추적
            if (err.message && err.message.includes("Failed to fetch")) {
                throw new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight'>구글 스크립트 배포 설정을 '모든 사용자(Anyone)'로 변경하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                console.warn(`[재무 데이터 통신 지연 우회] ${waitTime}ms 대기 후 재시도... (${i+1}/${retries})`);
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastError?.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 새로고침 후 다시 시도해주세요.");
}

let cachedClients = [];
let currentInvoiceData = null; // CSV 데이터 추출용 무결성 캐시
let isGenerating = false;

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
        // Omni-Parser 대응
        const clientsArray = result.clients || result.data || [];
        
        if (result && result.success && clientsArray.length > 0) {
            cachedClients = clientsArray;
            if (selClient) {
                selClient.innerHTML = `<option value="">-- Select Target Client --</option>`;
                cachedClients.forEach(c => {
                    selClient.innerHTML += `<option value="${c.name}">${c.name} (${c.state || 'N/A'})</option>`;
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
// 🧾 2. [핵심 로직] 옴니 파서 기반 정산서(Invoice) 데이터 병합 및 렌더링
// ============================================================================
async function generateInvoice() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    
    if (isGenerating) return showToast(dict["toast_generating"], "error");

    const clientName = document.getElementById('selClient')?.value;
    const targetYear = parseInt(document.getElementById('selYear')?.value);
    const rate = parseFloat(document.getElementById('selRate')?.value) || 2; 
    const startMonth = parseInt(document.getElementById('selStart')?.value);
    const endMonth = parseInt(document.getElementById('selEnd')?.value);

    // [방어벽] 입력값 무결성 검증
    if (!clientName) return showToast(dict["toast_err_client"], "error");
    if (!targetYear || targetYear < 2000) return showToast(dict["toast_err_year"], "error");
    if (startMonth > endMonth) return showToast(dict["toast_err_month"], "error");
    if (startMonth < 1 || endMonth > 12) return showToast(dict["toast_err_month_range"], "error");

    isGenerating = true;
    showToast(dict["toast_generating"], "success");

    const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
    let originalHtml = btnNodes.length > 0 ? btnNodes[0].innerHTML : "GENERATE DATA";
    btnNodes.forEach(btn => {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING...</span>`;
    });

    try {
        const result = await executeApi("get_invoice", { 
            clientName, targetYear, startMonth, endMonth 
        });

        console.log(`[Invoice Data Scanned]`, result);

        if (result && result.success) {
            // 🚨 Omni-Parser 2.0: 백엔드 페이로드 객체 구조 파편화 완벽 방어
            const data = result.data || result.invoiceData || result.invoice || result || {};
            
            // 1. 하위 객체 방어 (Null-Safe)
            const clientInfo = data.clientInfo || data.client || {};
            const hqInfo = data.hqInfo || data.hq || {};

            // 2. 매출 연산 방어 (totalSales가 undefined일 경우 amount, baseAmount 등으로 교차 매핑)
            const baseAmount = Number(data.totalSales || data.amount || data.baseAmount || 0);
            
            if (baseAmount === 0) {
                showToast(dict["toast_no_erp"], "success");
            }

            const royaltyAmount = Number((baseAmount * (rate / 100)).toFixed(2));
            
            // 3. 주(Province)별 CRA 세법 정밀 검증
            const stateCode = (clientInfo.state || "DEFAULT").toUpperCase();
            const taxObj = CONFIG.TAX_RATES[stateCode] || CONFIG.TAX_RATES["DEFAULT"];
            const taxAmount = Number((royaltyAmount * taxObj.rate).toFixed(2));
            const grandTotal = Number((royaltyAmount + taxAmount).toFixed(2));

            // 4. 날짜 및 식별자
            const today = new Date();
            const dueDateObj = new Date(today);
            dueDateObj.setDate(today.getDate() + 14); 
            
            const invNo = `INV-${targetYear}${String(startMonth).padStart(2, '0')}-${clientName.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

            // ====================================================================
            // 🌟 5. V15.4 HTML 돔(DOM) 렌더링 & 송금 정보(Remittance) 블랭크 버그 수정
            // ====================================================================
            document.getElementById('invNo').innerText = invNo;
            document.getElementById('invDate').innerText = formatDate(today);
            document.getElementById('invDue').innerText = formatDate(dueDateObj);

            // HQ Info (Remittance - 벤더사 은행 정보 변수명 교차 매핑으로 100% 추출)
            document.getElementById('hqName').innerText = hqInfo.name || hqInfo.hqName || "Y2C Holdings Inc.";
            document.getElementById('hqAddress').innerText = hqInfo.address || hqInfo.hqAddress || "-";
            document.getElementById('hqContact').innerText = hqInfo.contact || hqInfo.phone || "-";
            document.getElementById('hqRegNo').innerText = hqInfo.regNo || hqInfo.businessNo || "-";
            document.getElementById('hqRep').innerText = hqInfo.rep || hqInfo.representative || "-";
            
            // 은행, 계좌, 스위프트 코드 파편화 대응
            document.getElementById('hqBank').innerText = hqInfo.bankName || hqInfo.bank || "-";
            document.getElementById('hqBankAddress').innerText = hqInfo.bankAddress || hqInfo.bankAddr || hqInfo.address || "-";
            document.getElementById('hqAccount').innerText = hqInfo.accountNo || hqInfo.account || "-";
            document.getElementById('hqSwift').innerText = hqInfo.swift || hqInfo.swiftCode || "-";

            // Client Info
            document.getElementById('clientName').innerText = clientInfo.name || clientName;
            document.getElementById('clientAddress').innerText = clientInfo.address || "-";
            document.getElementById('clientCity').innerText = `${clientInfo.city || "-"}, ${clientInfo.state || "-"}`;
            document.getElementById('clientAttn').innerText = clientInfo.manager || clientInfo.attn || "-";
            document.getElementById('clientBizId').innerText = clientInfo.bizId || clientInfo.businessId || "-";

            // Calculation Line (번역 딕셔너리 연동)
            document.getElementById('descLine').innerHTML = `${dict["desc_mas"]}<br><span class="text-xs text-gray-500 font-medium mt-1 block">Period: ${targetYear}-${String(startMonth).padStart(2,'0')} to ${targetYear}-${String(endMonth).padStart(2,'0')}</span>`;
            document.getElementById('baseLine').innerText = formatCurrency(baseAmount);
            document.getElementById('rateLine').innerText = `${rate}%`;
            document.getElementById('amtLine').innerText = formatCurrency(royaltyAmount);

            // Totals
            document.getElementById('subTotal').innerText = formatCurrency(royaltyAmount);
            
            // 세금 라벨 동적 렌더링
            const taxLabelEl = document.getElementById('taxAmt').parentElement;
            if(taxLabelEl) {
                taxLabelEl.innerHTML = `Estimated Tax <span class="font-bold text-gray-800">(${taxObj.name})</span>: <span class="font-black text-[var(--premium-charcoal)] font-mono ml-4 print-text-black text-sm" id="taxAmt">${formatCurrency(taxAmount)}</span>`;
            } else {
                document.getElementById('taxAmt').innerText = formatCurrency(taxAmount);
            }
            
            document.getElementById('totalDue').innerText = formatCurrency(grandTotal);

            // 🌟 6. CSV Export를 위한 무결성 캐시 저장
            currentInvoiceData = {
                invNo, date: formatDate(today), client: clientName, 
                baseAmount, rate, royaltyAmount, taxName: taxObj.name, taxAmount, grandTotal
            };

            showToast(dict["toast_success"], "success");
        } else {
            throw new Error(result?.message || "Failed to generate invoice.");
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    } finally {
        isGenerating = false;
        btnNodes.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        });
    }
}

// ============================================================================
// 🖨️ [누락 복구 완벽 완료] 브라우저 네이티브 PDF 인쇄 엔진
// ============================================================================
window.printInvoicePDF = function() {
    // 인쇄 시 CSS 조작을 위해 잠시 스타일 추가 (인보이스 영역만 렌더링)
    const style = document.createElement('style');
    style.id = 'printOverrideStyle';
    style.innerHTML = `
        @media print {
            body * { visibility: hidden; }
            #invoiceDocumentContainer, #invoiceDocumentContainer * { visibility: visible; }
            #invoiceDocumentContainer { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none !important; }
            .no-print { display: none !important; }
            @page { margin: 0; size: auto; }
        }
    `;
    document.head.appendChild(style);
    
    // 인쇄(PDF 저장) 대화상자 호출
    window.print();
    
    // 인쇄 창이 닫힌 후 원래대로 복구
    setTimeout(() => {
        const override = document.getElementById('printOverrideStyle');
        if (override) override.remove();
    }, 1000);
};

// ============================================================================
// 📥 3. CSV 데이터 추출 엔진 (무결성 검증)
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

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + row.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentInvoiceData.invNo}_${currentInvoiceData.client.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV 다운로드가 완료되었습니다.", "success");
}

// 글로벌 함수 노출
window.generateInvoice = generateInvoice;
window.exportInvoiceCSV = exportInvoiceCSV;
window.printInvoicePDF = printInvoicePDF; // 누락 복원 완료

document.addEventListener('DOMContentLoaded', () => {
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation(); // 글로벌 접근 통제 락 가동
    initInvoicePanel();
});
