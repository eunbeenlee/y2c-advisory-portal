// assets/js/invoice.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

if (!sessionToken || userRole !== "MASTER") {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = "MASTER";
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#C23347]';
  const icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

function getFormattedDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let currentInvoiceData = null; 

// 🌟 [엔터프라이즈] 오류 자율 복구(Auto-Retry) 기능이 탑재된 지점 로딩
async function fetchClientList(retryCount = 3) {
  const selClient = document.getElementById('selClient');
  if (!selClient) return; // HTML을 못 찾으면 스톱

  selClient.innerHTML = `<option value="">🔄 동기화 중...</option>`;
  selClient.disabled = true;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", 
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_MASTER, token: sessionToken })
    });
    
    const textResponse = await response.text();
    const result = JSON.parse(textResponse);

    if (result.success && result.clients && result.clients.length > 0) {
      selClient.innerHTML = '';
      result.clients.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name;
        option.innerText = `${c.name} (${c.state || 'N/A'})`;
        selClient.appendChild(option);
      });
      selClient.disabled = false;
      // 첫 번째 클라이언트가 로드되면 초기 설정 연도에 맞춰 인보이스 임시 생성 (미리보기 용도)
      // generateInvoice(); 
    } else {
      selClient.innerHTML = `<option value="">등록된 가맹점이 없습니다</option>`;
      showToast("불러올 수 있는 가맹점 정보가 없습니다.", "error");
    }
  } catch (error) {
    if (retryCount > 0) {
      console.warn(`가맹점 목록 동기화 실패. 재시도 중... 남은 횟수: ${retryCount}`);
      setTimeout(() => fetchClientList(retryCount - 1), 1000); // 1초 뒤 재시도
    } else {
      selClient.innerHTML = `<option value="">❌ 데이터 로딩 실패 (클릭하여 재시도)</option>`;
      selClient.disabled = false;
      selClient.onclick = () => { if (selClient.value === "") fetchClientList(3); };
      showToast("서버와 통신할 수 없습니다. 페이지를 새로고침 해보세요.", "error");
    }
  }
}

