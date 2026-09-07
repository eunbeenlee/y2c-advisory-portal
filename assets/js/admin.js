// assets/js/admin.js

const userRole = (localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

// 🌟 [방화벽] 마스터 권한이 아니면 즉시 강제 추방
if (!sessionToken || userRole !== "MASTER") { 
  window.location.href = "index.html"; 
}

document.getElementById('userNameDisplay').innerText = clientName || "MASTER";
const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
  localStorage.clear(); 
  window.location.href = "index.html"; 
});

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
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

// 🌟 [UI 전환 로직] 가맹점 관리 vs 매출 관리
function switchAdminTab(tab) {
  const btnProfiles = document.getElementById('tabBtnProfiles');
  const btnSales = document.getElementById('tabBtnSales');
  const secProfiles = document.getElementById('sectionProfiles');
  const secSales = document.getElementById('sectionSales');

  if (tab === 'profiles') {
    btnProfiles.className = "px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-white text-[var(--premium-charcoal)] shadow-sm";
    btnSales.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-gray-900";
    secProfiles.classList.remove('hidden'); secSales.classList.add('hidden');
  } else {
    btnSales.className = "px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-white text-[var(--premium-charcoal)] shadow-sm";
    btnProfiles.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-gray-900";
    secSales.classList.remove('hidden'); secProfiles.classList.add('hidden');
  }
}

let cachedClients = [];
let isSubmitting = false; // 🌟 [방화벽] 광클 방지용 상태 변수

// ========================================================
// [1] 마스터 DB (가맹점 프로필) 관리 로직
// ========================================================
async function fetchMasterData(retryCount = 3) {
  const tableBody = document.getElementById('masterTableBody');
  const errorBanner = document.getElementById('errorBanner');
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-16 text-center"><div class="flex flex-col items-center justify-center space-y-4"><svg class="animate-spin h-8 w-8 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-xs font-bold text-gray-400">Loading master database...</p></div></td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_MASTER, token: sessionToken }) 
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      tableBody.innerHTML = '';
      cachedClients = result.clients || [];
      
      if (cachedClients.length === 0) {
        return tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;
      }

      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition-all";

      cachedClients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 transition-colors duration-200";
        tr.innerHTML = `
          <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${c.name}</td>
          <td class="px-3 py-4 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="${inputClass} text-center uppercase" maxlength="2" placeholder="ON"></td>
          <td class="px-3 py-4"><input type="text" id="city_${c.rowIdx}" value="${c.city || ''}" class="${inputClass}" placeholder="City"></td>
          <td class="px-3 py-4"><input type="text" id="addr_${c.rowIdx}" value="${c.address || ''}" class="${inputClass}" placeholder="Full Address"></td>
          <td class="px-3 py-4"><input type="text" id="attn_${c.rowIdx}" value="${c.attn || ''}" class="${inputClass}" placeholder="Manager Name"></td>
          <td class="px-3 py-4"><input type="text" id="email_${c.rowIdx}" value="${c.email || ''}" class="${inputClass}" placeholder="Email"></td>
          <td class="px-3 py-4"><input type="text" id="biz_${c.rowIdx}" value="${c.bizId || ''}" class="${inputClass} font-mono" placeholder="Business ID"></td>
          <td class="px-5 py-4 text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10">
            <button id="saveBtn_${c.rowIdx}" onclick="saveClientData(${c.rowIdx})" class="bg-[var(--premium-charcoal)] hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-[11px] tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed">SAVE</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      populateSalesClientSelector(); // 매출 탭 드롭다운 동기화

    } else { 
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message); 
    }
  } catch (err) {
    if (retryCount > 0) {
      setTimeout(() => fetchMasterData(retryCount - 1), 1000);
    } else {
      if (errorBanner) { errorBanner.classList.remove('hidden'); document.getElementById('errorBannerText').innerText = "마스터 DB 통신 실패: " + err.message; }
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-[#E84C60] font-black tracking-wide py-12">Failed to load data. Please reload page.</td></tr>`;
    }
  }
}

