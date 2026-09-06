// assets/js/admin.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

if (!sessionToken || userRole !== "MASTER") {
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = clientName || "MASTER";
document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = "index.html"; });

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none'; document.body.appendChild(container);
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

// 🌟 탭 전환 로직
function switchAdminTab(tab) {
  const btnProfiles = document.getElementById('tabBtnProfiles');
  const btnSales = document.getElementById('tabBtnSales');
  const secProfiles = document.getElementById('sectionProfiles');
  const secSales = document.getElementById('sectionSales');

  if (tab === 'profiles') {
    btnProfiles.className = "px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-white text-[var(--premium-charcoal)] shadow-sm";
    btnSales.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-gray-900";
    secProfiles.classList.remove('hidden');
    secSales.classList.add('hidden');
  } else {
    btnSales.className = "px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-white text-[var(--premium-charcoal)] shadow-sm";
    btnProfiles.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-gray-900";
    secSales.classList.remove('hidden');
    secProfiles.classList.add('hidden');
  }
}

// ==========================================
// [1] 가맹점 프로필 DB 로직 (기존 100% 보존)
// ==========================================
let cachedClients = [];

async function fetchMasterData() {
  const tableBody = document.getElementById('masterTableBody');
  const errorBanner = document.getElementById('errorBanner');
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_MASTER, token: sessionToken }) 
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      tableBody.innerHTML = '';
      cachedClients = result.clients || [];
      if (cachedClients.length === 0) return tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;

      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition-all";

      cachedClients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 transition-colors duration-200";
        tr.innerHTML = `
          <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${c.name}</td>
          <td class="px-3 py-4 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="${inputClass} text-center uppercase"></td>
          <td class="px-3 py-4"><input type="text" id="city_${c.rowIdx}" value="${c.city || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="addr_${c.rowIdx}" value="${c.address || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="attn_${c.rowIdx}" value="${c.attn || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="email_${c.rowIdx}" value="${c.email || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="biz_${c.rowIdx}" value="${c.bizId || ''}" class="${inputClass} font-mono"></td>
          <td class="px-5 py-4 text-center bg-[#E84C60]/5 border-l border-[#E84C60]/10">
            <button id="saveBtn_${c.rowIdx}" onclick="saveClientData(${c.rowIdx})" class="bg-[var(--premium-charcoal)] hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-[11px] tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed">SAVE</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // 🌟 세일즈 매니저 드롭다운에도 가맹점 목록 동기화
      populateSalesClientSelector();

    } else { 
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message); 
    }
  } catch (err) {
    if (errorBanner) { errorBanner.classList.remove('hidden'); document.getElementById('errorBannerText').innerText = err.message; }
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-[#E84C60] font-black tracking-wide py-12">Failed to load data.</td></tr>`;
  }
}

async function saveClientData(rowIdx) {
  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = "⏳ SAVING..."; saveBtn.classList.add('animate-pulse'); }

  const payload = {
    rowIdx: rowIdx, 
    state: document.getElementById(`state_${rowIdx}`).value.toUpperCase(),
    city: document.getElementById(`city_${rowIdx}`).value,
    address: document.getElementById(`addr_${rowIdx}`).value, 
    attn: document.getElementById(`attn_${rowIdx}`).value,
    email: document.getElementById(`email_${rowIdx}`).value, 
    bizId: document.getElementById(`biz_${rowIdx}`).value
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
      setTimeout(() => fetchMasterData(), 1500);
    } else { 
      showToast("저장 실패: " + result.message, "error"); 
    }
  } catch (err) { 
    showToast("서버 통신 중 오류가 발생했습니다.", "error");
  } finally {
    if (saveBtn && saveBtn.innerText !== "✅ SAVED") { saveBtn.disabled = false; saveBtn.innerText = "SAVE"; saveBtn.classList.remove('animate-pulse'); }
  }
}

// ========================================================
// [2] 🌟 세일즈 데이터베이스 매니저 (2022~ 확장 로직)
// ========================================================
const monthNames = ["Jan (1월)", "Feb (2월)", "Mar (3월)", "Apr (4월)", "May (5월)", "Jun (6월)", "Jul (7월)", "Aug (8월)", "Sep (9월)", "Oct (10월)", "Nov (11월)", "Dec (12월)"];

