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
const formatDate = (isoStr) => {
  if(!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
};

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

// 🌟 [UI 전환 로직] 4개의 탭 라우팅 통합
function switchAdminTab(tab) {
  const tabs = ['profiles', 'sales', 'inbound', 'hqorders'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn_${t}`);
    const sec = document.getElementById(`section_${t}`);
    if(t === tab) {
      if(btn) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all duration-300 bg-white text-[var(--premium-charcoal)] shadow-sm whitespace-nowrap";
      if(sec) sec.classList.remove('hidden');
    } else {
      if(btn) btn.className = "px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-gray-500 hover:text-gray-900 whitespace-nowrap";
      if(sec) sec.classList.add('hidden');
    }
  });
}

let cachedClients = [];
let cachedMappings = [];
let cachedHqOrders = [];
let isSubmitting = false; 

// ========================================================
// [1] 마스터 DB (가맹점 프로필) 관리 로직
// ========================================================
async function fetchMasterData(retryCount = 3) {
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

      populateSalesClientSelector(); 

    } else { 
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message); 
    }
  } catch (err) {
    if (retryCount > 0) setTimeout(() => fetchMasterData(retryCount - 1), 1000);
  }
}

async function saveClientData(rowIdx) {
  if (isSubmitting) return; 
  isSubmitting = true;

  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  const originalText = saveBtn.innerText;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = "⏳ SAVING..."; saveBtn.classList.add('animate-pulse'); }

  const stateVal = document.getElementById(`state_${rowIdx}`).value.toUpperCase().trim();
  if (stateVal.length > 2) {
    showToast("State(주) 코드는 2자리 영문(예: ON, BC)으로 입력해 주세요.", "error");
    isSubmitting = false; saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); return;
  }

  const payload = {
    rowIdx: rowIdx, state: stateVal, city: document.getElementById(`city_${rowIdx}`).value.trim(),
    address: document.getElementById(`addr_${rowIdx}`).value.trim(), attn: document.getElementById(`attn_${rowIdx}`).value.trim(),
    email: document.getElementById(`email_${rowIdx}`).value.trim(), bizId: document.getElementById(`biz_${rowIdx}`).value.trim()
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
      setTimeout(() => fetchMasterData(1), 1500); 
    } else { showToast("저장 실패: " + result.message, "error"); if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = originalText; saveBtn.classList.remove('animate-pulse'); } }
  } catch (err) { 
    showToast("서버 통신 중 오류가 발생했습니다.", "error");
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
    const opt = document.createElement('option');
    opt.value = y; opt.innerText = `${y} Fiscal Year`;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector');
  if (!clientSelect || cachedClients.length === 0) return;
  
  const previousSelection = clientSelect.value;
  clientSelect.innerHTML = '';
  cachedClients.forEach(c => { const opt = document.createElement('option'); opt.value = c.name; opt.innerText = c.name; clientSelect.appendChild(opt); });
  if (previousSelection && Array.from(clientSelect.options).some(opt => opt.value === previousSelection)) clientSelect.value = previousSelection;
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
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-[#E84C60] font-black py-8">Failed to load sales data.</td></tr>`; }
}

function renderSalesGrid(records) {
  const tbody = document.getElementById('salesGridBody');
  tbody.innerHTML = '';
  const inputStyle = "w-full max-w-[170px] mx-auto bg-white border border-gray-200 rounded-xl px-3 py-2 text-center text-[13px] font-mono font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm transition";

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50/50 transition-colors";
    const badgeHTML = r.exists ? `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">SAVED</span>` : `<span class="px-2.5 py-1 text-[10px] font-black rounded-full bg-gray-100 text-gray-400">EMPTY</span>`;

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
  let p = parseFloat(posInput.value); let d = parseFloat(delInput.value);
  if (isNaN(p) || p < 0) { p = 0; if (posInput.value !== "") posInput.value = ""; }
  if (isNaN(d) || d < 0) { d = 0; if (delInput.value !== "") delInput.value = ""; }
  const totalDisplay = document.getElementById(`rowTotal_${month}`);
  if (totalDisplay) totalDisplay.innerText = formatCurrency(p + d);
  recalculateKpis();
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    const pos = parseFloat(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value) || 0;
    const del = parseFloat(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value) || 0;
    totPos += Math.max(0, pos); totDel += Math.max(0, del); totAnnual += Math.max(0, pos + del);
  }
  document.getElementById('salesKpiTotal').innerText = formatCurrency(totAnnual);
  document.getElementById('salesKpiPos').innerText = formatCurrency(totPos);
  document.getElementById('salesKpiDelivery').innerText = formatCurrency(totDel);
}