async function saveClientData(rowIdx) {
  if (isSubmitting) return; // 광클 방지
  isSubmitting = true;

  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  const originalText = saveBtn.innerText;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = "⏳ SAVING..."; saveBtn.classList.add('animate-pulse'); }

  // 🌟 [방화벽] 무결성 검증 로직
  const stateVal = document.getElementById(`state_${rowIdx}`).value.toUpperCase().trim();
  if (stateVal.length > 2) {
    showToast("State(주) 코드는 2자리 영문(예: ON, BC)으로 입력해 주세요.", "error");
    isSubmitting = false; saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); return;
  }

  const payload = {
    rowIdx: rowIdx, 
    state: stateVal,
    city: document.getElementById(`city_${rowIdx}`).value.trim(),
    address: document.getElementById(`addr_${rowIdx}`).value.trim(), 
    attn: document.getElementById(`attn_${rowIdx}`).value.trim(),
    email: document.getElementById(`email_${rowIdx}`).value.trim(), 
    bizId: document.getElementById(`biz_${rowIdx}`).value.trim()
  };

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_MASTER, token: sessionToken, client: payload }) 
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      if(saveBtn) { saveBtn.innerText = "✅ SAVED"; saveBtn.classList.remove('animate-pulse'); saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); }
      showToast("마스터 데이터가 안전하게 저장되었습니다.", "success");
      setTimeout(() => fetchMasterData(1), 1500); // 조용히 백그라운드 리프레시
    } else { 
      showToast("저장 실패: " + result.message, "error"); 
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); }
    }
  } catch (err) { 
    showToast("서버 통신 중 오류가 발생했습니다.", "error");
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); }
  } finally {
    isSubmitting = false;
  }
}

// ========================================================
// [2] 매출 데이터베이스 매니저 (ERP 로직)
// ========================================================
const monthNames = ["Jan (1월)", "Feb (2월)", "Mar (3월)", "Apr (4월)", "May (5월)", "Jun (6월)", "Jul (7월)", "Aug (8월)", "Sep (9월)", "Oct (10월)", "Nov (11월)", "Dec (12월)"];

function populateSalesYearSelector() {
  const yearSelect = document.getElementById('salesYearSelector');
  if (!yearSelect) return;
  yearSelect.innerHTML = '';
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 2; y >= 2022; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.innerText = `${y} Fiscal Year`;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector');
  if (!clientSelect) return;
  
  if (cachedClients.length === 0) { 
    clientSelect.innerHTML = `<option value="">가맹점을 불러올 수 없습니다</option>`; 
    return; 
  }

  const previousSelection = clientSelect.value;
  clientSelect.innerHTML = '';
  
  cachedClients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name; opt.innerText = c.name;
    clientSelect.appendChild(opt);
  });

  if (previousSelection && Array.from(clientSelect.options).some(opt => opt.value === previousSelection)) {
    clientSelect.value = previousSelection;
  }

  loadSalesGrid();
}

async function loadSalesGrid() {
  const targetYear = document.getElementById('salesYearSelector').value;
  const targetClient = document.getElementById('salesClientSelector').value;
  const tbody = document.getElementById('salesGridBody');
  if (!targetYear || !targetClient || !tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 font-bold tracking-wide"><span class="animate-pulse">🔄 ${targetYear}년 ${targetClient} 매출 데이터 동기화 중...</span></td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_SALES, token: sessionToken, year: targetYear, clientName: targetClient })
    });
    const result = JSON.parse(await response.text());
    
    if (result.success) renderSalesGrid(result.records);
    else throw new Error(result.message);
  } catch (err) {
    showToast("매출 조회 실패: " + err.message, "error");
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-[#E84C60] font-black py-8">Failed to load sales data.</td></tr>`;
  }
}