function populateSalesYearSelector() {
  const yearSelect = document.getElementById('salesYearSelector');
  if (!yearSelect) return;
  yearSelect.innerHTML = '';
  const currentYear = new Date().getFullYear();
  // 🌟 2022년부터 현재 연도 + 1년까지 역순 생성
  for (let y = currentYear + 1; y >= 2022; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.innerText = `${y} Fiscal Year`;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector');
  if (!clientSelect) return;
  clientSelect.innerHTML = '';
  
  if (cachedClients.length === 0) {
    clientSelect.innerHTML = `<option value="">가맹점을 불러올 수 없습니다</option>`;
    return;
  }

  cachedClients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.innerText = c.name;
    clientSelect.appendChild(opt);
  });

  // 드롭다운이 채워지면 즉시 첫 번째 매장의 매출 그리드 로드
  loadSalesGrid();
}

async function loadSalesGrid() {
  const targetYear = document.getElementById('salesYearSelector').value;
  const targetClient = document.getElementById('salesClientSelector').value;
  const tbody = document.getElementById('salesGridBody');
  if (!targetYear || !targetClient || !tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 font-bold tracking-wide">
    <span class="animate-pulse">🔄 ${targetYear}년 ${targetClient} 매출 데이터 동기화 중...</span>
  </td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ 
        action: SYSTEM_CONFIG.API.ENDPOINTS.GET_SALES, 
        token: sessionToken, 
        year: targetYear, 
        clientName: targetClient 
      })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      renderSalesGrid(result.records);
    } else throw new Error(result.message);
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
    
    const badgeHTML = r.exists 
      ? `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">SAVED</span>` 
      : `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-gray-100 text-gray-400">EMPTY</span>`;

    tr.innerHTML = `
      <td class="px-6 py-3 font-black text-gray-700 text-xs sm:text-sm whitespace-nowrap">${monthNames[r.month - 1]}</td>
      <td class="px-6 py-3 text-center">
        <input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.pos > 0 ? r.pos : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-pos ${inputStyle}">
      </td>
      <td class="px-6 py-3 text-center">
        <input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.delivery > 0 ? r.delivery : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-del ${inputStyle}">
      </td>
      <td class="px-6 py-3 text-right font-black font-mono text-gray-800 text-sm whitespace-nowrap" id="rowTotal_${r.month}">
        ${formatCurrency(r.total)}
      </td>
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

  const p = parseFloat(posInput.value) || 0;
  const d = parseFloat(delInput.value) || 0;
  const tot = p + d;

  if (totalDisplay) totalDisplay.innerText = formatCurrency(tot);
  recalculateKpis();
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    const pos = parseFloat(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value) || 0;
    const del = parseFloat(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value) || 0;
    totPos += pos;
    totDel += del;
    totAnnual += (pos + del);
  }
  document.getElementById('salesKpiTotal').innerText = formatCurrency(totAnnual);
  document.getElementById('salesKpiPos').innerText = formatCurrency(totPos);
  document.getElementById('salesKpiDelivery').innerText = formatCurrency(totDel);
}

async function saveSalesGridData() {
  const targetYear = document.getElementById('salesYearSelector').value;
  const targetClient = document.getElementById('salesClientSelector').value;
  const btn = document.getElementById('saveAllSalesBtn');

  const recordsToSave = [];
  for (let m = 1; m <= 12; m++) {
    const pos = parseFloat(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value) || 0;
    const del = parseFloat(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value) || 0;
    recordsToSave.push({
      month: m,
      pos: pos,
      delivery: del,
      total: pos + del
    });
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "<span>⏳</span> SYNCHRONIZING TO SHEETS...";
  btn.classList.add('animate-pulse');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.SAVE_SALES,
        token: sessionToken,
        year: targetYear,
        clientName: targetClient,
        records: recordsToSave
      })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      showToast(result.message, "success");
      setTimeout(() => loadSalesGrid(), 1000); // 상태 SAVED로 갱신
    } else throw new Error(result.message);
  } catch (err) {
    showToast("매출 저장 실패: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    btn.classList.remove('animate-pulse');
  }
}

// 초기 로딩
window.switchAdminTab = switchAdminTab;
window.saveClientData = saveClientData;
window.loadSalesGrid = loadSalesGrid;
window.recalcSalesRow = recalcSalesRow;
window.saveSalesGridData = saveSalesGridData;

document.addEventListener('DOMContentLoaded', () => {
  fetchMasterData();
  populateSalesYearSelector();
});
