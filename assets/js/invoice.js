// assets/js/invoice.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

if (!sessionToken || userRole !== "MASTER") {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = "MASTER";
document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = "index.html"; });

const today = new Date();
const invDateEl = document.getElementById('invDate');
if (invDateEl) invDateEl.innerText = today.toISOString().split('T')[0];

let due = new Date(); due.setDate(today.getDate() + 14); 
const invDueEl = document.getElementById('invDue');
if (invDueEl) invDueEl.innerText = due.toISOString().split('T')[0];

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

// 🌟 대기업식 자동 주입 토스트 알림
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
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

window.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();
  const yearSelect = document.getElementById('selYear');
  if (yearSelect) yearSelect.value = currentYear;
  generateInvoice();
});

async function generateInvoice() {
  const selClient = document.getElementById('selClient');
  const selYear = document.getElementById('selYear');
  const selStart = document.getElementById('selStart');
  const selEnd = document.getElementById('selEnd');
  const selRate = document.getElementById('selRate');

  if (!selClient || !selYear) return;

  const client = selClient.value;
  const year = selYear.value;
  const startM = selStart ? selStart.value : 1;
  const endM = selEnd ? selEnd.value : 12;
  const rateVal = selRate ? (parseFloat(selRate.value) || 2) : 2;
  const rate = rateVal / 100;

  const genBtn = document.querySelector('button[onclick="generateInvoice()"]');
  const originalHTML = genBtn ? genBtn.innerHTML : "GENERATE DATA";
  if (genBtn) { genBtn.disabled = true; genBtn.innerHTML = "<span>⏳</span> LOADING..."; genBtn.classList.add('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }

  const randomInvNo = Math.floor(1000 + Math.random() * 9000);
  const invNoEl = document.getElementById('invNo');
  if (invNoEl) invNoEl.innerText = `INV-${year}${(startM).toString().padStart(2,'0')}-${randomInvNo}`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.INVOICE, token: sessionToken, clientName: client, year: year, startMonth: startM, endMonth: endM })
    });
    
    const result = JSON.parse(await response.text());

    if (result.success) {
      const hq = result.hqInfo || {};
      document.getElementById('hqName').innerText = hq.name || 'Y2C Holdings Inc.';
      document.getElementById('hqAddress').innerText = hq.address || '-';
      document.getElementById('hqContact').innerText = hq.contact || '-';
      document.getElementById('hqRegNo').innerText = hq.regNo || '-';
      document.getElementById('hqRep').innerText = hq.rep || '-';
      
      document.getElementById('hqBank').innerText = hq.bank || '-';
      document.getElementById('hqAccount').innerText = hq.account || '-';
      document.getElementById('hqSwift').innerText = hq.swift || '-';

      const info = result.clientInfo || {};
      document.getElementById('clientName').innerText = info.name || client;
      document.getElementById('clientAddress').innerText = info.address || 'Address not registered';
      document.getElementById('clientCity').innerText = `${info.city || ''} ${info.state || ''}`.trim() || '-';
      document.getElementById('clientAttn').innerText = `${info.attn || 'Management'} | ${info.email || ''}`;
      document.getElementById('clientBizId').innerText = info.bizId || 'RC-XXXX';

      const base = result.calculatedBase || 0;
      const fee = base * rate;
      const tax = fee * 0.05;
      const total = fee + tax;

      document.getElementById('descLine').innerText = `Management Advisory Services - M${startM} to M${endM}, ${year}`;
      document.getElementById('baseLine').innerText = formatCurrency(base);
      document.getElementById('rateLine').innerText = `${rateVal}%`;
      document.getElementById('amtLine').innerText = formatCurrency(fee);
      
      document.getElementById('subTotal').innerText = formatCurrency(fee);
      document.getElementById('taxAmt').innerText = formatCurrency(tax);
      document.getElementById('totalDue').innerText = formatCurrency(total);
      
      showToast("인보이스 데이터 렌더링 완료", "success");
    } else {
      if (result.message.includes("만료") || result.message.includes("로그인") || result.message.includes("세션")) {
        alert("보안 세션이 종료되었습니다. 다시 로그인해 주세요."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      showToast("오류: " + result.message, "error");
    }
  } catch (err) {
    showToast("서버 통신 중 오류가 발생했습니다.", "error");
  } finally {
    if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = originalHTML; genBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'animate-pulse'); }
  }
}
window.generateInvoice = generateInvoice;
