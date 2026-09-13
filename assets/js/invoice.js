// assets/js/invoice.js
// 🌟 V15.8 Ultimate Kernel - Omni-Parser 2.0 (Remittance & Null-Safe Fix), No Deletions

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

// 🌟 [UI] 상태 알림 토스트 메시지 (V15.8 핑크 테마 동기화)
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
// 🌟 [방화벽 2] 타임아웃 절단기 및 지능형 백오프(Jittered Backoff) 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastError;
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
            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                console.warn(`[재무 데이터 통신 지연 우회] ${waitTime}ms 대기 후 재시도... (${i+1}/${retries})`);
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    console.error("Fetch API Final Error:", lastError);
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
    if (isGenerating) return showToast("현재 정산서를 생성 중입니다.", "error");

    const clientName = document.getElementById('selClient')?.value;
    const targetYear = parseInt(document.getElementById('selYear')?.value);
    const rate = parseFloat(document.getElementById('selRate')?.value) || 2; 
    const startMonth = parseInt(document.getElementById('selStart')?.value);
    const endMonth = parseInt(document.getElementById('selEnd')?.value);

    // [방어벽] 입력값 무결성 검증
    if (!clientName) return showToast("가맹점을 선택해 주세요.", "error");
    if (!targetYear || targetYear < 2000) return showToast("정확한 연도를 입력해 주세요.", "error");
    if (startMonth > endMonth) return showToast("시작 월은 종료 월보다 클 수 없습니다.", "error");
    if (startMonth < 1 || endMonth > 12) return showToast("월은 1~12 사이여야 합니다.", "error");

    isGenerating = true;
    showToast("데이터를 동기화하고 정산서를 생성합니다...", "success");

    const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
    let originalHtml = "GENERATE DATA";
    btnNodes.forEach(btn => {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING...</span>`;
    });

    try {
        const result = await executeApi("get_invoice", { 
            clientName, targetYear, startMonth, endMonth 
        });

        // 디버깅 콘솔
        console.log(`[Invoice Data Scanned]`, result);

        if (result && result.success) {
            // 🚨 [핵심 오류 수정] Omni-Parser 2.0: 백엔드 페이로드 객체 구조 파편화 완벽 방어
            const data = result.data || result.invoiceData || result.invoice || result || {};
            
            // 1. 하위 객체 방어 (Null-Safe)
            const clientInfo = data.clientInfo || data.client || {};
            const hqInfo = data.hqInfo || data.hq || {};

            // 2. 매출 연산 방어 (totalSales가 undefined일 경우 amount, baseAmount 등으로 교차 매핑)
            const baseAmount = Number(data.totalSales || data.amount || data.baseAmount || 0);
            
            if (baseAmount === 0) {
                showToast("해당 기간의 ERP 매출이 $0.00 입니다. 기본 인보이스를 발행합니다.", "success");
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

            // Calculation Line
            document.getElementById('descLine').innerHTML = `Management Advisory Services<br><span class="text-xs text-gray-500 font-medium mt-1 block">Period: ${targetYear}-${String(startMonth).padStart(2,'0')} to ${targetYear}-${String(endMonth).padStart(2,'0')}</span>`;
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

            showToast("정산서가 성공적으로 생성되었습니다.", "success");
        } else {
            throw new Error(result?.message || "Failed to generate invoice.");
        }
    } catch (err) {
        showToast(`에러: ${err.message}`, "error");
    } finally {
        isGenerating = false;
        btnNodes.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        });
    }
}

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

document.addEventListener('DOMContentLoaded', initInvoicePanel);
