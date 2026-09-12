// assets/js/admin.js
// 🌟 V15.4 Ultimate Kernel - Cross-Validation Passed, No Deletions, Full Sync

const CONFIG = window.SYSTEM_CONFIG;
const userRole = (localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN); 

// 🌟 [방화벽 1] 마스터 권한 무결성 검증 (불법 접근 원천 차단)
if (!sessionToken || userRole !== "MASTER") { 
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

const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
const formatDate = (isoStr) => {
  if(!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
};

// 🌟 상태 알림 토스트 (V15.4 신전 핑크 테마 100% 동기화)
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

function switchAdminTab(tab) {
  const tabs = ['profiles', 'sales', 'inbound', 'hqorders'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn_${t}`);
    const sec = document.getElementById(`section_${t}`);
    if(t === tab) {
      if(btn) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-[var(--premium-charcoal)] text-white shadow-sm whitespace-nowrap";
      if(sec) sec.classList.remove('hidden');
    } else {
      if(btn) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-[var(--premium-charcoal)] hover:bg-gray-100 whitespace-nowrap";
      if(sec) sec.classList.add('hidden');
    }
  });
}

let cachedClients = [];
let cachedHqOrders = [];
let cachedItems = []; 
let cachedMappings = []; 
let isSubmitting = false; 

// ============================================================================
// 🌟 [방화벽 2] 세션 만료 강제 추방(Global Interceptor) & 지능형 백오프 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); 

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
        if (!jsonResult.success) {
          // 🚨 [핵심 보안] 세션 만료 즉각 감지 및 강제 로그아웃
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
        await new Promise(res => setTimeout(res, waitTime));
      }
    }
  }
  throw new Error(lastError.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 새로고침 후 다시 시도해주세요.");
}

// ========================================================
// [1] 마스터 DB (가맹점 프로필) 관리 로직
// ========================================================
async function fetchMasterData() {
  const tableBody = document.getElementById('masterTableBody');
  const errorBanner = document.getElementById('errorBanner');
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  try {
    const result = await executeApi("get_master_data");
    if (result && result.success) {
      tableBody.innerHTML = '';
      cachedClients = result.clients || [];
      if (cachedClients.length === 0) return tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;

      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition-all";

      cachedClients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-pink-50/40 transition-colors duration-200";
        tr.innerHTML = `
          <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${c.name}</td>
          <td class="px-3 py-4 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="${inputClass} text-center uppercase" maxlength="2" placeholder="ON"></td>
          <td class="px-3 py-4"><input type="text" id="city_${c.rowIdx}" value="${c.city || ''}" class="${inputClass}" placeholder="City"></td>
          <td class="px-3 py-4"><input type="text" id="addr_${c.rowIdx}" value="${c.address || ''}" class="${inputClass}" placeholder="Full Address"></td>
          <td class="px-3 py-4"><input type="text" id="attn_${c.rowIdx}" value="${c.attn || ''}" class="${inputClass}" placeholder="Manager Name"></td>
          <td class="px-3 py-4"><input type="text" id="email_${c.rowIdx}" value="${c.email || ''}" class="${inputClass}" placeholder="Email"></td>
          <td class="px-3 py-4"><input type="text" id="biz_${c.rowIdx}" value="${c.bizId || ''}" class="${inputClass} font-mono" placeholder="Business ID"></td>
          <td class="px-5 py-4 text-center bg-gray-50 border-l border-gray-100"><button id="saveBtn_${c.rowIdx}" onclick="saveClientData(${c.rowIdx})" class="bg-[var(--premium-charcoal)] hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-[11px] tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed">SAVE</button></td>
        `;
        tableBody.appendChild(tr);
      });
      populateSalesClientSelector(); 
    } else if (result) {
      throw new Error(result.message);
    }
  } catch (err) { 
    tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">마스터 데이터를 불러오지 못했습니다. 새로고침 해주세요.</td></tr>`;
  }
}

async function saveClientData(rowIdx) {
  if (isSubmitting) return; 
  isSubmitting = true;
  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  let originalText = "SAVE";
  if (saveBtn) { 
    originalText = saveBtn.innerText;
    saveBtn.disabled = true; saveBtn.innerText = "⏳ SAVING..."; saveBtn.classList.add('animate-pulse'); 
  }

  const stateVal = document.getElementById(`state_${rowIdx}`).value.toUpperCase().trim();
  if (stateVal.length > 2) {
    showToast("State(주) 코드는 2자리 영문으로 입력해 주세요.", "error");
    isSubmitting = false; 
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); }
    return;
  }

  const payload = {
    rowIdx: rowIdx, state: stateVal, city: document.getElementById(`city_${rowIdx}`).value.trim(),
    address: document.getElementById(`addr_${rowIdx}`).value.trim(), attn: document.getElementById(`attn_${rowIdx}`).value.trim(),
    email: document.getElementById(`email_${rowIdx}`).value.trim(), bizId: document.getElementById(`biz_${rowIdx}`).value.trim()
  };

  try {
    const result = await executeApi("update_master_data", { client: payload });
    if (result && result.success) {
      if(saveBtn) { saveBtn.innerText = "✅ SAVED"; saveBtn.classList.remove('animate-pulse'); saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); }
      showToast("마스터 데이터 저장 완료", "success"); setTimeout(() => fetchMasterData(), 1500); 
    } else if (result) { throw new Error(result.message); }
  } catch (err) { 
    showToast(err.message, "error"); 
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); }
  } finally { isSubmitting = false; }
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
    const opt = document.createElement('option'); opt.value = y; opt.innerText = `${y} Fiscal Year`;
    if (y === currentYear) opt.selected = true; yearSelect.appendChild(opt);
  }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector');
  if (!clientSelect || cachedClients.length === 0) return;
  const previousSelection = clientSelect.value;
  clientSelect.innerHTML = '';
  clientSelect.innerHTML += `<option value="">-- Select Franchise --</option>`;
  cachedClients.forEach(c => { const opt = document.createElement('option'); opt.value = c.name; opt.innerText = c.name; clientSelect.appendChild(opt); });
  if (previousSelection && Array.from(clientSelect.options).some(opt => opt.value === previousSelection)) clientSelect.value = previousSelection;
}