async function saveSalesGridData() {
  if (isSubmitting) return; 
  const targetYear = document.getElementById('salesYearSelector').value;
  const targetClient = document.getElementById('salesClientSelector').value;
  if (!targetYear || !targetClient) return showToast("가맹점과 연도를 선택해 주세요.", "error");

  isSubmitting = true;
  const btn = document.getElementById('saveAllSalesBtn');
  const recordsToSave = [];
  
  for (let m = 1; m <= 12; m++) {
    const pStr = document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value;
    const dStr = document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value;
    recordsToSave.push({ month: m, pos: Math.max(0, parseFloat(pStr) || 0), delivery: Math.max(0, parseFloat(dStr) || 0) });
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SYNCHRONIZING BATCH...</span>`;
  
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.SAVE_SALES, token: sessionToken, year: targetYear, clientName: targetClient, records: recordsToSave })
    });
    const result = JSON.parse(await response.text());
    if (result.success) { showToast(result.message, "success"); setTimeout(() => loadSalesGrid(), 1000); }
    else throw new Error(result.message);
  } catch (err) { showToast("매출 저장 실패: " + err.message, "error"); } 
  finally { btn.disabled = false; btn.innerHTML = originalHtml; isSubmitting = false; }
}

// ========================================================
// [3] V10.0 조달 관제 데이터 연동 (HQ Procurement & Excel Mapping)
// ========================================================
async function fetchProcurementData(retryCount = 3) {
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_PROCUREMENT, token: sessionToken })
    });
    const result = JSON.parse(await response.text());
    if (result.success) {
      cachedMappings = result.mappings || [];
      cachedHqOrders = result.hqOrders || [];
      renderHqOrders();
    }
  } catch (err) {
    if (retryCount > 0) setTimeout(() => fetchProcurementData(retryCount - 1), 1000);
  }
}

// ========================================================
// [4] V10.0 엑셀 인바운드 파서 (SheetJS 연동)
// ========================================================
function handleExcelUpload(event) {
  event.preventDefault();
  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];
  if (!file) return;

  const validExts = [".xlsx", ".xls", ".csv"];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExts.includes(fileExt)) return showToast("지원하지 않는 엑셀 포맷입니다 (.xlsx, .xls, .csv 가능)", "error");

  const statusText = document.getElementById('uploadStatusText');
  if(statusText) statusText.innerHTML = `<span class="animate-pulse text-[#E84C60] font-bold">Scanning Document...</span>`;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
      
      processExcelData(jsonData, file.name);
      
    } catch(err) {
      showToast("파일을 파싱하는 중 오류가 발생했습니다.", "error");
      if(statusText) statusText.innerHTML = "Drag & Drop vendor excel file here";
    }
  };
  reader.readAsArrayBuffer(file);
}

// 🌟 [엔터프라이즈] 엑셀 데이터 매핑 알고리즘
async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector').value;
  if (!targetRegion) {
    showToast("입고될 기준 허브(Region)를 먼저 선택해 주세요.", "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel file here";
    return;
  }

  if (cachedMappings.length === 0) {
    showToast("벤더 매핑 DB를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.", "error");
    return;
  }

  let mappedUpdates = {};
  let successCount = 0;
  let failCount = 0;

  jsonData.forEach(row => {
    // 벤더사마다 다른 헤더명 스마트 인식
    const vItemCode = String(row["Item#"] || row["Item Code"] || row["품번"] || row["Barcode"] || "").trim();
    const vQty = row["Qty"] || row["Quantity"] || row["수량"] || row["Stock"] || 0;
    const parsedQty = parseInt(vQty);

    if (vItemCode !== "" && !isNaN(parsedQty)) {
      // 매핑 테이블에서 해당 벤더 코드 탐색
      const mapObj = cachedMappings.find(m => m.vendorCode.toLowerCase() === vItemCode.toLowerCase());
      if (mapObj) {
        if(!mappedUpdates[mapObj.hqCode]) mappedUpdates[mapObj.hqCode] = {};
        mappedUpdates[mapObj.hqCode][targetRegion] = parsedQty;
        successCount++;
      } else {
        failCount++;
      }
    }
  });

  if (successCount === 0) {
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel file here";
    showToast("매칭되는 품목이 없습니다. 벤더 매핑 DB를 확인하세요.", "error");
    return;
  }

  // 백엔드로 전송할 최종 배열 구성
  const finalStockUpdates = Object.keys(mappedUpdates).map(hqCode => ({
    code: hqCode,
    stockBreakdown: mappedUpdates[hqCode]
  }));

  document.getElementById('uploadStatusText').innerHTML = `<span class="animate-pulse text-emerald-600 font-bold">Synchronizing ${successCount} Items...</span>`;
  
  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_STOCK, token: sessionToken, stockUpdates: finalStockUpdates })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      showToast(`엑셀 입고 완료: ${successCount}건 매칭 성공 (실패: ${failCount}건)`, "success");
      document.getElementById('uploadStatusText').innerHTML = `<span class="text-emerald-600 font-bold">✅ Upload Complete: ${filename}</span>`;
    } else throw new Error(result.message);
  } catch (err) {
    showToast("엑셀 동기화 실패: " + err.message, "error");
    document.getElementById('uploadStatusText').innerHTML = "Drag & Drop vendor excel file here";
  }
}

// 드래그앤드롭 이벤트 리스너 바인딩 보조 함수
function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if(!dropZone) return;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-[#E84C60]/10', 'border-[#E84C60]'); });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-[#E84C60]/10', 'border-[#E84C60]'); });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('bg-[#E84C60]/10', 'border-[#E84C60]'); handleExcelUpload(e); });
  
  const fileInput = document.getElementById('excelFileInput');
  if(fileInput) fileInput.addEventListener('change', handleExcelUpload);
}

// ========================================================
// [5] V10.0 본사 발주 관제 타임라인 로직
// ========================================================
function renderHqOrders() {
  const tbody = document.getElementById('hqOrdersGridBody');
  if(!tbody) return;
  tbody.innerHTML = '';

  if(cachedHqOrders.length === 0) {
    return tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">본사 발주 관제 내역이 없습니다.</td></tr>`;
  }

  // 최신 날짜 순 정렬
  const sortedOrders = cachedHqOrders.sort((a,b) => new Date(b.date) - new Date(a.date));

  sortedOrders.forEach(o => {
    let statusClass = "bg-gray-100 text-gray-500";
    let statusText = o.status;
    if(o.status === "HQ_PENDING") { statusClass = "bg-purple-100 text-purple-700"; statusText = "접수 대기"; }
    else if(o.status === "SHIPPED") { statusClass = "bg-blue-100 text-blue-700"; statusText = "선적 완료"; }
    else if(o.status === "ARRIVED") { statusClass = "bg-emerald-100 text-emerald-700"; statusText = "캐나다 입항"; }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50/50 transition-colors";
    tr.innerHTML = `
      <td class="px-5 py-4 font-mono text-[11px] font-black text-gray-500">${o.id}</td>
      <td class="px-5 py-4 text-[12px] font-bold text-[var(--premium-charcoal)]">${formatDate(o.date)}</td>
      <td class="px-5 py-4 text-[12px] font-black text-[#E84C60]">${o.vendor}</td>
      <td class="px-5 py-4 text-[11px] font-bold text-gray-600">${o.region}</td>
      <td class="px-5 py-4 text-[12px] font-medium text-gray-700 max-w-[200px] truncate" title="${o.items}">${o.items}</td>
      <td class="px-5 py-4 text-[12px] font-mono font-bold text-gray-800">${o.eta}</td>
      <td class="px-5 py-4 text-center"><span class="px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm border border-black/5 ${statusClass}">${statusText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveHqOrder() {
  if (isSubmitting) return;
  const vendorName = document.getElementById('hqVendorInput').value.trim();
  const region = document.getElementById('hqRegionInput').value.toUpperCase().trim();
  const items = document.getElementById('hqItemsInput').value.trim();
  
  if(!vendorName || !region || !items) return showToast("필수 발주 내역을 모두 입력해 주세요.", "error");

  isSubmitting = true;
  const btn = document.getElementById('btnSubmitHqOrder');
  const originalHtml = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`;

  const payload = {
    id: "NEW", // 백엔드에서 생성됨
    date: new Date().toISOString().split('T')[0],
    vendor: vendorName,
    region: region,
    items: items,
    status: "HQ_PENDING",
    eta: "-"
  };

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPSERT_HQ_ORDER, token: sessionToken, order: payload })
    });
    const result = JSON.parse(await response.text());
    if (result.success) { 
      showToast("본사 발주 관제 시스템에 등록되었습니다.", "success"); 
      document.getElementById('hqItemsInput').value = ''; // 폼 초기화
      fetchProcurementData(); // 리스트 갱신
    } else throw new Error(result.message);
  } catch (err) { showToast("발주 등록 실패: " + err.message, "error"); } 
  finally { btn.disabled = false; btn.innerHTML = originalHtml; isSubmitting = false; }
}

// 바인딩
window.switchAdminTab = switchAdminTab; 
window.saveClientData = saveClientData; 
window.loadSalesGrid = loadSalesGrid; 
window.recalcSalesRow = recalcSalesRow; 
window.saveSalesGridData = saveSalesGridData;
window.saveHqOrder = saveHqOrder;
window.handleExcelUpload = handleExcelUpload;

document.addEventListener('DOMContentLoaded', () => { 
  populateSalesYearSelector();
  setupDragAndDrop();
  fetchMasterData(3); 
  fetchProcurementData(3); // 🌟 신규 매핑/관제 데이터 동시 로드
});
