// assets/js/invoice.js

const userRole = (localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

// 🌟 [방화벽 1] 마스터 권한 무결성 검증 (인보이스는 본사 고유 권한)
if (!sessionToken || userRole !== "MASTER") { 
  alert("재무/정산(Invoice) 데이터는 본사 마스터 계정만 접근 가능합니다.");
  window.location.href = "index.html"; 
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName || "MASTER";

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
  localStorage.clear(); 
  window.location.href = "index.html"; 
});

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
const formatDate = (dateObj) => {
  if(!dateObj) return "-";
  return dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: '2-digit' });
};

// 🌟 [UI] 상태 알림 토스트 메시지
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]';
  const icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

let cachedClients = [];
let isGenerating = false;

// ============================================================================
// 🌟 [방화벽 2] V13.2 타임아웃 절단기 및 지능형 백오프(Jittered Backoff) 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20초 응답 대기 한계선

    try {
      const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({ action: action, token: sessionToken, ...payload }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const rawText = await response.text();
      
      try {
        const jsonResult = JSON.parse(rawText);
        // 트래픽 지연 발생 시 재시도 루프 탑승
        if (!jsonResult.success && jsonResult.message && (jsonResult.message.includes("트래픽") || jsonResult.message.includes("병목") || jsonResult.message.includes("초과") || jsonResult.message.includes("지연"))) {
          throw new Error(jsonResult.message);
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

// 🌟 가맹점 목록 불러오기 (인보이스 대상 선택용)
async function fetchClientListForInvoice() {
  try {
    const result = await executeApi("get_master_data");
    if (result.success) {
      cachedClients = result.clients || [];
      populateInvoiceClientSelector();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    showToast("가맹점 목록을 불러오지 못했습니다.", "error");
  }
}

function populateInvoiceClientSelector() {
  const clientSelect = document.getElementById('invoiceClientSelector');
  if (!clientSelect) return;
  clientSelect.innerHTML = '<option value="">Select Franchise...</option>';
  cachedClients.forEach(c => { 
    const opt = document.createElement('option'); 
    opt.value = c.name; 
    opt.innerText = `${c.name} (${c.state || 'N/A'})`; 
    clientSelect.appendChild(opt); 
  });
}

function populateInvoiceYearSelector() {
  const yearSelect = document.getElementById('invoiceYearSelector');
  if (!yearSelect) return;
  yearSelect.innerHTML = '';
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 2; y >= 2022; y--) {
    const opt = document.createElement('option'); 
    opt.value = y; 
    opt.innerText = y;
    if (y === currentYear) opt.selected = true; 
    yearSelect.appendChild(opt);
  }
}

// ============================================================================
// 🌟 [핵심 로직] 법적 효력을 갖춘 정산서(Invoice) 데이터 병합 및 렌더링
// ====================================================================
async function generateInvoice() {
  if (isGenerating) return showToast("현재 정산서를 생성 중입니다.", "error");

  const targetYear = document.getElementById('invoiceYearSelector')?.value;
  const targetMonth = document.getElementById('invoiceMonthSelector')?.value;
  const targetClient = document.getElementById('invoiceClientSelector')?.value;

  if (!targetYear || !targetMonth || !targetClient) {
    return showToast("연도, 월, 가맹점을 모두 선택해 주세요.", "error");
  }

  const btn = document.getElementById('generateInvoiceBtn');
  const originalHtml = btn ? btn.innerHTML : "GENERATE INVOICE";
  if(btn) { btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ EXTRACTING DATA...</span>`; }
  
  isGenerating = true;

  try {
    // 백엔드에 정산 데이터 요청
    const result = await executeApi("get_invoice", { 
      year: targetYear, 
      startMonth: targetMonth, 
      endMonth: targetMonth, 
      clientName: targetClient 
    });

    if (result.success) {
      renderInvoiceHTML(result.clientInfo, result.hqInfo, result.calculatedBase, targetYear, targetMonth);
      showToast("인보이스 생성이 완료되었습니다.", "success");
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    showToast("인보이스 생성 실패: " + err.message, "error");
  } finally {
    isGenerating = false;
    if(btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

// 🌟 엔터프라이즈급 인보이스 HTML 렌더링 (Print/PDF 최적화)
function renderInvoiceHTML(client, hq, baseAmount, year, month) {
  const container = document.getElementById('invoiceDocumentContainer');
  if (!container) return;

  // 1. 과세 로직 적용 (부동소수점 오차 완벽 차단)
  const stateCode = (client.state && client.state !== "DEFAULT" && client.state !== "-") ? client.state.toUpperCase() : "DEFAULT";
  const taxInfo = SYSTEM_CONFIG.TAX_RATES[stateCode] || SYSTEM_CONFIG.TAX_RATES["DEFAULT"];
  
  // 로열티 수수료 예시 (본사 설정에 따라 변경 가능, 여기서는 매출의 5% 로열티로 가정)
  const royaltyRate = 0.05; 
  const royaltyAmount = Number((baseAmount * royaltyRate).toFixed(2));
  const taxAmount = Number((royaltyAmount * taxInfo.rate).toFixed(2));
  const grandTotal = Number((royaltyAmount + taxAmount).toFixed(2));

  const invoiceNumber = `INV-${year}${month.padStart(2, '0')}-${client.name.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const issueDate = formatDate(new Date());
  
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + 14); // 14일 이내 납부 조건
  const dueDate = formatDate(dueDateObj);

  // 2. 프린트(PDF) 최적화 템플릿 생성
  const invoiceHTML = `
    <div id="printableInvoice" class="bg-white p-10 sm:p-14 shadow-2xl rounded-sm max-w-4xl mx-auto text-gray-800" style="min-height: 1056px; position: relative;">
      
      <!-- 🌟 헤더 영역 -->
      <div class="flex justify-between items-start border-b-4 border-[#E3000F] pb-8 mb-8">
        <div>
          <h1 class="text-4xl font-black text-[#E3000F] tracking-tighter italic mb-1 font-serif">SINJEON CANADA</h1>
          <p class="text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">Operated by Y2C Holdings Ltd.</p>
        </div>
        <div class="text-right">
          <h2 class="text-3xl font-black text-gray-800 tracking-widest uppercase mb-2">INVOICE</h2>
          <p class="text-sm font-bold text-gray-500">No. <span class="text-gray-800 font-mono">${invoiceNumber}</span></p>
          <p class="text-sm font-bold text-gray-500">Date: <span class="text-gray-800">${issueDate}</span></p>
        </div>
      </div>

      <!-- 🌟 발신/수신 정보 영역 -->
      <div class="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 class="text-xs font-black tracking-widest text-gray-400 uppercase mb-3 border-b border-gray-200 pb-2">From (Headquarters)</h3>
          <p class="font-bold text-lg text-gray-800 mb-1">${hq.name || "Y2C Holdings Ltd."}</p>
          <p class="text-sm text-gray-600 leading-relaxed">${hq.address || "Headquarters Address"}</p>
          <p class="text-sm text-gray-600">Business No: <span class="font-mono">${hq.regNo || "-"}</span></p>
          <p class="text-sm text-gray-600">Email: admin@sinjeoncanada.com</p>
        </div>
        <div>
          <h3 class="text-xs font-black tracking-widest text-gray-400 uppercase mb-3 border-b border-gray-200 pb-2">Bill To (Franchise)</h3>
          <p class="font-bold text-lg text-[#E3000F] mb-1">${client.name}</p>
          <p class="text-sm text-gray-600 leading-relaxed">${client.address || "Address Not Provided"}<br>${client.city || ""}, ${client.state || ""}</p>
          <p class="text-sm text-gray-600 mt-1">Attn: ${client.attn || "Store Manager"}</p>
          <p class="text-sm text-gray-600">Email: ${client.email || "-"}</p>
        </div>
      </div>

      <!-- 🌟 청구 내역 명세서 -->
      <table class="w-full mb-8 border-collapse">
        <thead>
          <tr class="bg-gray-100 border-y-2 border-gray-300">
            <th class="py-3 px-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Description</th>
            <th class="py-3 px-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Period</th>
            <th class="py-3 px-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Base Amount</th>
            <th class="py-3 px-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Line Total</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr class="border-b border-gray-200">
            <td class="py-4 px-4 font-bold text-gray-800">
              Franchise Royalty Fee (5%)<br>
              <span class="text-xs font-medium text-gray-500">Based on gross POS & Delivery sales</span>
            </td>
            <td class="py-4 px-4 text-center text-gray-600 font-medium">${year}-${month.padStart(2,'0')}</td>
            <td class="py-4 px-4 text-right font-mono text-gray-600">${formatCurrency(baseAmount)}</td>
            <td class="py-4 px-4 text-right font-mono font-bold text-gray-800">${formatCurrency(royaltyAmount)}</td>
          </tr>
          <!-- 필요 시 물품 대금 청구 등 추가 행 삽입 가능 -->
        </tbody>
      </table>

      <!-- 🌟 총계산 및 세금 영역 -->
      <div class="flex justify-end mb-12">
        <div class="w-1/2 min-w-[300px]">
          <table class="w-full text-sm">
            <tr class="border-b border-gray-100">
              <td class="py-2 text-gray-600 font-bold">Subtotal:</td>
              <td class="py-2 text-right font-mono font-bold">${formatCurrency(royaltyAmount)}</td>
            </tr>
            <tr class="border-b border-gray-200">
              <td class="py-2 text-gray-600 font-bold">Tax (${taxInfo.name}):</td>
              <td class="py-2 text-right font-mono font-bold">${formatCurrency(taxAmount)}</td>
            </tr>
            <tr class="bg-gray-50 border-y-2 border-gray-800">
              <td class="py-4 px-4 text-lg font-black text-gray-800 uppercase tracking-widest">Grand Total:</td>
              <td class="py-4 px-4 text-right text-2xl font-black font-mono text-[#E3000F]">${formatCurrency(grandTotal)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- 🌟 결제(송금) 정보 -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-10">
        <h3 class="text-xs font-black tracking-widest text-[#E3000F] uppercase mb-3">Payment Instructions</h3>
        <p class="text-sm font-bold text-gray-800 mb-1">Please make payment by <span class="text-[#E3000F] underline">${dueDate}</span>.</p>
        <div class="grid grid-cols-2 mt-4 text-sm gap-2">
          <p><span class="text-gray-500 w-24 inline-block">Bank Name:</span> <span class="font-bold">${hq.bank || "N/A"}</span></p>
          <p><span class="text-gray-500 w-24 inline-block">Account No:</span> <span class="font-bold font-mono">${hq.account || "N/A"}</span></p>
          <p><span class="text-gray-500 w-24 inline-block">Institution:</span> <span class="font-bold">${hq.swift || "N/A"}</span></p>
          <p><span class="text-gray-500 w-24 inline-block">E-Transfer:</span> <span class="font-bold text-blue-600">pay@sinjeoncanada.com</span></p>
        </div>
      </div>

      <!-- 🌟 바닥글 -->
      <div class="absolute bottom-10 left-10 right-10 border-t border-gray-200 pt-4 text-center">
        <p class="text-xs font-medium text-gray-400">If you have any questions concerning this invoice, contact admin@sinjeoncanada.com</p>
        <p class="text-[10px] font-bold tracking-widest text-gray-300 mt-1 uppercase">Thank you for your business</p>
      </div>

    </div>
    
    <!-- PDF 출력 버튼 -->
    <div class="mt-6 flex justify-center no-print">
      <button onclick="printInvoicePDF()" class="bg-[#1e293b] hover:bg-black text-white font-black py-3.5 px-8 rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest text-sm">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
        Save as PDF / Print
      </button>
    </div>
  `;

  container.innerHTML = invoiceHTML;
  // 부드러운 등장 효과
  container.style.opacity = "0";
  container.style.transform = "translateY(20px)";
  setTimeout(() => {
    container.style.transition = "all 0.5s ease";
    container.style.opacity = "1";
    container.style.transform = "translateY(0)";
  }, 50);
}

// 🌟 [무료 & 가장 안정적인 방법] 브라우저 네이티브 Print 기능을 활용한 PDF 변환 엔진
window.printInvoicePDF = function() {
  // 인쇄 시 CSS 조작을 위해 잠시 스타일 추가
  const style = document.createElement('style');
  style.id = 'printOverrideStyle';
  style.innerHTML = `
    @media print {
      body * { visibility: hidden; }
      #invoiceDocumentContainer, #invoiceDocumentContainer * { visibility: visible; }
      #invoiceDocumentContainer { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none !important; }
      .no-print { display: none !important; }
      @page { margin: 0; size: A4 portrait; }
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

window.generateInvoice = generateInvoice;

document.addEventListener('DOMContentLoaded', () => { 
  populateInvoiceYearSelector();
  fetchClientListForInvoice();
});