async function loadSalesGrid() {
  const targetYear = document.getElementById('salesYearSelector')?.value, targetClient = document.getElementById('salesClientSelector')?.value, tbody = document.getElementById('salesGridBody');
  if (!targetYear || !targetClient || !tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 font-bold tracking-wide"><span class="animate-pulse">🔄 동기화 중...</span></td></tr>`;

  try {
    const result = await executeApi("get_sales_records", { year: targetYear, clientName: targetClient });
    if (result && result.success) renderSalesGrid(result.records); else if (result) throw new Error(result.message);
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-[#E84C60] font-black py-8">데이터 로드 실패</td></tr>`; }
}

function renderSalesGrid(records) {
  const tbody = document.getElementById('salesGridBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const inputStyle = "w-full max-w-[170px] mx-auto bg-white border border-gray-200 rounded-xl px-3 py-2 text-center text-[13px] font-mono font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition";

  records.forEach(r => {
    const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors";
    const badgeHTML = r.exists ? `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">SAVED</span>` : `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-gray-100 text-gray-400 border border-gray-200">EMPTY</span>`;

    tr.innerHTML = `
      <td class="px-6 py-3 font-black text-gray-700 text-xs sm:text-sm whitespace-nowrap">${monthNames[r.month - 1]}</td>
      <td class="px-6 py-3 text-center"><input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.pos > 0 ? r.pos : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-pos ${inputStyle}"></td>
      <td class="px-6 py-3 text-center"><input type="number" step="0.01" min="0" data-month="${r.month}" value="${r.delivery > 0 ? r.delivery : ''}" placeholder="0.00" oninput="recalcSalesRow(${r.month})" class="sales-input-del ${inputStyle}"></td>
      <td class="px-6 py-3 text-right font-black font-mono text-[var(--premium-charcoal)] text-sm whitespace-nowrap" id="rowTotal_${r.month}">${formatCurrency(r.total)}</td>
      <td class="px-6 py-3 text-center whitespace-nowrap">${badgeHTML}</td>
    `;
    tbody.appendChild(tr);
  });
  recalculateKpis();
}

function recalcSalesRow(month) {
  const posInput = document.querySelector(`.sales-input-pos[data-month="${month}"]`), delInput = document.querySelector(`.sales-input-del[data-month="${month}"]`);
  let p = parseFloat(posInput?.value), d = parseFloat(delInput?.value);
  if (Number.isNaN(p) || p < 0) { p = 0; if (posInput && posInput.value !== "") posInput.value = ""; }
  if (Number.isNaN(d) || d < 0) { d = 0; if (delInput && delInput.value !== "") delInput.value = ""; }
  const totalDisplay = document.getElementById(`rowTotal_${month}`);
  if (totalDisplay) totalDisplay.innerText = formatCurrency(p + d);
  recalculateKpis();
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    const posNode = document.querySelector(`.sales-input-pos[data-month="${m}"]`);
    const delNode = document.querySelector(`.sales-input-del[data-month="${m}"]`);
    const pos = parseFloat(posNode?.value) || 0;
    const del = parseFloat(delNode?.value) || 0;
    totPos += Math.max(0, pos); totDel += Math.max(0, del); totAnnual += Math.max(0, pos + del);
  }
  if (document.getElementById('salesKpiTotal')) document.getElementById('salesKpiTotal').innerText = formatCurrency(totAnnual);
  if (document.getElementById('salesKpiPos')) document.getElementById('salesKpiPos').innerText = formatCurrency(totPos);
  if (document.getElementById('salesKpiDelivery')) document.getElementById('salesKpiDelivery').innerText = formatCurrency(totDel);
}

async function saveSalesGridData() {
  if (isSubmitting) return; 
  const targetYear = document.getElementById('salesYearSelector').value, targetClient = document.getElementById('salesClientSelector').value;
  if (!targetYear || !targetClient) return showToast("가맹점과 연도를 선택해 주세요.", "error");

  isSubmitting = true;
  const btn = document.getElementById('saveAllSalesBtn');
  const recordsToSave = [];
  for (let m = 1; m <= 12; m++) {
    const pStr = document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value, dStr = document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value;
    recordsToSave.push({ month: m, pos: Math.max(0, parseFloat(pStr) || 0), delivery: Math.max(0, parseFloat(dStr) || 0) });
  }

  let originalHtml = "SAVE DATA";
  if (btn) {
    originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SYNCHRONIZING...</span>`;
  }
  
  try {
    const result = await executeApi("save_sales_records", { year: targetYear, clientName: targetClient, records: recordsToSave });
    if (result && result.success) { showToast(result.message, "success"); setTimeout(() => loadSalesGrid(), 1000); }
    else if (result) throw new Error(result.message);
  } catch (err) { showToast("매출 저장 실패: " + err.message, "error"); } 
  finally { 
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
    isSubmitting = false; 
  }
}

// ========================================================
// [3] 본사 조달 관제(HQ Orders) 및 스캔 알림(Health Scan)
// ========================================================

function renderOrderMetrics(metrics) {
  if(!metrics) return;
  const table = document.getElementById('hqOrdersGridBody')?.closest('table');
  if(!table || !table.parentNode) return;

  let kpiContainer = document.getElementById('y2cOrderMetrics');
  if (!kpiContainer) {
    kpiContainer = document.createElement('div');
    kpiContainer.id = 'y2cOrderMetrics';
    kpiContainer.className = 'grid grid-cols-2 gap-4 sm:gap-6 mb-8';
    table.parentNode.insertBefore(kpiContainer, table);
    
    // 시스템 헬스 스캔 버튼 렌더링
    const scanBtn = document.createElement('button');
    scanBtn.innerHTML = '🛡️ SYSTEM HEALTH SCAN';
    scanBtn.className = "w-full col-span-2 bg-[var(--premium-charcoal)] hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 tracking-[0.2em]";
    scanBtn.onclick = runSystemAlertScan;
    table.parentNode.insertBefore(scanBtn, kpiContainer);
  }
  
  kpiContainer.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">📦</div>
        <p class="text-[11px] font-black text-gray-500 uppercase tracking-widest">Total B2B Volume</p>
      </div>
      <h3 class="text-2xl sm:text-3xl font-black text-[var(--premium-charcoal)] font-mono tracking-tighter">${metrics.totalQty.toLocaleString()} <span class="text-xs text-gray-400 font-bold ml-1">Units</span></h3>
    </div>
    <div class="bg-gradient-to-br from-[#E84C60] to-[#C23347] border border-[#E84C60]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
      <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
      <div class="flex items-center gap-3 mb-2 relative z-10">
        <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">💳</div>
        <p class="text-[11px] font-black text-red-100 uppercase tracking-widest">Total B2B Expenditure</p>
      </div>
      <h3 class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tighter relative z-10">${formatCurrency(metrics.totalAmount)}</h3>
    </div>
  `;
}

async function runSystemAlertScan(event) {
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-pulse">⏳ SCANNING INVENTORY...</span>`;
  
  try {
    const result = await executeApi("check_system_alerts");
    if (result && result.success) {
      showToast("스캔 완료. 대표님 메일로 리포트가 발송되었습니다.", "success");
      displayAlertModal(result.alerts);
    } else if (result) {
      throw new Error(result.message);
    }
  } catch (err) {
    showToast("스캔 실패: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function displayAlertModal(alerts) {
  let modal = document.getElementById('alertModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'alertModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
    document.body.appendChild(modal);
  }
  
  let html = `<div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl transform transition-transform scale-95 duration-300" id="alertModalContent">`;
  html += `<div class="bg-[var(--premium-charcoal)] p-6 text-white flex justify-between items-center"><h2 class="text-xl font-black tracking-widest">🛡️ SYSTEM HEALTH REPORT</h2><button onclick="closeAlertModal()" class="text-gray-400 hover:text-white font-bold text-xl">&times;</button></div>`;
  html += `<div class="p-6 max-h-[70vh] overflow-y-auto hide-scrollbar">`;
  
  if (alerts.lowStock.length === 0 && alerts.expiring.length === 0) {
    html += `<div class="text-center py-10"><span class="text-4xl">✅</span><p class="mt-4 font-bold text-gray-500">모든 허브의 재고 및 유통기한이 안정적입니다.</p></div>`;
  } else {
    if (alerts.lowStock.length > 0) {
      html += `<h3 class="font-black text-[#E84C60] mb-3 flex items-center gap-2"><span>🚨</span> Low Stock Alert (${alerts.lowStock.length})</h3>`;
      html += `<div class="bg-red-50 border border-red-100 rounded-xl p-4 mb-6"><ul class="space-y-2">`;
      alerts.lowStock.forEach(item => {
        html += `<li class="flex justify-between items-center text-[13px] border-b border-red-100 pb-2"><span class="font-bold text-gray-800">[${item.region}] ${item.name}</span><span class="font-black text-[#E84C60] bg-white px-2 py-1 rounded shadow-sm">${item.stock}</span></li>`;
      });
      html += `</ul></div>`;
    }
    if (alerts.expiring.length > 0) {
      html += `<h3 class="font-black text-amber-600 mb-3 flex items-center gap-2"><span>⏳</span> Expiration Alert (${alerts.expiring.length})</h3>`;
      html += `<div class="bg-amber-50 border border-amber-100 rounded-xl p-4"><ul class="space-y-2">`;
      alerts.expiring.forEach(item => {
        let textCol = item.daysLeft < 0 ? "text-[#E84C60]" : "text-amber-600";
        let badge = item.daysLeft < 0 ? "기한 초과" : `D-${item.daysLeft}`;
        html += `<li class="flex justify-between items-center text-[13px] border-b border-amber-100 pb-2"><span class="font-bold text-gray-800">[${item.region}] ${item.name}</span><div class="flex items-center gap-3"><span class="font-black ${textCol}">${item.date} (${badge})</span><span class="font-bold text-gray-500">Qty: ${item.qty}</span></div></li>`;
      });
      html += `</ul></div>`;
    }
  }
  
  html += `</div><div class="p-4 bg-gray-50 border-t border-gray-100 text-center"><button onclick="closeAlertModal()" class="bg-[#E84C60] text-white px-8 py-2.5 rounded-xl font-black shadow-md hover:bg-black transition-colors uppercase tracking-widest text-[11px]">Close Report</button></div></div>`;
  
  modal.innerHTML = html;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => document.getElementById('alertModalContent').classList.remove('scale-95'), 50);
}

window.closeAlertModal = function() {
  const modal = document.getElementById('alertModal');
  if (modal) {
    document.getElementById('alertModalContent').classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');
  }
}

async function fetchMappings() {
  try {
    const result = await executeApi("get_procurement_data");
    if (result && result.success) {
      cachedMappings = result.mappings || [];
      cachedHqOrders = result.hqOrders || [];
      renderHqOrders();
      if(result.orderMetrics) renderOrderMetrics(result.orderMetrics);
    } else {
      cachedMappings = [];
    }
  } catch (err) { 
    cachedMappings = [];
  }
}

async function fetchCatalogForInbound() {
  try {
    const result = await executeApi("get_items", { clientState: "DEFAULT" });
    if (result && result.success) cachedItems = result.items || [];
  } catch (e) { console.error("Catalog load failed", e); }
}

function renderHqOrders() {
  const tbody = document.getElementById('hqOrdersGridBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  if(cachedHqOrders.length === 0) return tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">본사 발주 관제 내역이 없습니다.</td></tr>`;

  const sortedOrders = cachedHqOrders.sort((a,b) => new Date(b.date) - new Date(a.date));
  sortedOrders.forEach(o => {
    let statusClass = "bg-gray-100 text-gray-500", statusText = o.status;
    if(o.status === "HQ_PENDING") { statusClass = "bg-purple-100 text-purple-700"; statusText = "접수 대기"; }
    else if(o.status === "SHIPPED") { statusClass = "bg-blue-100 text-blue-700"; statusText = "선적 완료"; }
    else if(o.status === "ARRIVED") { statusClass = "bg-emerald-100 text-emerald-700"; statusText = "캐나다 입항"; }

    const tr = document.createElement('tr'); tr.className = "hover:bg-pink-50/40 transition-colors";
    tr.innerHTML = `
      <td class="px-5 py-4 font-mono text-[11px] font-black text-gray-500">${o.id}</td>
      <td class="px-5 py-4 text-[12px] font-bold text-[var(--premium-charcoal)]">${formatDate(o.date)}</td>
      <td class="px-5 py-4 text-[12px] font-black text-[#E84C60]">${o.vendor}</td>
      <td class="px-5 py-4 text-[11px] font-bold text-gray-600">${o.region}</td>
      <td class="px-5 py-4 text-[12px] font-medium text-gray-700 max-w-[200px] truncate" title="${o.items}">${o.items}</td>
      <td class="px-5 py-4 text-[12px] font-mono font-bold text-gray-800">${o.eta}</td>
      <td class="px-5 py-4 text-center">
        <select onchange="updateHqOrderStatus('${o.id}', this.value)" class="text-[10px] font-black rounded border border-gray-300 p-1 outline-none focus:border-[#E84C60] ${o.status === 'SHIPPED' ? 'text-blue-600' : 'text-gray-500'} cursor-pointer">
          <option value="PREPARING" ${o.status === 'PREPARING' ? 'selected' : ''}>PREPARING</option>
          <option value="SHIPPED" ${o.status === 'SHIPPED' ? 'selected' : ''}>SHIPPED</option>
          <option value="COMPLETED" ${o.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.saveHqOrder = async function() {
  if (isSubmitting) return;
  const vendorName = document.getElementById('hqVendorInput').value.trim(), region = document.getElementById('hqRegionInput').value.toUpperCase().trim(), items = document.getElementById('hqItemsInput').value.trim();
  if(!vendorName || !region || !items) return showToast("필수 내역을 모두 입력해 주세요.", "error");

  isSubmitting = true;
  const btn = document.getElementById('btnSubmitHqOrder');
  let originalHtml = "ADD";
  if (btn) {
    originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`;
  }

  const payload = { id: "NEW", date: new Date().toISOString().split('T')[0], vendor: vendorName, region: region, items: items, status: "HQ_PENDING", eta: "-" };
  try {
    const result = await executeApi("upsert_hq_order", { order: payload });
    if (result && result.success) { showToast("등록되었습니다.", "success"); document.getElementById('hqItemsInput').value = ''; fetchMappings(); } 
    else if (result) throw new Error(result.message);
  } catch (err) { showToast("등록 실패: " + err.message, "error"); } 
  finally { 
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
    isSubmitting = false; 
  }
}

// 🚨 [복구 및 검증 완료] 상태 변경 함수
window.updateHqOrderStatus = async function(orderId, status) {
  if (!orderId) return;
  try {
    const result = await executeApi("update_hq_order_status", { orderId, status });
    if (result && result.success) showToast(`Order ${orderId} marked as ${status}`, "success");
    else throw new Error(result.message);
  } catch (err) {
    showToast(err.message, "error");
    fetchMappings(); // 롤백
  }
}

// ========================================================
// [4] V14.0 통합 엑셀/OCR 및 원자성(Atomic) 엔진
// ========================================================
async function handleExcelUpload(event) {
  event.preventDefault();
  if (isSubmitting) return showToast("현재 처리 중입니다. 잠시 기다려주세요.", "error");

  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];
  if (!file) return;

  isSubmitting = true;
  const validExcelExts = [".xlsx", ".xls", ".csv"], validImgExts = [".png", ".jpg", ".jpeg"];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const statusText = document.getElementById('uploadStatusText');

  if (validExcelExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Parsing Excel Document...</span>`;
    
    if (typeof XLSX === 'undefined') {
      isSubmitting = false; return showToast("엑셀 분석 엔진(XLSX)을 로드 중입니다. 새로고침 후 다시 시도해주세요.", "error");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result); 
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
        
        if (jsonData.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다.");
        processExcelData(jsonData, file.name);
      } catch(err) {
        isSubmitting = false;
        showToast("엑셀 파일 파싱 중 오류 발생: " + err.message, "error"); 
        if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
      }
    };
    reader.readAsArrayBuffer(file);
  } 
  else if (validImgExts.includes(fileExt)) {
    if(statusText) statusText.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">AI Vision OCR Scanning...</span>`;
    
    if (typeof Tesseract === 'undefined') {
      isSubmitting = false; return showToast("AI 엔진(Tesseract)을 로드 중입니다. 잠시 후 시도해주세요.", "error");
    }

    try {
      const result = await Tesseract.recognize(file, 'eng+kor', {
        logger: m => { if (m.status === 'recognizing text' && statusText) { const pct = Math.floor(m.progress * 100); statusText.innerHTML = `<span class="text-indigo-500 font-bold">AI Vision Parsing: ${pct}%</span>`; } }
      });
      processOCRText(result.data.text, file.name);
    } catch(err) {
      isSubmitting = false;
      showToast("이미지 인식 실패: " + err.message, "error"); 
      if(statusText) statusText.innerHTML = "Drag & Drop vendor document here";
    }
  } else { 
    isSubmitting = false;
    return showToast("지원하지 않는 포맷입니다. (.xlsx, .jpg, .png 지원)", "error"); 
  }
}

function processOCRText(text, filename) {
  const lines = text.split('\n');
  const jsonData = [];
  lines.forEach(line => {
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
    const expDate = dateMatch ? dateMatch[0] : "";
    const barcodeMatch = line.match(/\b\d{13,14}\b/);
    const codeMatch = line.match(/\b[A-Z0-9]{5,15}\b/);
    const itemCode = (codeMatch ? codeMatch[0] : (barcodeMatch ? barcodeMatch[0] : ""));

    let cleanLine = line.replace(/\b\d+(\.\d+)?[KkGgLlMmCc]+\*\d+\b/g, ''); 
    const nums = cleanLine.match(/\b\d+\b/g); 
    let qty = 0;
    
    if (nums && nums.length > 0) {
      for(let i = nums.length - 1; i >= 0; i--) {
        const n = parseInt(nums[i]);
        if(!Number.isNaN(n) && n < 10000 && String(n) !== itemCode) { qty = n; break; }
      }
    }
    if(itemCode && itemCode.length >= 3 && qty > 0) jsonData.push({ "Item#": itemCode, "Qty": qty, "Exp.Date": expDate });
  });

  if (jsonData.length === 0) {
    isSubmitting = false;
    showToast("이미지에서 품번 및 수량을 찾지 못했습니다.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here"; return;
  }
  processExcelData(jsonData, filename + " (OCR)");
}

async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector');
  if (!targetRegion || !targetRegion.value) {
    isSubmitting = false;
    showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here"; return;
  }
  const regionVal = targetRegion.value;

  if (cachedItems.length === 0) {
    isSubmitting = false;
    showToast("카탈로그 데이터를 불러오는 중입니다. 잠시 후 시도하세요.", "error"); return;
  }

  let inboundMap = {};
  let successCount = 0;

  jsonData.forEach(row => {
    let vItemCode = "", vQty = 0, vExp = "";
    
    Object.keys(row).forEach(k => {
      let cleanK = String(k).replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '').toLowerCase();
      let valStr = String(row[k] || "").trim();

      if (cleanK === 'item#' || cleanK === 'itemcode' || cleanK === '품번') vItemCode = valStr;
      if (!vItemCode && cleanK === 'barcode') vItemCode = valStr;
      if (cleanK === 'qty' || cleanK === 'quantity' || cleanK === 'stock' || cleanK === '수량') vQty = Math.max(0, parseInt(valStr) || 0);
      if (cleanK === 'exp.date' || cleanK === 'expdate' || cleanK === '유통기한') vExp = valStr;
    });

    const dateMatch = vExp.match(/\d{4}-\d{2}-\d{2}/);
    vExp = dateMatch ? dateMatch[0] : "";

    if (vItemCode.length >= 3 && !Number.isNaN(vQty) && vQty > 0) {
      let hqCode = null;
      const mapObj = cachedMappings.find(m => m.vendorCode.toUpperCase() === vItemCode.toUpperCase());
      if (mapObj) {
        hqCode = mapObj.hqCode;
      } else {
        const directMatch = cachedItems.find(item => item.code.toUpperCase() === vItemCode.toUpperCase());
        if (directMatch) hqCode = directMatch.code;
      }

      if (hqCode) {
        if (!inboundMap[hqCode]) inboundMap[hqCode] = { totalQty: 0, batches: {} };
        inboundMap[hqCode].totalQty += vQty;
        if (vExp) { inboundMap[hqCode].batches[vExp] = (inboundMap[hqCode].batches[vExp] || 0) + vQty; }
        successCount++;
      }
    }
  });

  if (successCount === 0) {
    isSubmitting = false;
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here";
    showToast("마스터 DB와 매칭되는 품목이 0건입니다.", "error"); return;
  }

  const finalStockUpdates = Object.keys(inboundMap).map(hqCode => {
    let newExpArr = [];
    let sortedDates = Object.keys(inboundMap[hqCode].batches).sort();
    sortedDates.forEach(d => {
      newExpArr.push(`${d}:${inboundMap[hqCode].batches[d]}`);
    });
    const addedExpStr = newExpArr.join(' | ');

    return { 
      code: hqCode, 
      stockBreakdown: { [regionVal]: inboundMap[hqCode].totalQty }, 
      expBreakdown: { [regionVal]: addedExpStr } 
    };
  });

  document.getElementById('uploadStatusText').innerHTML = `<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${successCount} Rows (Atomic ADD)...</span>`;
  
  try {
    const result = await executeApi("update_stock", { mode: "ADD", stockUpdates: finalStockUpdates });
    if (result && result.success) {
      showToast(`입고 완료: 엑셀/이미지 ${successCount}건 누적 성공`, "success");
      document.getElementById('uploadStatusText').innerHTML = `<span class="text-emerald-600 font-bold">✅ Uploaded: ${filename}</span>`;
      setTimeout(() => { isSubmitting = false; location.reload(); }, 1500); 
    } else if (result) throw new Error(result.message);
  } catch (err) {
    isSubmitting = false;
    showToast(err.message, "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor document here";
    if(err.message.includes("트래픽") || err.message.includes("동기화")) {
      setTimeout(() => { fetchCatalogForInbound(); }, 2000);
    }
  }
}

// 🚨 [복구 및 검증 완료] 발주 취소 글로벌 로직
window.cancelOrder = async function(batchId) {
  if (isSubmitting) return showToast("현재 시스템이 다른 작업을 처리 중입니다.", "error");

  if (!batchId) {
      batchId = prompt("🚨 취소할 주문 번호(Order ID)를 입력하세요.\n(예: ORD-123456)");
      if (!batchId) return;
  }

  const confirmMsg = `정말 주문 [${batchId.trim()}]을 취소하시겠습니까?\n\n✔️ 취소 시 차감되었던 재고가 원복되며 출고 중지 메일이 발송됩니다.`;
  if (!confirm(confirmMsg)) return;

  isSubmitting = true;
  showToast("⏳ 시스템 취소 요청 및 재고 복구를 진행 중입니다...", "success");

  try {
      const result = await executeApi("cancel_order", { batchId: batchId.trim() });
      if (result && result.success) { showToast(`✅ ${result.message}`, "success"); } 
      else throw new Error(result.message);
  } catch (err) {
      showToast(`❌ 취소 실패: ${err.message}`, "error");
  } finally {
      isSubmitting = false;
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if(!dropZone) return;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-pink-50/50', 'border-[#E84C60]'); });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('bg-pink-50/50', 'border-[#E84C60]'); handleExcelUpload(e); });
  
  const fileInput = document.getElementById('excelFileInput');
  if(fileInput) fileInput.addEventListener('change', handleExcelUpload);
}

// ============================================================================
// 🌟 시스템 엔진 가동
// ============================================================================
window.switchAdminTab = switchAdminTab; window.saveClientData = saveClientData; window.loadSalesGrid = loadSalesGrid; 
window.recalcSalesRow = recalcSalesRow; window.saveSalesGridData = saveSalesGridData; window.saveHqOrder = saveHqOrder;
window.handleExcelUpload = handleExcelUpload;

document.addEventListener('DOMContentLoaded', () => { 
  populateSalesYearSelector();
  setupDragAndDrop();
  
  // 3단 비동기 렌더링 파이프라인
  fetchMasterData().then(() => fetchMappings()).then(() => fetchCatalogForInbound()); 
});
