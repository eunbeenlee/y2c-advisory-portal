// assets/js/invoice.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

// 마스터 권한 확인
if (!sessionToken || userRole !== "MASTER") {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = "MASTER";
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// 토스트 알림 함수
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

// 통화 포맷팅
const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

// 오늘 날짜 및 만기일 포맷팅 (YYYY-MM-DD)
function getFormattedDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function generateInvoice() {
  const targetClient = document.getElementById('selClient').value;
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
  btn.innerHTML = "<span>⏳</span> FETCHING...";
  btn.classList.add('animate-pulse');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ 
        action: SYSTEM_CONFIG.API.ENDPOINTS.GET_INVOICE, 
        token: sessionToken, 
        clientName: targetClient, 
        year: targetYear, 
        startMonth: startMonth, 
        endMonth: endMonth 
      })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      // 1. 헤더 정보 세팅
      const invNumber = `INV-${targetYear}${startMonth.padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
      document.getElementById('invNo').innerText = invNumber;
      document.getElementById('invDate').innerText = getFormattedDate(0);
      document.getElementById('invDue').innerText = getFormattedDate(14); // 14일 뒤 만기

      // 2. 발신자 (HQ_Info) 정보 맵핑
      document.getElementById('hqName').innerText = result.hqInfo.name || "Y2C Holdings Inc.";
      document.getElementById('hqAddress').innerText = result.hqInfo.address || "-";
      document.getElementById('hqContact').innerText = result.hqInfo.contact || "-";
      document.getElementById('hqRegNo').innerText = result.hqInfo.regNo || "-";
      document.getElementById('hqRep').innerText = result.hqInfo.rep || "-";
      
      // 🌟 은행 및 은행 주소 맵핑
      document.getElementById('hqBank').innerText = result.hqInfo.bank || "-";
      document.getElementById('hqBankAddress').innerText = result.hqInfo.bankAddress || "-";
      document.getElementById('hqAccount').innerText = result.hqInfo.account || "-";
      document.getElementById('hqSwift').innerText = result.hqInfo.swift || "-";

      // 3. 수신자 (Client Info) 정보 맵핑
      document.getElementById('clientName').innerText = result.clientInfo.name || targetClient;
      document.getElementById('clientAddress').innerText = result.clientInfo.address || "-";
      document.getElementById('clientCity').innerText = `${result.clientInfo.city || ""}, ${result.clientInfo.state || ""}`;
      document.getElementById('clientAttn').innerText = result.clientInfo.attn || "-";
      document.getElementById('clientBizId').innerText = result.clientInfo.bizId || "-";

      // 4. 금액 계산 맵핑
      const baseSales = Number(result.calculatedBase) || 0;
      const calculatedFee = baseSales * (rate / 100);
      const taxRate = 0.13; // 예: 온타리오 HST 13% 적용 (필요시 변경 가능)
      const taxAmt = calculatedFee * taxRate;
      const totalDue = calculatedFee + taxAmt;

      document.getElementById('descLine').innerText = `Management Advisory Services (${startMonth}/${targetYear} - ${endMonth}/${targetYear})`;
      document.getElementById('baseLine').innerText = formatCurrency(baseSales);
      document.getElementById('rateLine').innerText = `${rate}%`;
      document.getElementById('amtLine').innerText = formatCurrency(calculatedFee);
      
      document.getElementById('subTotal').innerText = formatCurrency(calculatedFee);
      document.getElementById('taxAmt').innerText = formatCurrency(taxAmt);
      document.getElementById('totalDue').innerText = formatCurrency(totalDue);

      showToast("인보이스 데이터가 성공적으로 생성되었습니다.", "success");
    } else {
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message);
    }
  } catch (error) {
    showToast("데이터 연동 실패: " + error.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    btn.classList.remove('animate-pulse');
  }
}

// 최초 렌더링 시 초기화 실행 (선택적)
// window.addEventListener('DOMContentLoaded', generateInvoice);