function renderSalesGrid(records) {
  const tbody = document.getElementById('salesGridBody');
  tbody.innerHTML = '';
  const inputStyle = "w-full max-w-[170px] mx-auto bg-white border border-gray-200 rounded-xl px-3 py-2 text-center text-[13px] font-mono font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition";

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50/50 transition-colors";
    const badgeHTML = r.exists ? `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">SAVED</span>` : `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-gray-100 text-gray-400">EMPTY</span>`;

    // 🌟 [방화벽] oninput 이벤트에 숫자 외의 값(NaN) 방어 로직 내장
    tr.innerHTML = `
      <td class="px-6 py-3 font-black text-gray-700 text-xs sm:text-sm whitespace-nowrap">${monthNames[r.month - 1]}</td>
      <td class="px-6 py-3 text-center"><input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.pos > 0 ? r.pos : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-pos ${inputStyle}"></td>
      <td class="px-6 py-3 text-center"><input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.delivery > 0 ? r.delivery : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-del ${inputStyle}"></td>
      <td class="px-6 py-3 text-right font-black font-mono text-gray-800 text-sm whitespace-nowrap" id="rowTotal_${r.month}">${formatCurrency(r.total)}</td>
      <td class="px-6 py-3 text-center whitespace-nowrap">${badgeHTML}</td>
    `;
    tbody.appendChild(tr);
  });
  recalculateKpis();
}

function recalcSalesRow(month) {
  const posInput = document.querySelector(`.sales-input-pos[data-month="${month}"]`);
  const delInput = document.querySelector(`.sales-input-del[data-month="${month}"]`);
  const totalDisplay = document.getElementById(`rowTotal_${month}`);
  
  // 🌟 [방화벽] 음수 입력 방지 및 NaN 처리
  let p = parseFloat(posInput.value);
  let d = parseFloat(delInput.value);
  if (isNaN(p) || p < 0) { p = 0; if (posInput.value !== "") posInput.value = ""; }
  if (isNaN(d) || d < 0) { d = 0; if (delInput.value !== "") delInput.value = ""; }
  
  const tot = p + d;
  if (totalDisplay) totalDisplay.innerText = formatCurrency(tot);
  recalculateKpis();
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    const pos = parseFloat(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value) || 0;
    const del = parseFloat(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value) || 0;
    totPos += Math.max(0, pos); 
    totDel += Math.max(0, del); 
    totAnnual += Math.max(0, pos + del);
  }
  document.getElementById('salesKpiTotal').innerText = formatCurrency(totAnnual);
  document.getElementById('salesKpiPos').innerText = formatCurrency(totPos);
  document.getElementById('salesKpiDelivery').innerText = formatCurrency(totDel);
}

async function saveSalesGridData() {
  if (isSubmitting) return; // 🌟 광클 원천 차단
  
  const targetYear = document.getElementById('salesYearSelector').value;
  const targetClient = document.getElementById('salesClientSelector').value;
  if (!targetYear || !targetClient) {
    return showToast("저장할 가맹점과 연도를 선택해 주세요.", "error");
  }

  isSubmitting = true;
  const btn = document.getElementById('saveAllSalesBtn');
  const recordsToSave = [];
  let hasValidData = false;

  for (let m = 1; m <= 12; m++) {
    const pStr = document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value;
    const dStr = document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value;
    const pos = parseFloat(pStr) || 0;
    const del = parseFloat(dStr) || 0;
    
    // 빈 값이라도 기존 시트에 0으로 저장되게 하기 위해 무조건 보냄
    recordsToSave.push({ month: m, pos: Math.max(0, pos), delivery: Math.max(0, del) });
    if (pos > 0 || del > 0) hasValidData = true;
  }

  if (!hasValidData && !confirm("입력된 매출이 모두 0입니다. 이대로 저장하시겠습니까?")) {
    isSubmitting = false;
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true; 
  btn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-2">⏳ SYNCHRONIZING BATCH...</span>`;
  
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.SAVE_SALES, token: sessionToken, year: targetYear, clientName: targetClient, records: recordsToSave })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      showToast(result.message, "success");
      setTimeout(() => loadSalesGrid(), 1000); // 뱃지(SAVED) 갱신
    } else throw new Error(result.message);
  } catch (err) { 
    showToast("매출 저장 실패: " + err.message, "error"); 
  } finally { 
    btn.disabled = false; 
    btn.innerHTML = originalHtml; 
    isSubmitting = false; 
  }
}

// 스크립트 노출 함수 바인딩
window.switchAdminTab = switchAdminTab; 
window.saveClientData = saveClientData; 
window.loadSalesGrid = loadSalesGrid; 
window.recalcSalesRow = recalcSalesRow; 
window.saveSalesGridData = saveSalesGridData;

document.addEventListener('DOMContentLoaded', () => { 
  populateSalesYearSelector();
  fetchMasterData(3); // 3회 재시도 허용
});