async function generateInvoice() {
  const targetClient = document.getElementById('selClient').value;
  if (!targetClient) {
    showToast("먼저 조회할 가맹점이 로딩되어야 합니다.", "error");
    return;
  }

  const targetYear = document.getElementById('selYear').value;
  const startMonth = document.getElementById('selStart').value;
  const endMonth = document.getElementById('selEnd').value;
  const rate = parseFloat(document.getElementById('selRate').value) || 2;

  if (parseInt(startMonth) > parseInt(endMonth)) {
    showToast("시작 월이 종료 월보다 클 수 없습니다.", "error");
    return;
  }

  const btn = document.querySelector('button[onclick="generateInvoice()"]');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-2">⏳ FETCHING...</span>`;
  btn.classList.add('opacity-80', 'cursor-not-allowed');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_INVOICE, token: sessionToken, clientName: targetClient, year: targetYear, startMonth: startMonth, endMonth: endMonth })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      const invNumber = `INV-${targetYear}${startMonth.padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
      document.getElementById('invNo').innerText = invNumber;
      document.getElementById('invDate').innerText = getFormattedDate(0);
      document.getElementById('invDue').innerText = getFormattedDate(14);

      document.getElementById('hqName').innerText = result.hqInfo.name || "Y2C Holdings Inc.";
      document.getElementById('hqAddress').innerText = result.hqInfo.address || "-";
      document.getElementById('hqContact').innerText = result.hqInfo.contact || "-";
      document.getElementById('hqRegNo').innerText = result.hqInfo.regNo || "-";
      document.getElementById('hqRep').innerText = result.hqInfo.rep || "-";
      
      document.getElementById('hqBank').innerText = result.hqInfo.bank || "-";
      document.getElementById('hqBankAddress').innerText = result.hqInfo.bankAddress || "-";
      document.getElementById('hqAccount').innerText = result.hqInfo.account || "-";
      document.getElementById('hqSwift').innerText = result.hqInfo.swift || "-";

      document.getElementById('clientName').innerText = result.clientInfo.name || targetClient;
      document.getElementById('clientAddress').innerText = result.clientInfo.address || "-";
      document.getElementById('clientCity').innerText = `${result.clientInfo.city || ""}, ${result.clientInfo.state || ""}`;
      document.getElementById('clientAttn').innerText = result.clientInfo.attn || "-";
      document.getElementById('clientBizId').innerText = result.clientInfo.bizId || "-";

      const baseSales = Number(result.calculatedBase) || 0;
      const calculatedFee = baseSales * (rate / 100);
      const clientProvince = String(result.clientInfo.state || "DEFAULT").trim().toUpperCase();
      const taxConfig = SYSTEM_CONFIG.TAX_RATES[clientProvince] || SYSTEM_CONFIG.TAX_RATES["DEFAULT"];
      
      const taxAmt = calculatedFee * taxConfig.rate;
      const totalDue = calculatedFee + taxAmt;

      document.getElementById('descLine').innerText = `Management Advisory Services (${startMonth}/${targetYear} - ${endMonth}/${targetYear})`;
      document.getElementById('baseLine').innerText = formatCurrency(baseSales);
      document.getElementById('rateLine').innerText = `${rate}%`;
      document.getElementById('amtLine').innerText = formatCurrency(calculatedFee);
      
      document.getElementById('subTotal').innerText = formatCurrency(calculatedFee);
      
      const taxLineElem = document.querySelector('p.pb-4.border-b');
      if(taxLineElem) {
        taxLineElem.innerHTML = `Estimated Tax (${taxConfig.name}): <span class="font-bold text-[var(--premium-charcoal)] font-mono ml-3 print-text-black" id="taxAmt">${formatCurrency(taxAmt)}</span>`;
      }
      
      document.getElementById('totalDue').innerText = formatCurrency(totalDue);

      currentInvoiceData = {
        invNo: invNumber, date: getFormattedDate(0), client: result.clientInfo.name || targetClient,
        description: `Advisory Services (${startMonth}/${targetYear} - ${endMonth}/${targetYear})`,
        baseSales: baseSales, rate: rate, subTotal: calculatedFee, tax: taxAmt, totalDue: totalDue
      };

      showToast("인보이스 데이터가 성공적으로 동기화되었습니다.", "success");
    } else {
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message);
    }
  } catch (error) {
    showToast("데이터 연동 실패: 서버로부터 올바른 응답을 받지 못했습니다.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    btn.classList.remove('opacity-80', 'cursor-not-allowed', 'animate-pulse');
  }
}

function exportInvoiceCSV() {
  if (!currentInvoiceData) return showToast("먼저 인보이스 데이터를 생성(GENERATE DATA)해 주세요.", "error");

  let csvContent = "\uFEFF"; 
  csvContent += "Invoice No,Date,Client Name,Description,Calculated Base (CAD),Rate (%),Subtotal (CAD),Tax HST (CAD),Total Amount Due (CAD)\n";
  
  const d = currentInvoiceData;
  csvContent += `"${d.invNo}","${d.date}","${d.client}","${d.description}","${d.baseSales.toFixed(2)}","${d.rate}","${d.subTotal.toFixed(2)}","${d.tax.toFixed(2)}","${d.totalDue.toFixed(2)}"\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `Y2C_Invoice_${d.invNo}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("CSV 파일 다운로드가 시작되었습니다.", "success");
}

window.generateInvoice = generateInvoice;
window.exportInvoiceCSV = exportInvoiceCSV;
window.fetchClientList = fetchClientList; // 강제 트리거 허용

// 🌟 HTML이 100% 로드된 직후에만 통신을 시작하여 무한 멈춤 현상 원천 차단
document.addEventListener('DOMContentLoaded', () => {
  fetchClientList(3);
});
