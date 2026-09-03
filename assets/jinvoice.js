// assets/js/invoice.js

// 1. 보안 세션 및 마스터 권한 검증
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해 주세요.");
  window.location.href = "index.html";
}

if (userRole !== "MASTER") {
  alert("접근 권한이 없습니다. 마스터 계정으로 로그인해주세요.");
  window.location.href = "dashboard.html";
}

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
due.setDate(today.getDate() + 14); // 14일 뒤 지불 기한
const invDueEl = document.getElementById('invDue');
if (invDueEl) invDueEl.innerText = due.toISOString().split('T')[0];

const randomInvNo = Math.floor(1000 + Math.random() * 9000);
const invNoEl = document.getElementById('invNo');
if (invNoEl) {
  invNoEl.innerText = `INV-${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}-${randomInvNo}`;
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

// 3. 🌟 서버(GAS)에 인보이스 데이터 요청 및 오류 방어 통신 함수
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

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.INVOICE,
        clientName: client,
        year: year,
        startMonth: startM,
        endMonth: endM
      })
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Server Raw Response:", responseText);
      throw new Error("서버에서 올바른 JSON 데이터를 반환하지 않았습니다.");
    }

    if (result.success) {
      const info = result.clientInfo || {};
      
      document.getElementById('clientName').innerText = info.name || client;
      document.getElementById('clientAddress').innerText = info.address || 'Address not registered';
      document.getElementById('clientCity').innerText = `${info.city || ''}, ${info.state || ''}`;
      document.getElementById('clientAttn').innerText = `${info.attn || 'Management'} | ${info.email || ''}`;
      document.getElementById('clientBizId').innerText = info.bizId || 'RC-XXXX';

      const base = result.calculatedBase || 0;
      const fee = base * rate;
      const tax = fee * 0.05; // 캐나다 기준 GST/HST 5% 추정 반영
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
    alert(err.message || "서버 통신 중 오류가 발생했습니다.");
  }
}

// 전역 함수로 등록하여 HTML 내 onclick에서 호출 가능하도록 처리
window.generateInvoice = generateInvoice;

// 페이지 진입 시 최초 인보이스 자동 생성 실행
window.addEventListener('DOMContentLoaded', () => {
  generateInvoice();
});
