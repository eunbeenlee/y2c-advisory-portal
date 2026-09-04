// assets/js/invoice.js

// 1. 보안 세션 및 마스터 권한 검증
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || userRole !== "MASTER") {
  alert("접근 권한이 없습니다. 마스터 계정으로 로그인해주세요.");
  window.location.href = "dashboard.html";
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = "MASTER";

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

// 2. 인보이스 날짜 및 고유 번호 자동 생성
const today = new Date();
const invDateEl = document.getElementById('invDate');
if (invDateEl) invDateEl.innerText = today.toISOString().split('T')[0];

let due = new Date();
due.setDate(today.getDate() + 14); 
const invDueEl = document.getElementById('invDue');
if (invDueEl) invDueEl.innerText = due.toISOString().split('T')[0];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 3. 🌟 인보이스 데이터 요청 및 렌더링
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

  // Invoice Number (연도-월-랜덤)
  const randomInvNo = Math.floor(1000 + Math.random() * 9000);
  const invNoEl = document.getElementById('invNo');
  if (invNoEl) {
    invNoEl.innerText = `INV-${year}${(startM).toString().padStart(2,'0')}-${randomInvNo}`;
  }

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.INVOICE,
        clientName: client,
        year: year,
        startMonth: startM,
        endMonth: endM
      })
    });

    const responseText = await response.text();
    let result = JSON.parse(responseText);

    if (result.success) {
      
      // 🌟 본사(HQ) 정보 렌더링 (스프레드시트 연동)
      const hq = result.hqInfo || {};
      document.getElementById('hqName').innerText = hq.name || 'Y2C Holdings Inc.';
      document.getElementById('hqAddress').innerText = hq.address || '-';
      document.getElementById('hqContact').innerText = hq.contact || '-';
      document.getElementById('hqRegNo').innerText = hq.regNo || '-';
      document.getElementById('hqRep').innerText = hq.rep || '-';

      // 가맹점 정보 렌더링
      const info = result.clientInfo || {};
      document.getElementById('clientName').innerText = info.name || client;
      document.getElementById('clientAddress').innerText = info.address || 'Address not registered';
      document.getElementById('clientCity').innerText = `${info.city || ''} ${info.state || ''}`.trim() || '-';
      document.getElementById('clientAttn').innerText = `${info.attn || 'Management'} | ${info.email || ''}`;
      document.getElementById('clientBizId').innerText = info.bizId || 'RC-XXXX';

      // 금액 계산 렌더링
      const base = result.calculatedBase || 0;
      const fee = base * rate;
      const tax = fee * 0.05; // HST/GST 5%
      const total = fee + tax;

      document.getElementById('descLine').innerText = `Management Advisory Services - M${startM} to M${endM}, ${year}`;
      document.getElementById('baseLine').innerText = formatCurrency(base);
      document.getElementById('rateLine').innerText = `${rateVal}%`;
      document.getElementById('amtLine').innerText = formatCurrency(fee);
      
      document.getElementById('subTotal').innerText = formatCurrency(fee);
      document.getElementById('taxAmt').innerText = formatCurrency(tax);
      document.getElementById('totalDue').innerText = formatCurrency(total);
      
    } else {
      alert("데이터 추출 오류: " + (result.message || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error("Invoice Generation Error:", err);
    alert("서버 통신 중 오류가 발생했습니다. 권한 및 배포 상태를 확인하세요.");
  }
}

window.generateInvoice = generateInvoice;
window.addEventListener('DOMContentLoaded', generateInvoice);
