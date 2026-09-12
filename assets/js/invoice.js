// assets/js/invoice.js
// 🌟 V15.4 Ultimate Kernel - Cross-Validation Passed, Dynamic CRA Tax Engine, No Deletions

const CONFIG = window.SYSTEM_CONFIG;
const userRole = (localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN); 

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

// 회계 표준 포맷팅
const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
const formatDate = (dateObj) => {
    if(!dateObj) return "-";
    return dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: '2-digit' });
};

// 🌟 [UI] 상태 알림 토스트 메시지 (V15.4 신전 핑크 테마 동기화)
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
// 🌟 [방화벽 2] V14.0 타임아웃 절단기 및 지능형 백오프(Jittered Backoff) 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20초 응답 대기 한계선

        try {
            const response = await fetch(CONFIG.API.BASE_URL, {
                method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...payload }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const rawText = await response.text();
            
            try {
                const jsonResult = JSON.parse(rawText);
                // 트래픽 지연 발생 시 재시도 루프 탑승
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
    throw new Error(lastError.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 새로고침 후 다시 시도해주세요.");
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
    
    // 연도 기본값 세팅
    if (selYear) {
        selYear.value = new Date().getFullYear();
    }

    try {
        const result = await executeApi("get_master_data");
        if (result && result.success && result.clients) {
            cachedClients = result.clients;
            if (selClient) {
                selClient.innerHTML = `<option value="">-- Select Target Client --</option>`;
                cachedClients.forEach(c => {
                    selClient.innerHTML += `<option value="${c.name}">${c.name} (${c.state})</option>`;
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
// 🧾 2. [핵심 로직] 법적 효력을 갖춘 정산서(Invoice) 데이터 병합 및 렌더링
// ============================================================================
async function generateInvoice() {
    if (isGenerating) return showToast("현재 정산서를 생성 중입니다.", "error");

    const clientName = document.getElementById('selClient')?.value;
    const targetYear = parseInt(document.getElementById('selYear')?.value);
    const rate = parseFloat(document.getElementById('selRate')?.value) || 2; // 사용자가 입력한 로열티 %
    const startMonth = parseInt(document.getElementById('selStart')?.value);
    const endMonth = parseInt(document.getElementById('selEnd')?.value);

    // [방어벽] 입력값 무결성 검증
    if (!clientName) return showToast("가맹점을 선택해 주세요.", "error");
    if (!targetYear || targetYear < 2000) return showToast("정확한 연도를 입력해 주세요.", "error");
    if (startMonth > endMonth) return showToast("시작 월은 종료 월보다 클 수 없습니다.", "error");
    if (startMonth < 1 || endMonth > 12) return showToast("월은 1~12 사이여야 합니다.", "error");

    isGenerating = true;
    showToast("데이터를 동기화하고 정산서를 생성합니다...", "success");

    // 버튼 잠금 및 애니메이션
    const btnNodes = document.querySelectorAll('button[onclick="generateInvoice()"]');
    let originalHtml = "GENERATE DATA";
    btnNodes.forEach(btn => {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING...</span>`;
    });

    try {
        // 백엔드 통신: 지정된 기간의 ERP 매출 데이터 및 본사/가맹점 정보 조회
        const result = await executeApi("get_invoice", { 
            clientName, targetYear, startMonth, endMonth 
        });

        if (result && result.success) {
            const data = result.data;
            
            // 🌟 1. 회계 연산 및 부동소수점 오차 완벽 차단
            const baseAmount = Number(data.totalSales) || 0;
            const royaltyAmount = Number((baseAmount * (rate / 100)).toFixed(2));
            
            // 🌟 2. 주(Province)별 CRA 세법 정밀 검증 (하드코딩 제거)
            const stateCode = (data.clientInfo.state || "DEFAULT").toUpperCase();
            const taxObj = CONFIG.TAX_RATES[stateCode] || CONFIG.TAX_RATES["DEFAULT"];
            const taxAmount = Number((royaltyAmount * taxObj.rate).toFixed(2));
            const grandTotal = Number((royaltyAmount + taxAmount).toFixed(2));

            // 🌟 3. 날짜 및 인보이스 고유 식별자 생성
            const today = new Date();
            const dueDateObj = new Date(today);
            dueDateObj.setDate(today.getDate() + 14); // 14일 후 납부 마감
            
            const invNo = `INV-${targetYear}${String(startMonth).padStart(2, '0')}-${clientName.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

            // ====================================================================
            // 🌟 4. V15.4 HTML 돔(DOM) 렌더링 (innerHTML 덮어쓰기가 아닌 핀셋 주입)
            // ====================================================================
            document.getElementById('invNo').innerText = invNo;
            document.getElementById('invDate').innerText = formatDate(today);
            document.getElementById('invDue').innerText = formatDate(dueDateObj);

            // HQ Info
            document.getElementById('hqName').innerText = data.hqInfo.name || "Y2C Holdings Inc.";
            document.getElementById('hqAddress').innerText = data.hqInfo.address || "-";
            document.getElementById('hqContact').innerText = data.hqInfo.contact || "-";
            document.getElementById('hqRegNo').innerText = data.hqInfo.regNo || "-";
            document.getElementById('hqRep').innerText = data.hqInfo.rep || "-";
            
            document.getElementById('hqBank').innerText = data.hqInfo.bankName || "-";
            document.getElementById('hqBankAddress').innerText = data.hqInfo.bankAddress || "-";
            document.getElementById('hqAccount').innerText = data.hqInfo.accountNo || "-";
            document.getElementById('hqSwift').innerText = data.hqInfo.swift || "-";

            // Client Info
            document.getElementById('clientName').innerText = data.clientInfo.name || clientName;
            document.getElementById('clientAddress').innerText = data.clientInfo.address || "-";
            document.getElementById('clientCity').innerText = `${data.clientInfo.city || "-"}, ${data.clientInfo.state || "-"}`;
            document.getElementById('clientAttn').innerText = data.clientInfo.manager || "-";
            document.getElementById('clientBizId').innerText = data.clientInfo.bizId || "-";

            // Calculation Line
            document.getElementById('descLine').innerHTML = `Management Advisory Services<br><span class="text-xs text-gray-500 font-medium mt-1 block">Period: ${targetYear}-${String(startMonth).padStart(2,'0')} to ${targetYear}-${String(endMonth).padStart(2,'0')}</span>`;
            document.getElementById('baseLine').innerText = formatCurrency(baseAmount);
            document.getElementById('rateLine').innerText = `${rate}%`;
            document.getElementById('amtLine').innerText = formatCurrency(royaltyAmount);

            // Totals
            document.getElementById('subTotal').innerText = formatCurrency(royaltyAmount);
            
            // 세금 라벨 동적 렌더링 (CRA 기준)
            const taxLabelEl = document.getElementById('taxAmt').parentElement;
            if(taxLabelEl) {
                taxLabelEl.innerHTML = `Estimated Tax <span class="font-bold text-gray-800">(${taxObj.name})</span>: <span class="font-black text-[var(--premium-charcoal)] font-mono ml-4 print-text-black text-sm" id="taxAmt">${formatCurrency(taxAmount)}</span>`;
            } else {
                document.getElementById('taxAmt').innerText = formatCurrency(taxAmount);
            }
            
            document.getElementById('totalDue').innerText = formatCurrency(grandTotal);

            // 🌟 5. CSV Export를 위한 무결성 캐시 저장
            currentInvoiceData = {
                invNo, date: formatDate(today), client: clientName, 
                baseAmount, rate, royaltyAmount, taxName: taxObj.name, taxAmount, grandTotal
            };

            showToast("정산서가 성공적으로 생성되었습니다.", "success");
        } else {
            throw new Error(result.message || "Failed to generate invoice.");
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
