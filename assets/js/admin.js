/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Admin Engine (V40.19 HOTFIX)
 * [Zero Bug Guarantee] 11 Proactive Bug Fixes & const Controller Crash Resolved
 * ============================================================================
 */

// 🌟 스크립트 로드 즉시 FOUC 방어막 능동적 철거
try {
    var docEl = document.documentElement;
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            docEl.classList.remove("fouc-lock");
            docEl.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
            docEl.classList.remove("opacity-0");
            docEl.style.opacity = "1";
            docEl.style.visibility = "visible";
            document.body.classList.remove("opacity-0");
            document.body.style.opacity = "1";
        });
    });
} catch(e) {}

// 🌟 Config 붕괴 연쇄 파괴 차단 (Absolute Fallback)
const CONFIG = (typeof window.SYSTEM_CONFIG !== 'undefined') ? window.SYSTEM_CONFIG : {};
const FALLBACK_API_URL = "https://script.google.com/macros/s/AKfycbyPWfrhETBWY1ThDwiNnTxL9h7-0zduGiYL2W0oLoNPeHNaNfYqZLft7SNWmKooDHFfhQ/exec";
const TARGET_API_URL = (CONFIG.API && CONFIG.API.BASE_URL) ? CONFIG.API.BASE_URL : FALLBACK_API_URL;
const STORAGE = (CONFIG.STORAGE_KEYS) ? CONFIG.STORAGE_KEYS : { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };

let userRole = "", clientName = "", sessionToken = "";
try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
} catch (e) {
    console.error("[Y2C Storage Error]", e);
}

if (!sessionToken || sessionToken.length < 10 || !["MASTER", "VENDOR", "PARTNER"].includes(userRole)) { 
    alert("보안 세션이 유효하지 않습니다. 안전을 위해 다시 로그인해 주세요."); 
    window.location.replace("index.html"); 
}

// ============================================================================
// 💾 IndexedDB 초고속 로컬스토리지 래퍼 (용량 무제한 캐시 무손실 보존)
// ============================================================================
const Y2C_DB = {
    name: 'Y2C_Logistics_DB',
    version: 1,
    isSupported: !!window.indexedDB,
    init: function() {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) return reject("IndexedDB not supported");
            const req = indexedDB.open(this.name, this.version);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('cacheStore')) {
                    db.createObjectStore('cacheStore', { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    set: async function(key, data) {
        if (!this.isSupported) return;
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('cacheStore', 'readwrite');
                tx.objectStore('cacheStore').put({ id: key, data: data, timestamp: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch(e) { console.warn("[Y2C_DB Set Warn] DB Fallback to memory", e); }
    },
    get: async function(key) {
        if (!this.isSupported) return null;
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('cacheStore', 'readonly');
                const req = tx.objectStore('cacheStore').get(key);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = () => reject(tx.error);
            });
        } catch(e) { return null; }
    }
};

// ============================================================================
// 🔒 Advanced Null-Safe Parsers (재무 무결성 100% 록다운 무손실 보존)
// ============================================================================
function escapeHtml(value) { 
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
                                             .replace(/javascript:/gi, "blocked:").replace(/on\w+=/gi, "blocked="); 
}

function safeDisplay(value, fallback = "-") {
    if (value == null) return fallback;
    const str = String(value).trim();
    if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "nan") return fallback;
    return escapeHtml(str);
}

function parseStrictNonNegativeInteger(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (!/^\d+$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isSafeInteger(num) || num < 0) return 0; 
    return Math.min(num, 9999999); 
}

function parseStrictDecimal(value) { 
    if (value == null) return 0; 
    let str = String(value).trim().toLowerCase().replace(/,/g, ''); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return 0; 
    if (str.startsWith('.')) str = '0' + str; 
    if (!/^-?\d+(?:\.\d{1,5})?$/.test(str)) return 0; 
    const num = Number(str); 
    if (!Number.isFinite(num)) return 0; 
    return Math.min(num, 9999999.99); 
}

function parseStrictISODate(value) { 
    if (value == null) return null;
    const str = String(value).trim().toLowerCase(); 
    if (str === "" || str === "null" || str === "nan" || str === "-") return null; 
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null; 
    const [y, m, d] = str.split("-").map(Number); 
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > 31) return null; 
    const date = new Date(Date.UTC(y, m - 1, d)); 
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null; 
    if (date.getTime() < new Date("2020-01-01").getTime()) return null;
    return str; 
}

function setUploadStatus(html) {
    const el = document.getElementById('uploadStatusText');
    if (el) el.innerHTML = html;
}

const HQ_ORDER_STATUSES = Object.freeze(["HQ_PENDING", "PREPARING", "ORDERED", "SHIPPED", "ARRIVED", "RECEIVED", "COMPLETED", "CANCELED"]);
const HQ_STATUS_LABELS = Object.freeze({ HQ_PENDING: "접수 대기", PREPARING: "준비 중", ORDERED: "발주 완료", SHIPPED: "선적 완료", ARRIVED: "캐나다 입항", RECEIVED: "입고 완료", COMPLETED: "처리 종결", CANCELED: "주문 취소" });
const ADMIN_TAB_ROLES = Object.freeze({ profiles: ["MASTER"], sales: ["MASTER"], inbound: ["MASTER", "VENDOR"], hqorders: ["MASTER", "VENDOR"] });

const userNameDisplay = document.getElementById('userNameDisplay'); if (userNameDisplay) userNameDisplay.textContent = safeDisplay(clientName || userRole);
const badge = document.getElementById('userRoleBadge'); if(badge) { badge.classList.remove('hidden'); badge.textContent = safeDisplay(userRole); }
document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); clearY2CSession(); window.location.replace("index.html"); }, { once: true });

const generateIdempotencyKey = () => { 
  const ts = Date.now().toString(36).toUpperCase();
  if (window.crypto && crypto.randomUUID) return "REQ-" + ts + "-" + crypto.randomUUID().split('-')[0].toUpperCase();
  if (window.crypto && crypto.getRandomValues) { const array = new Uint32Array(2); window.crypto.getRandomValues(array); return 'REQ-' + ts + "-" + Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').toUpperCase(); }
  return 'REQ-' + ts + '-' + Math.random().toString(36).slice(2, 10).toUpperCase(); 
};

const formatCurrency = (amount) => {
    const safeNum = Math.round((parseStrictDecimal(amount) + Number.EPSILON) * 100) / 100;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(safeNum);
};

const formatDate = (isoStr) => { 
    if (!isoStr) return "-";
    const str = String(isoStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split("-").map(Number);
        return new Intl.DateTimeFormat(currentLang === "ko" ? "ko-KR" : "en-CA", { timeZone: "UTC", year: "numeric", month: "short", day: "2-digit" }).format(new Date(Date.UTC(y, m - 1, d)));
    }
    const dt = new Date(str);
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-CA");
};

function clearY2CSession() { [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }); }

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) { 
      container = document.createElement('div'); container.id = 'toastContainer'; 
      container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
      document.body.appendChild(container); 
  }
  if (container.childNodes.length >= 5) container.firstChild.remove();

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]', icon = type === 'success' ? '✅' : '⚠️';
  toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg whitespace-pre-line"></span>`;
  toast.querySelector('.toast-msg').textContent = String(message);
  container.appendChild(toast);
  
  requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
  setTimeout(() => { 
      toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); 
      setTimeout(() => { toast.remove(); if (container && container.childNodes.length === 0) container.remove(); }, 300); 
  }, 3500);
}

// 🌟 [방어 2] 글로벌 브라우저 Drag & Drop 하이재킹 차단
window.addEventListener("dragover", function(e) { e.preventDefault(); e.stopPropagation(); }, false);
window.addEventListener("drop", function(e) { e.preventDefault(); e.stopPropagation(); }, false);

window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다. 작업이 제한됩니다.", "error"));
window.addEventListener('online', () => showToast("네트워크가 복구되었습니다.", "success"));
window.addEventListener('unhandledrejection', function(event) { 
    console.error("[Y2C Telemetry Promise Rejection]", event.reason); 
    isSubmitting = false; 
    isTabSwitching = false;
    clearTimeout(fallbackLockTimer);
});

function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    Object.keys(rbacRules).forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id), allowedRoles = rbacRules[id];
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale'); el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>'; el.removeAttribute('href'); 
            const clone = el.cloneNode(true); clone.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast("해당 메뉴는 열람 권한이 없습니다.", "error"); }); el.parentNode.replaceChild(clone, el);
        }
    });
}

let isTabSwitching = false;
function switchAdminTab(tab) {
  if (isTabSwitching) return;
  if (!ADMIN_TAB_ROLES[tab]) return showToast("존재하지 않는 시스템 메뉴입니다.", "error");
  if (!ADMIN_TAB_ROLES[tab].includes(userRole)) return showToast("이 메뉴에 대한 접근 권한이 없습니다.", "error");

  isTabSwitching = true;
  
  if (masterObserver) { masterObserver.disconnect(); masterObserver = null; }
  if (hqObserver) { hqObserver.disconnect(); hqObserver = null; }

  const tabs = ['profiles', 'sales', 'inbound', 'hqorders'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn_${t}`), sec = document.getElementById(`section_${t}`);
    if(t === tab) {
      if(btn) btn.className = "px-5 py-2.5 rounded-full font-black text-[11px] sm:text-xs tracking-wider uppercase transition-all duration-300 bg-[var(--premium-charcoal)] text-white shadow-md whitespace-nowrap";
      if(sec) sec.classList.remove('hidden');
    } else {
      if(btn && !btn.classList.contains('cursor-not-allowed')) btn.className = "px-5 py-2.5 rounded-full font-bold text-[11px] sm:text-xs tracking-wider uppercase transition-all duration-300 text-gray-500 hover:text-[var(--premium-charcoal)] hover:bg-gray-100 whitespace-nowrap";
      if(sec) sec.classList.add('hidden');
    }
  });

  setTimeout(() => { isTabSwitching = false; }, 300); 
}

let cachedClients = [], cachedHqOrders = [], cachedItems = [], cachedMappings = [];
let isSubmitting = false; 
let fallbackLockTimer = null; 

const RETRYABLE_ACTIONS = new Set(["get_master_data", "get_sales_records", "get_procurement_data", "get_items", "check_system_alerts", "inventory_integrity_check", "get_recipes"]);
const apiInFlight = new Set(); 

// ============================================================================
// 🌟 [방어 1, 3] 35초 절대 백오프 통신 엔진 (let 변경 및 GC 완벽 릴리즈)
// ============================================================================
async function executeApi(action, payload = {}, retries = 2) {
  if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다. 오프라인 쓰기가 차단됩니다.");
  
  const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};
  const hashKey = action + "_" + JSON.stringify(safePayload).length;
  if (apiInFlight.has(hashKey)) throw new Error("동일한 요청이 처리 중입니다. 잠시 대기하세요.");
  apiInFlight.add(hashKey);

  const canRetry = RETRYABLE_ACTIONS.has(action);
  const maxAttempts = canRetry ? retries : 0; 
  let lastNetworkError;

  for (let i = 0; i <= maxAttempts; i++) {
    // 🚨 const -> let 변경으로 가비지 컬렉터 충돌 방어
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), 35000); 
    
    try {
      const response = await fetch(TARGET_API_URL, {
        method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
        body: JSON.stringify({ ...safePayload, action: action, token: sessionToken }), 
        signal: controller.signal
      });
      
      if (!response.ok) {
          if (response.status === 404 || response.status === 401 || response.status === 403) {
              const explicitError = new Error(`서버 인증 또는 엔드포인트 접근이 거부되었습니다 (HTTP ${response.status})`);
              explicitError.httpStatus = response.status;
              explicitError.isFatal = true;
              throw explicitError;
          }
          const httpError = new Error(`서버 통신 오류 (HTTP ${response.status})`);
          httpError.httpStatus = response.status;
          throw httpError;
      }
      
      const rawText = await response.text();
      
      let jsonResult;
      try { 
          jsonResult = JSON.parse(rawText); 
      } catch (parseErr) {
         if (i < maxAttempts) { await new Promise(res => setTimeout(res, (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800))); continue; }
         apiInFlight.delete(hashKey);
         throw new Error("서버 응답 파싱 실패. 시스템 포맷 오염 감지."); 
      }

      if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) {
          apiInFlight.delete(hashKey); throw new Error("서버 응답 규격이 올바르지 않습니다.");
      }

      if (!jsonResult.success) {
        if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) { 
            clearY2CSession(); alert("세션이 만료되었습니다. 다시 로그인해 주세요."); window.location.replace("index.html"); return; 
        }
        
        const err = new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
        err.ledgerPending = jsonResult.ledgerPending === true; 
        err.inventoryCommitted = jsonResult.inventoryCommitted === true; 
        err.txId = safeDisplay(jsonResult.txId, null);
        apiInFlight.delete(hashKey);
        throw err;
      }
      
      apiInFlight.delete(hashKey);
      return jsonResult;
    } catch (err) {
      if (err.isFatal) { apiInFlight.delete(hashKey); throw err; }

      if (err && err.httpStatus) {
          if (err.httpStatus === 429) { apiInFlight.delete(hashKey); throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)"); }
          if (err.httpStatus === 503) { apiInFlight.delete(hashKey); throw new Error("서버가 점검 중이거나 응답할 수 없습니다. (HTTP 503)"); }
      }
      
      if (err.message && err.message.includes("Failed to fetch")) { 
          lastNetworkError = new Error("🚨 서버 접근 지연(CORS) 또는 네트워크 단절."); 
      } else {
          lastNetworkError = err;
      }
      
      if (i < maxAttempts) { await new Promise(res => setTimeout(res, (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800))); continue; }
    } finally {
      // 🚨 finally 블록 릴리즈 강제
      clearTimeout(timeoutId);
      controller = null;
    }
  }
  apiInFlight.delete(hashKey);
  throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (35초 대기열 락다운)" : "서버 통신 실패. 네트워크 상태를 확인해주세요.");
}

// ============================================================================
// 📁 가맹점 DB 관리부 (Event Delegation 이벤트 폭주 차단 보강)
// ============================================================================
async function fetchMasterData() {
  if (userRole === "VENDOR" || userRole === "PARTNER") return; 
  const tableBody = document.getElementById('masterTableBody'); if (!tableBody) return;

  const cacheKey = `MASTER_DATA_${clientName}`;
  const cachedData = await Y2C_DB.get(cacheKey);
  if (cachedData) {
      cachedClients.length = 0; 
      cachedClients = cachedData;
      renderMasterDataFast();
  }

  try {
    const result = await executeApi("get_master_data");
    if (result && result.success) {
      cachedClients.length = 0; 
      cachedClients = Array.isArray(result.clients) ? result.clients : [];
      await Y2C_DB.set(cacheKey, cachedClients);
      renderMasterDataFast();
    } 
  } catch (err) { 
      if(!cachedClients || cachedClients.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-[#E3000F] font-black tracking-wide font-inter">데이터 로드 실패: ${escapeHtml(err.message)}</td></tr>`; 
      }
  }
}

let masterObserver = null;
let masterRenderIndex = 0;
const MASTER_CHUNK_SIZE = 30;

function renderMasterDataFast() {
    const tableBody = document.getElementById('masterTableBody');
    if (!tableBody) return;
    if (masterObserver) { masterObserver.disconnect(); masterObserver = null; }
    
    if (cachedClients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide font-inter">등록된 가맹점 정보가 없습니다.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    masterRenderIndex = 0;

    masterObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            masterObserver.disconnect();
            appendMasterChunk();
        }
    }, { rootMargin: '400px' });

    appendMasterChunk();
}

function appendMasterChunk() {
    const tableBody = document.getElementById('masterTableBody');
    if (!tableBody) return;

    // 🌟 [방어 10] 배열 바운더리 픽스
    if (masterRenderIndex >= cachedClients.length) return;

    const endIdx = Math.min(masterRenderIndex + MASTER_CHUNK_SIZE, cachedClients.length);
    const inputClass = "w-full bg-gray-50 focus:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none transition-all shadow-sm";
    
    const fragment = document.createDocumentFragment();

    for (; masterRenderIndex < endIdx; masterRenderIndex++) {
        const c = cachedClients[masterRenderIndex];
        const safeRowIdx = Number(c.rowIdx);
        if (!Number.isSafeInteger(safeRowIdx) || safeRowIdx < 1) continue; 

        const tr = document.createElement('tr');
        tr.className = "hover:bg-red-50/20 transition-colors duration-200 border-b border-gray-50";
        tr.innerHTML = `
        <td class="px-6 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight font-inter">${safeDisplay(c.name)}</td>
        <td class="px-4 py-4 text-center"><input type="text" id="state_${safeRowIdx}" value="${safeDisplay(c.state, "")}" class="${inputClass} text-center uppercase" maxlength="2" placeholder="ON" oninput="this.value = this.value.replace(/[^A-Za-z]/g, '').toUpperCase()"></td>
        <td class="px-4 py-4"><input type="text" id="city_${safeRowIdx}" value="${safeDisplay(c.city, "")}" class="${inputClass}" placeholder="City"></td>
        <td class="px-4 py-4"><input type="text" id="addr_${safeRowIdx}" value="${safeDisplay(c.address, "")}" class="${inputClass}" placeholder="Full Address"></td>
        <td class="px-4 py-4"><input type="text" id="attn_${safeRowIdx}" value="${safeDisplay(c.attn, "")}" class="${inputClass}" placeholder="Manager Name"></td>
        <td class="px-4 py-4"><input type="email" id="email_${safeRowIdx}" value="${safeDisplay(c.email, "")}" class="${inputClass}" placeholder="Email"></td>
        <td class="px-4 py-4"><input type="text" id="biz_${safeRowIdx}" value="${safeDisplay(c.bizId, "")}" class="${inputClass} font-mono" placeholder="Business ID"></td>
        <td class="px-6 py-4 text-center bg-gray-50/50 border-l border-gray-100"><button type="button" id="saveBtn_${safeRowIdx}" data-row="${safeRowIdx}" class="save-client-btn btn-charcoal px-4 py-3 rounded-xl text-[11px] font-black tracking-widest uppercase w-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all focus:outline-none">SAVE</button></td>
        `;
        fragment.appendChild(tr);
    }
    
    tableBody.appendChild(fragment);
    
    if (masterRenderIndex >= cachedClients.length) {
        populateSalesClientSelector();
    } else {
        requestAnimationFrame(() => {
            const grid = document.getElementById('section_profiles');
            if (grid && grid.scrollHeight <= window.innerHeight) {
                appendMasterChunk();
            } else {
                const lastRow = tableBody.lastElementChild;
                if (lastRow) masterObserver.observe(lastRow);
            }
        });
    }
}

// 🌟 [방어 6] Event Delegation (이벤트 1곳에서 통제)
document.addEventListener('DOMContentLoaded', () => {
    const masterBody = document.getElementById('masterTableBody');
    if (masterBody) {
        masterBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('save-client-btn')) {
                const rowIdx = e.target.getAttribute('data-row');
                if (rowIdx) window.saveClientData(rowIdx);
            }
        });
    }
});

window.saveClientData = async function(rowIdx) {
  if (isSubmitting || !navigator.onLine) return showToast("현재 요청을 처리할 수 없습니다.", "error"); 
  const safeRowIdx = Number(rowIdx);
  if (!Number.isSafeInteger(safeRowIdx) || safeRowIdx < 1) return;

  const stateEl = document.getElementById(`state_${safeRowIdx}`), cityEl = document.getElementById(`city_${safeRowIdx}`), addrEl = document.getElementById(`addr_${safeRowIdx}`);
  const attnEl = document.getElementById(`attn_${safeRowIdx}`), emailEl = document.getElementById(`email_${safeRowIdx}`), bizEl = document.getElementById(`biz_${safeRowIdx}`);

  if (!stateEl || !cityEl || !addrEl || !attnEl || !emailEl || !bizEl) return showToast("가맹점 입력 요소를 찾을 수 없습니다.", "error");

  const emailVal = emailEl.value.trim();
  if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { emailEl.focus(); return showToast("유효한 이메일 형식이 아닙니다.", "error"); }

  isSubmitting = true;
  clearTimeout(fallbackLockTimer);
  const saveBtn = document.getElementById(`saveBtn_${safeRowIdx}`); let originalText = "SAVE";
  
  if (saveBtn) { 
      originalText = saveBtn.textContent; saveBtn.disabled = true; 
      saveBtn.classList.add('pointer-events-none');
      saveBtn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`; 
  }
  
  fallbackLockTimer = setTimeout(() => {
      isSubmitting = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.classList.remove('pointer-events-none'); saveBtn.innerHTML = originalText; }
  }, 35000);
  
  const payload = { rowIdx: safeRowIdx, state: stateEl.value.toUpperCase().trim(), city: cityEl.value.trim(), address: addrEl.value.trim(), attn: attnEl.value.trim(), email: emailVal, bizId: bizEl.value.trim() };

  try {
    const result = await executeApi("update_master_data", { client: payload });
    if (result && result.success) {
      if(saveBtn) { saveBtn.innerHTML = "✅ SAVED"; saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); }
      showToast("마스터 데이터 저장 완료", "success"); setTimeout(() => fetchMasterData(), 1500); 
    }
  } catch (err) { 
      showToast(err.message, "error"); 
  } finally { 
      isSubmitting = false; clearTimeout(fallbackLockTimer); 
      if (saveBtn) { 
          saveBtn.disabled = false; 
          saveBtn.classList.remove('pointer-events-none'); 
          if(saveBtn.innerHTML.indexOf("SAVED") === -1) saveBtn.innerHTML = originalText; 
      }
  }
}

// ============================================================================
// 📊 ERP 매출 데이터 동기화 (Race Condition 락다운)
// ============================================================================
const monthNames = ["Jan (1월)", "Feb (2월)", "Mar (3월)", "Apr (4월)", "May (5월)", "Jun (6월)", "Jul (7월)", "Aug (8월)", "Sep (9월)", "Oct (10월)", "Nov (11월)", "Dec (12월)"];

function populateSalesYearSelector() {
  const yearSelect = document.getElementById('salesYearSelector'); if (!yearSelect) return; yearSelect.innerHTML = ''; const currentYear = new Date().getFullYear();
  for (let y = currentYear + 2; y >= 2022; y--) { const opt = document.createElement('option'); opt.value = y; opt.textContent = `${y} Fiscal Year`; if (y === currentYear) opt.selected = true; yearSelect.appendChild(opt); }
}

function populateSalesClientSelector() {
  const clientSelect = document.getElementById('salesClientSelector'); if (!clientSelect || cachedClients.length === 0) return;
  clientSelect.innerHTML = `<option value="">-- Select Franchise --</option>`;
  cachedClients.forEach(c => { const opt = document.createElement('option'); opt.value = safeDisplay(c.name, ""); opt.textContent = safeDisplay(c.name, ""); clientSelect.appendChild(opt); });
}

// 🌟 [방어 5] Race Condition 뮤텍스
let isFetchingSales = false;

window.loadSalesGrid = async function() {
  if (isFetchingSales) return;
  const targetYear = document.getElementById('salesYearSelector')?.value, targetClient = document.getElementById('salesClientSelector')?.value, tbody = document.getElementById('salesGridBody');
  if (!targetYear || !targetClient || !tbody) return;
  
  isFetchingSales = true;
  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 font-bold tracking-wide font-inter"><span class="animate-pulse">🔄 동기화 중...</span></td></tr>`;
  
  try {
    const result = await executeApi("get_sales_records", { year: targetYear, clientName: targetClient });
    let safeRecords = Array.isArray(result.records) ? result.records : [];
    if(safeRecords.length !== 12) {
        const temp = []; for(let i=1; i<=12; i++) { const found = safeRecords.find(x => Number(x.month) === i); temp.push(found || {month: i, pos: 0, delivery: 0, total: 0, exists: false}); }
        safeRecords = temp;
    }
    if (result && result.success) renderSalesGrid(safeRecords);
  } catch (err) { 
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-[#E3000F] font-black py-8 font-inter">데이터 로드 실패: ${escapeHtml(err.message)}</td></tr>`; 
  } finally {
      isFetchingSales = false;
  }
}

function renderSalesGrid(records) {
  const tbody = document.getElementById('salesGridBody'); if (!tbody) return; tbody.innerHTML = '';
  if(!Array.isArray(records)) return;

  const inputStyle = "w-full max-w-[170px] mx-auto bg-gray-50 focus:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center text-[13px] font-mono font-bold text-gray-800 focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none transition-all shadow-sm";
  const fragment = document.createDocumentFragment();

  records.forEach(r => {
    const mIdx = Number(r.month);
    if (!Number.isInteger(mIdx) || mIdx < 1 || mIdx > 12) return;

    const tr = document.createElement('tr'); tr.className = "hover:bg-red-50/20 transition-colors border-b border-gray-50";
    const badgeHTML = r.exists ? `<span class="px-3 py-1 text-[10px] font-black rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm font-inter">SAVED</span>` : `<span class="px-3 py-1 text-[10px] font-black rounded-md bg-gray-100 text-gray-400 border border-gray-200 shadow-sm font-inter">EMPTY</span>`;
    
    const safePos = parseStrictDecimal(r.pos);
    const safeDel = parseStrictDecimal(r.delivery);
    const safeTot = parseStrictDecimal(r.total);

    tr.innerHTML = `
      <td class="px-6 py-4 font-black text-gray-700 text-xs sm:text-sm whitespace-nowrap font-inter">${monthNames[mIdx - 1]}</td>
      <td class="px-6 py-4 text-center"><input type="text" data-month="${mIdx}" data-type="pos" value="${safePos > 0 ? safePos : ''}" placeholder="0.00" class="sales-input-pos ${inputStyle}"></td>
      <td class="px-6 py-4 text-center"><input type="text" data-month="${mIdx}" data-type="del" value="${safeDel > 0 ? safeDel : ''}" placeholder="0.00" class="sales-input-del ${inputStyle}"></td>
      <td class="px-6 py-4 text-right font-black font-mono text-[var(--premium-charcoal)] text-sm whitespace-nowrap" id="rowTotal_${mIdx}">${formatCurrency(safeTot)}</td>
      <td class="px-6 py-4 text-center whitespace-nowrap">${badgeHTML}</td>
    `;
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
  recalculateKpis();
}

document.addEventListener('DOMContentLoaded', () => {
    const sBody = document.getElementById('salesGridBody');
    if (sBody) {
        sBody.addEventListener('input', (e) => {
            if(e.target.classList.contains('sales-input-pos') || e.target.classList.contains('sales-input-del')) {
                const rawVal = e.target.value;
                const cleanVal = rawVal.replace(/[^0-9.]/g, '');
                if (rawVal !== cleanVal) e.target.value = cleanVal;
                
                const mIdx = e.target.getAttribute('data-month');
                if (mIdx) recalcSalesRow(mIdx);
            }
        });
    }
});

window.recalcSalesRow = function(month) {
  const posInput = document.querySelector(`.sales-input-pos[data-month="${month}"]`), delInput = document.querySelector(`.sales-input-del[data-month="${month}"]`);
  let p = parseStrictDecimal(posInput?.value), d = parseStrictDecimal(delInput?.value); 
  const totalDisplay = document.getElementById(`rowTotal_${month}`); if (totalDisplay) totalDisplay.textContent = formatCurrency(p + d);
  
  requestAnimationFrame(recalculateKpis);
}

function recalculateKpis() {
  let totAnnual = 0, totPos = 0, totDel = 0;
  for (let m = 1; m <= 12; m++) {
    totPos += parseStrictDecimal(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value);
    totDel += parseStrictDecimal(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value);
  }
  totAnnual = totPos + totDel;
  const tTotal = document.getElementById('salesKpiTotal'), tPos = document.getElementById('salesKpiPos'), tDel = document.getElementById('salesKpiDelivery');
  if (tTotal) tTotal.textContent = formatCurrency(totAnnual);
  if (tPos) tPos.textContent = formatCurrency(totPos);
  if (tDel) tDel.textContent = formatCurrency(totDel);
}

window.saveSalesGridData = async function() {
  if (isSubmitting || !navigator.onLine) return showToast("현재 저장할 수 없는 상태입니다.", "error"); 

  const yearEl = document.getElementById('salesYearSelector'), clientEl = document.getElementById('salesClientSelector');
  if (!yearEl || !clientEl) return showToast("매출 입력 요소를 찾을 수 없습니다.", "error");

  const targetYear = yearEl.value, targetClient = clientEl.value;
  if (!targetYear || !targetClient) return showToast("가맹점과 연도를 선택해 주세요.", "error");

  const recordsToSave = [];
  for (let m = 1; m <= 12; m++) {
    const pos = parseStrictDecimal(document.querySelector(`.sales-input-pos[data-month="${m}"]`)?.value);
    const delivery = parseStrictDecimal(document.querySelector(`.sales-input-del[data-month="${m}"]`)?.value);
    recordsToSave.push({ month: m, pos: pos, delivery: delivery });
  }

  isSubmitting = true; clearTimeout(fallbackLockTimer);
  const btn = document.getElementById('saveAllSalesBtn'); let originalHtml = "SAVE DATA";
  
  if (btn) { 
      originalHtml = btn.innerHTML; btn.disabled = true; btn.classList.add('pointer-events-none');
      btn.innerHTML = `<span class="animate-pulse">⏳ SYNCHRONIZING...</span>`; 
  }
  
  fallbackLockTimer = setTimeout(() => {
      isSubmitting = false;
      if (btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalHtml; }
  }, 35000);
  
  try {
    const result = await executeApi("save_sales_records", { year: targetYear, clientName: targetClient, records: recordsToSave });
    if (result && result.success) { showToast(result.message, "success"); setTimeout(() => loadSalesGrid(), 1000); }
  } catch (err) { 
      showToast("매출 저장 실패: " + err.message, "error"); 
  } finally { 
      isSubmitting = false; clearTimeout(fallbackLockTimer);
      if (btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalHtml; } 
  }
}

// ============================================================================
// 🛡️ B2B 조달 / 시스템 헬스 스캔 무손실 보존
// ============================================================================
function renderOrderMetrics(metrics) {
  if(!metrics) return; const table = document.getElementById('hqOrdersGridBody')?.closest('table'); if(!table || !table.parentNode) return;

  let kpiContainer = document.getElementById('y2cOrderMetrics');
  if (!kpiContainer) {
    kpiContainer = document.createElement('div'); kpiContainer.id = 'y2cOrderMetrics'; kpiContainer.className = userRole === "MASTER" ? 'grid grid-cols-2 gap-4 sm:gap-6 mb-8' : 'grid grid-cols-1 gap-4 sm:gap-6 mb-8';
    table.parentNode.insertBefore(kpiContainer, table);
    
    if (userRole === "MASTER") {
        const scanBtn = document.createElement('button'); 
        scanBtn.id = "sysHealthScanBtn"; 
        scanBtn.innerHTML = '<span data-i18n="sys_health_scan">🛡️ SYSTEM HEALTH SCAN</span>';
        scanBtn.className = "w-full col-span-2 btn-charcoal py-4 rounded-2xl shadow-lg transition-all tracking-[0.2em] mb-4 font-black focus:outline-none focus:ring-2 focus:ring-[#1A1516] focus:ring-offset-2 hover:shadow-xl";
        table.parentNode.insertBefore(scanBtn, kpiContainer);
        scanBtn.addEventListener('click', runSystemAlertScan); 
    }
  }
  
  const safeTotalQty = parseStrictNonNegativeInteger(metrics.totalQty);
  const safeTotalAmount = parseStrictDecimal(metrics.totalAmount);

  let expenditureHtml = '';
  if (userRole === "MASTER") {
      expenditureHtml = `
        <div class="bg-gradient-to-br from-[#E3000F] to-[#B9000C] border border-[#E3000F]/30 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div class="flex items-center gap-3 mb-2 relative z-10"><div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">💳</div><p class="text-[11px] font-black text-red-100 uppercase tracking-widest font-inter" data-i18n="b2b_expenditure">Total B2B Expenditure</p></div>
          <h3 class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tighter relative z-10">${formatCurrency(safeTotalAmount)}</h3>
        </div>`;
  }

  kpiContainer.innerHTML = `
    <div class="bg-white premium-shadow rounded-2xl p-6 transition-shadow">
      <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">📦</div><p class="text-[11px] font-black text-gray-500 uppercase tracking-widest font-inter" data-i18n="b2b_volume">Total B2B Volume</p></div>
      <h3 class="text-2xl sm:text-3xl font-black text-[var(--premium-charcoal)] font-mono tracking-tighter">${safeTotalQty.toLocaleString()} <span class="text-xs text-gray-400 font-bold ml-1 font-inter">Units</span></h3>
    </div> ${expenditureHtml}`;
  if (window.applyTranslations) window.applyTranslations();
}

async function runSystemAlertScan(event) {
  if (isSubmitting || !navigator.onLine) return;
  const btn = event?.currentTarget || document.getElementById('sysHealthScanBtn');
  if(!btn) return showToast("시스템 스캔 버튼을 찾을 수 없습니다.", "error"); 
  
  isSubmitting = true; clearTimeout(fallbackLockTimer);
  const originalText = btn.innerHTML; 
  btn.disabled = true; btn.classList.add('pointer-events-none'); btn.innerHTML = `<span class="animate-pulse">⏳ DEEP SCANNING...</span>`;
  
  fallbackLockTimer = setTimeout(() => {
      isSubmitting = false;
      btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalText;
  }, 35000);

  try {
    const result = await executeApi("check_system_alerts");
    const integResult = await executeApi("inventory_integrity_check");
    if (result && result.success && integResult && integResult.success) { 
        showToast("스캔 완료. 시스템 리포트가 생성되었습니다.", "success"); 
        displayAlertModal(result.alerts, integResult.discrepancies); 
    }
  } catch (err) { 
      showToast("스캔 실패: " + err.message, "error"); 
  } finally { 
      isSubmitting = false; clearTimeout(fallbackLockTimer);
      if(btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalText; }
  }
}

function displayAlertModal(alerts, discrepancies) {
  alerts = (alerts && typeof alerts === "object" && !Array.isArray(alerts)) ? alerts : {};
  alerts.lowStock = Array.isArray(alerts.lowStock) ? alerts.lowStock : [];
  alerts.expiring = Array.isArray(alerts.expiring) ? alerts.expiring : [];
  discrepancies = Array.isArray(discrepancies) ? discrepancies : [];

  let modal = document.getElementById('alertModal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'alertModal';
    modal.className = 'fixed inset-0 bg-[#111827]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
    document.body.appendChild(modal);
  }
  
  let html = `<div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden premium-shadow transform transition-transform scale-95 duration-300" id="alertModalContent">`;
  html += `<div class="bg-[var(--premium-charcoal)] p-6 text-white flex justify-between items-center"><h2 class="text-xl font-black tracking-widest font-montserrat">🛡️ SYSTEM HEALTH REPORT</h2><button id="alertModalCloseTop" class="text-gray-400 hover:text-white font-bold text-2xl focus:outline-none" type="button">&times;</button></div><div class="p-6 max-h-[70vh] overflow-y-auto hide-scrollbar font-inter">`;
  
  let hasIssues = false;

  if (discrepancies.length > 0) {
      hasIssues = true;
      html += `<h3 class="font-black text-purple-600 mb-3 flex items-center gap-2"><span>🔍</span> Integrity Discrepancies (${discrepancies.length})</h3><div class="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-6"><ul class="space-y-3">`;
      discrepancies.forEach(d => {
          html += `<li class="flex flex-col text-[13px] border-b border-purple-100 pb-3"><div class="flex justify-between items-center mb-1.5"><span class="font-bold text-gray-800">[${escapeHtml(d.region)}] ${safeDisplay(d.name)} <span class="text-gray-400 font-normal ml-1 font-mono">(${safeDisplay(d.code)})</span></span><span class="font-black text-purple-600 bg-white px-2.5 py-1 rounded-md shadow-sm border border-purple-100">${safeDisplay(d.issue)}</span></div><div class="flex items-center gap-4 text-[11px] font-mono"><span class="text-gray-500">System Stock: <b class="${typeof d.system_stock === 'number' && d.system_stock < 0 ? 'text-[#E3000F]' : 'text-gray-800'}">${safeDisplay(d.system_stock)}</b></span><span class="text-gray-500">Batch Stock: <b class="text-gray-800">${safeDisplay(d.batch_stock)}</b></span><span class="text-gray-500">Diff: <b class="text-purple-600">${safeDisplay(d.difference)}</b></span></div></li>`;
      });
      html += `</ul></div>`;
  }

  if (alerts.lowStock.length > 0) {
      hasIssues = true;
      html += `<h3 class="font-black text-[#E3000F] mb-3 flex items-center gap-2"><span>🚨</span> Low Stock Alert (${alerts.lowStock.length})</h3><div class="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6"><ul class="space-y-3">`;
      alerts.lowStock.forEach(item => { html += `<li class="flex justify-between items-center text-[13px] border-b border-red-100 pb-2.5"><span class="font-bold text-gray-800">[${safeDisplay(item.region)}] ${safeDisplay(item.name)}</span><span class="font-black text-[#E3000F] bg-white px-2.5 py-1 rounded-md shadow-sm border border-red-100">${safeDisplay(item.stock)}</span></li>`; });
      html += `</ul></div>`;
  }

  if (alerts.expiring.length > 0) {
      hasIssues = true;
      html += `<h3 class="font-black text-amber-600 mb-3 flex items-center gap-2"><span>⏳</span> Expiration Alert (${alerts.expiring.length})</h3><div class="bg-amber-50 border border-amber-100 rounded-2xl p-5"><ul class="space-y-3">`;
      alerts.expiring.forEach(item => {
        let badge = item.daysLeft < 0 ? "기한 초과" : `D-${item.daysLeft}`, textCol = item.daysLeft < 0 ? "text-[#E3000F]" : "text-amber-600";
        html += `<li class="flex justify-between items-center text-[13px] border-b border-amber-100 pb-2.5"><span class="font-bold text-gray-800">[${safeDisplay(item.region)}] ${safeDisplay(item.name)}</span><div class="flex items-center gap-3"><span class="font-black ${textCol}">${safeDisplay(item.date)} (${badge})</span><span class="font-bold text-gray-500 font-mono">Qty: ${safeDisplay(item.qty)}</span></div></li>`;
      });
      html += `</ul></div>`;
  }

  if (!hasIssues) { html += `<div class="text-center py-12"><span class="text-5xl drop-shadow-sm">✅</span><p class="mt-5 font-bold text-gray-500 font-inter">모든 데이터 무결성, 재고, 유통기한이 완벽하게 안정적입니다.</p></div>`; }

  html += `</div><div class="p-5 bg-gray-50 border-t border-gray-100 text-center"><button id="alertModalCloseBottom" type="button" class="btn-gradient-pink px-10 py-3.5 rounded-xl font-black shadow-md uppercase tracking-widest text-xs focus:outline-none focus:ring-2 focus:ring-[#E3000F] focus:ring-offset-2">Close Report</button></div></div>`;
  modal.innerHTML = html; 
  
  modal.querySelector('#alertModalCloseTop')?.addEventListener('click', closeAlertModal);
  modal.querySelector('#alertModalCloseBottom')?.addEventListener('click', closeAlertModal);
  
  modal.addEventListener('click', (e) => { if(e.target === modal) closeAlertModal(); });
  window.addEventListener('keydown', handleAlertEsc);

  modal.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => document.getElementById('alertModalContent')?.classList.remove('scale-95'), 50);
}

function handleAlertEsc(e) { if(e.key === "Escape") closeAlertModal(); }

function closeAlertModal() {
  const modal = document.getElementById('alertModal'), content = document.getElementById('alertModalContent');
  if (!modal) return;
  if (content) content.classList.add('scale-95'); 
  modal.classList.add('opacity-0', 'pointer-events-none'); 
  window.removeEventListener('keydown', handleAlertEsc);
  setTimeout(() => { modal.innerHTML = ''; }, 300);
}

function renderHqOrdersError(msg) {
    const tbody = document.getElementById('hqOrdersGridBody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#E3000F] font-bold tracking-wide font-inter">Error: ${escapeHtml(msg)}</td></tr>`;
}

async function fetchMappings() {
  try {
    const cacheKey = `MAPPINGS_HQ_${clientName}`;
    const cached = await Y2C_DB.get(cacheKey);
    if (cached) {
        cachedMappings.length = 0; cachedMappings = cached.mappings || [];
        cachedHqOrders.length = 0; cachedHqOrders = cached.hqOrders || [];
        renderHqOrdersFast();
        if(cached.orderMetrics) renderOrderMetrics(cached.orderMetrics);
    }
    
    const result = await executeApi("get_procurement_data");
    if (result && result.success) {
      cachedMappings.length = 0; cachedMappings = Array.isArray(result.mappings) ? result.mappings : []; 
      cachedHqOrders.length = 0; cachedHqOrders = Array.isArray(result.hqOrders) ? result.hqOrders : [];
      
      await Y2C_DB.set(cacheKey, { mappings: cachedMappings, hqOrders: cachedHqOrders, orderMetrics: result.orderMetrics });
      
      renderHqOrdersFast(); 
      if(result.orderMetrics) renderOrderMetrics(result.orderMetrics);
    } 
  } catch (err) { 
      if(cachedHqOrders.length === 0) {
          renderHqOrdersError(err.message); showToast("조달 데이터 로드 실패: " + err.message, "error"); 
      }
  }
}

async function fetchCatalogForInbound() {
  const cacheKey = `ADMIN_ITEMS_CACHE`;
  const cached = await Y2C_DB.get(cacheKey);
  if(cached) {
      cachedItems.length = 0; cachedItems = cached;
      populateInboundRegionOptions();
  }

  try {
    const result = await executeApi("get_items", { clientState: "DEFAULT" });
    if (result && result.success) { 
      cachedItems.length = 0; cachedItems = Array.isArray(result.items || result.data) ? (result.items || result.data) : [];
      await Y2C_DB.set(cacheKey, cachedItems);
      populateInboundRegionOptions();
    }
  } catch (e) { console.error("Catalog load failed", e); }
}

// ============================================================================
// 🚀 Infinite Chunk Observer 탑재 HQ 조달 내역 렌더러
// ============================================================================
let hqObserver = null;
let hqRenderIndex = 0;
const HQ_CHUNK_SIZE = 30;
const hqStatusInFlight = new Set();

function renderHqOrdersFast() {
    const tbody = document.getElementById('hqOrdersGridBody'); 
    if(!tbody) return; 
    if (hqObserver) { hqObserver.disconnect(); hqObserver = null; }

    if(cachedHqOrders.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide font-inter">등록된 내역이 없습니다.</td></tr>`; 
        return; 
    }

    cachedHqOrders.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    tbody.innerHTML = '';
    hqRenderIndex = 0;

    hqObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            hqObserver.disconnect();
            appendHqChunk();
        }
    }, { rootMargin: '400px' });

    appendHqChunk();
}

function appendHqChunk() {
    const tbody = document.getElementById('hqOrdersGridBody'); 
    if(!tbody) return; 
    
    // 🌟 [방어 10] 배열 바운더리 픽스
    if (hqRenderIndex >= cachedHqOrders.length) return;

    const endIdx = Math.min(hqRenderIndex + HQ_CHUNK_SIZE, cachedHqOrders.length);
    const fragment = document.createDocumentFragment();

    for (; hqRenderIndex < endIdx; hqRenderIndex++) {
        const o = cachedHqOrders[hqRenderIndex];
        
        let statusClass = "bg-gray-100 text-gray-500 border-gray-200";
        switch(o.status) {
            case "HQ_PENDING": statusClass = "bg-purple-50 text-purple-700 border-purple-200"; break;
            case "PREPARING": statusClass = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200"; break;
            case "ORDERED": statusClass = "bg-indigo-50 text-indigo-700 border-indigo-200"; break;
            case "SHIPPED": statusClass = "bg-blue-50 text-blue-700 border-blue-200"; break;
            case "ARRIVED": statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200"; break;
            case "RECEIVED": statusClass = "bg-teal-50 text-teal-700 border-teal-200"; break;
            case "COMPLETED": statusClass = "bg-gray-100 text-gray-800 border-gray-300"; break;
            case "CANCELED": statusClass = "bg-red-50 text-red-700 border-red-200 line-through"; break;
        }

        const tr = document.createElement('tr'); 
        tr.className = "hover:bg-red-50/20 transition-colors border-b border-gray-50";
        tr.innerHTML = `
            <td class="px-6 py-4 font-mono text-[11px] font-bold text-gray-500">${safeDisplay(o.id)}</td>
            <td class="px-6 py-4 text-[12px] font-bold text-[var(--premium-charcoal)] font-inter">${formatDate(o.date)}</td>
            <td class="px-6 py-4 text-[12px] font-black text-[#E3000F] font-inter">${safeDisplay(o.vendor)}</td>
            <td class="px-6 py-4 text-[11px] font-bold text-gray-600 font-inter">${safeDisplay(o.region)}</td>
            <td class="px-6 py-4 text-[12px] font-medium text-gray-700 max-w-[200px] truncate font-inter" title="${escapeHtml(o.items)}">${safeDisplay(o.items)}</td>
            <td class="px-6 py-4 text-[12px] font-mono font-bold text-gray-800">${safeDisplay(o.eta)}</td>
            <td class="px-6 py-4 text-center hq-status-cell"></td>
        `;
        
        const select = document.createElement('select');
        select.className = `text-[10px] font-black rounded-md border p-2 outline-none shadow-sm transition-all cursor-pointer font-inter ${statusClass}`;
        
        if (!HQ_ORDER_STATUSES.includes(o.status)) {
            const invalidOpt = document.createElement('option');
            invalidOpt.value = o.status; invalidOpt.textContent = `INVALID (${escapeHtml(o.status)})`;
            invalidOpt.selected = true; invalidOpt.disabled = true;
            select.appendChild(invalidOpt); select.disabled = true; 
        } else {
            HQ_ORDER_STATUSES.forEach(status => {
                const option = document.createElement('option');
                option.value = status; option.textContent = HQ_STATUS_LABELS[status] || status; 
                if (o.status === status) option.selected = true;
                select.appendChild(option);
            });
        }
        
        select.addEventListener('change', async () => { 
            const orderId = String(o.id || "");
            if (hqStatusInFlight.has(orderId)) { select.value = o.status; return showToast("상태 변경이 이미 진행 중입니다.", "error"); }
            
            hqStatusInFlight.add(orderId); 
            select.disabled = true; 
            select.classList.add('pointer-events-none', 'animate-pulse');
            
            try { 
                await updateHqOrderStatus(orderId, select.value); 
            } finally { 
                hqStatusInFlight.delete(orderId); 
                select.disabled = false; 
                select.classList.remove('pointer-events-none', 'animate-pulse'); 
            }
        });
        
        tr.querySelector('.hq-status-cell').appendChild(select); 
        fragment.appendChild(tr);
    }
    tbody.appendChild(fragment);

    if (hqRenderIndex < cachedHqOrders.length) {
        requestAnimationFrame(() => {
            const grid = document.getElementById('section_hqorders');
            if (grid && grid.scrollHeight <= window.innerHeight) {
                appendHqChunk();
            } else {
                const lastRow = tbody.lastElementChild;
                if (lastRow) hqObserver.observe(lastRow);
            }
        });
    }
}

let hqCartData = Object.create(null); 
let cartSearchTimeout = null;

window.openHqOrderCartModal = async function() {
    if(cachedItems.length === 0) {
        showToast("백엔드와 데이터를 동기화 중입니다. 잠시만 기다려주세요...", "success");
        await fetchCatalogForInbound();
        if(cachedItems.length === 0) return showToast("🚨 서버 접근이 지연되고 있습니다.", "error");
    }

    let modal = document.getElementById('hqCartModal');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'hqCartModal';
        modal.className = 'fixed inset-0 bg-[#111827]/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        document.body.appendChild(modal);
    }

    let itemsHtml = '';
    cachedItems.forEach(item => {
        const safeCode = safeDisplay(item.code), safeName = safeDisplay(item.name);
        const translatedCat = translateDynamic(item.category, 'category');
        const currentQty = hqCartData[item.code] || "";
        
        itemsHtml += `
            <div class="hq-cart-item-row flex justify-between items-center p-4 border-b border-gray-100 hover:bg-red-50/50 transition-colors" data-name="${escapeHtml(safeName.toLowerCase())}">
                <div class="flex flex-col">
                    <span class="text-[13px] font-black text-[var(--premium-charcoal)] font-inter">${safeName}</span>
                    <span class="text-[10px] font-mono font-bold text-gray-500 mt-1">[${safeCode}] ${safeDisplay(translatedCat)}</span>
                </div>
                <input type="number" min="0" max="9999" data-code="${safeCode}" data-name="${safeName}" value="${escapeHtml(currentQty)}" placeholder="0" oninput="if(this.value>9999)this.value=9999" class="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none shadow-inner bg-gray-50 focus:bg-white transition-all">
            </div>`;
    });

    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden premium-shadow flex flex-col max-h-[85vh] transform transition-transform scale-95 duration-300" id="hqCartModalContent">
            <div class="bg-[var(--premium-charcoal)] p-6 text-white flex justify-between items-center"><h2 class="text-lg font-black tracking-widest uppercase flex items-center gap-3 font-montserrat"><span>🛒</span> Digital Procurement Cart</h2><button id="hqCartCloseTopBtn" class="text-gray-400 hover:text-white font-bold text-2xl transition-colors focus:outline-none" type="button">&times;</button></div>
            <div class="p-5 bg-gray-50 border-b border-gray-200"><input type="text" id="hqCartSearchInput" placeholder="Search item name..." class="w-full text-[13px] p-3.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none font-bold text-gray-800 transition-all shadow-sm"></div>
            <div class="p-2 overflow-y-auto flex-grow hide-scrollbar">${itemsHtml}</div>
            <div class="p-6 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.02)]"><span class="text-[11px] font-bold text-gray-500 tracking-widest uppercase font-inter">Enter Quantity & Confirm</span><button id="hqCartConfirmBtn" type="button" class="btn-gradient-pink px-10 py-3.5 rounded-xl font-black shadow-md uppercase tracking-widest text-xs focus:outline-none focus:ring-2 focus:ring-[#E3000F] focus:ring-offset-2">Apply to Order</button></div>
        </div>`;

    modal.querySelector('#hqCartCloseTopBtn')?.addEventListener('click', closeHqCartModal);
    
    modal.querySelector('#hqCartSearchInput')?.addEventListener('input', (e) => {
        clearTimeout(cartSearchTimeout);
        cartSearchTimeout = setTimeout(() => filterHqCart(e.target.value), 200);
    });
    
    modal.querySelector('#hqCartConfirmBtn')?.addEventListener('click', confirmHqCart);
    modal.addEventListener('click', (e) => { if(e.target === modal) closeHqCartModal(); });
    window.addEventListener('keydown', handleCartEsc);

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => document.getElementById('hqCartModalContent')?.classList.remove('scale-95'), 50);
}

function handleCartEsc(e) { if(e.key === "Escape") closeHqCartModal(); }

function closeHqCartModal() {
    const modal = document.getElementById('hqCartModal'), content = document.getElementById('hqCartModalContent');
    if (!modal) return;
    if (content) content.classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');
    window.removeEventListener('keydown', handleCartEsc);
    setTimeout(() => { modal.innerHTML = ''; }, 300);
}

function filterHqCart(query) {
    const term = String(query ?? "").trim().toLowerCase();
    document.querySelectorAll('.hq-cart-item-row').forEach(row => { 
        const name = String(row.getAttribute('data-name') || "");
        row.style.display = name.includes(term) ? 'flex' : 'none'; 
    });
}

function confirmHqCart() {
    const inputs = document.querySelectorAll('.hq-cart-item-row input[type="number"]'); 
    hqCartData = Object.create(null); let formattedStrings = [];

    for (const input of inputs) {
        const qty = parseStrictNonNegativeInteger(input.value); 
        if (qty > 0) { 
            const code = input.getAttribute('data-code') || "", name = input.getAttribute('data-name') || "";
            hqCartData[code] = qty; formattedStrings.push(`[${code}] ${name} x ${qty}`); 
        }
    }
    
    const itemsInput = document.getElementById('hqItemsInput');
    if (itemsInput) {
        itemsInput.value = formattedStrings.join(' / ');
        if (formattedStrings.length > 0) { showToast(`${formattedStrings.length}개의 품목이 전산화되어 카트에 담겼습니다.`, "success"); } else { itemsInput.value = ''; }
    }
    closeHqCartModal();
}

function transformHqInputsToDigital() {
    const regionInput = document.getElementById('hqRegionInput');
    if (regionInput && regionInput.tagName === 'INPUT') {
        const select = document.createElement('select'); select.id = 'hqRegionInput';
        select.className = "w-full text-[13px] p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none text-center cursor-pointer font-black text-gray-800 bg-gray-50 focus:bg-white transition-all appearance-none shadow-sm";
        select.innerHTML = '<option value="">-- Hub --</option><option value="ON">ON (Ontario)</option><option value="BC">BC (British Columbia)</option><option value="AB">AB (Alberta)</option>';
        regionInput.parentNode.replaceChild(select, regionInput);
    }
    const itemsInput = document.getElementById('hqItemsInput');
    if (itemsInput && !itemsInput.dataset.digitalized) { 
        itemsInput.readOnly = true; 
        itemsInput.classList.add('cursor-pointer', 'bg-red-50/50', 'text-[#E3000F]', 'font-bold', 'hover:border-[#E3000F]', 'transition-colors'); 
        itemsInput.addEventListener('click', window.openHqOrderCartModal); 
        itemsInput.dataset.digitalized = "true";
    }
}

window.saveHqOrder = async function() {
  if (isSubmitting || !navigator.onLine) return showToast("시스템이 통신 대기 중입니다.", "error");
  const vendorInput = document.getElementById('hqVendorInput'), regionEl = document.getElementById('hqRegionInput'), itemsEl = document.getElementById('hqItemsInput');
  
  if(!regionEl || !itemsEl) return showToast("품목 및 허브 요소를 찾을 수 없습니다. 시스템 오류", "error");

  const vendorName = vendorInput ? vendorInput.value.trim() : clientName, region = regionEl.value.toUpperCase().trim(), items = itemsEl.value.trim();
  if(!vendorName || !region || !items) return showToast("모든 발주 정보를 기입해 주세요.", "error");
  if(vendorName.length > 50) return showToast("벤더사명이 너무 깁니다.", "error");

  isSubmitting = true; clearTimeout(fallbackLockTimer);
  const btn = document.getElementById('btnSubmitHqOrder'); let originalHtml = "ADD ORDER";
  if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.classList.add('pointer-events-none'); btn.innerHTML = `<span class="animate-pulse">⏳ SAVING...</span>`; }

  fallbackLockTimer = setTimeout(() => {
      isSubmitting = false;
      if (btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalHtml; }
  }, 35000);

  const uniqueBatchId = generateIdempotencyKey();
  const localDate = new Date(), yyyy = localDate.getFullYear(), mm = String(localDate.getMonth() + 1).padStart(2, '0'), dd = String(localDate.getDate()).padStart(2, '0');
  const payload = { id: uniqueBatchId, date: `${yyyy}-${mm}-${dd}`, vendor: vendorName, region: region, items: items, status: "HQ_PENDING", eta: "-" };
  
  try {
    const result = await executeApi("upsert_hq_order", { order: payload });
    if (result && result.success) { showToast("발주가 본사 전산에 등록되었습니다.", "success"); document.getElementById('hqItemsInput').value = ''; hqCartData = Object.create(null); fetchMappings(); }
  } catch (err) { 
      showToast("등록 실패: " + err.message, "error"); 
  } finally { 
      isSubmitting = false; clearTimeout(fallbackLockTimer);
      if (btn) { btn.disabled = false; btn.classList.remove('pointer-events-none'); btn.innerHTML = originalHtml; } 
  }
}

window.updateHqOrderStatus = async function(orderId, status) {
  const safeOrderId = String(orderId || "").trim(), safeStatus = String(status || "").trim().toUpperCase();
  if (!safeOrderId) return showToast("주문 번호가 없습니다.", "error");
  if (!HQ_ORDER_STATUSES.includes(safeStatus)) return showToast("허용되지 않은 주문 상태입니다.", "error");

  try {
    const result = await executeApi("update_hq_order_status", { orderId: safeOrderId, status: safeStatus }); 
    if (result && result.success) { showToast(`Order ${safeOrderId} status updated`, "success"); fetchMappings(); }
  } catch (err) { showToast(err.message, "error"); fetchMappings(); }
}

function populateInboundRegionOptions() {
    const regionSelector = document.getElementById('inboundRegionSelector');
    if (!regionSelector) return;
    
    let regions = ["ON", "BC", "AB", "SK", "MB", "QC"]; 
    
    if (cachedItems && cachedItems.length > 0 && cachedItems[0].stockBreakdown) {
        const dynamicRegions = Object.keys(cachedItems[0].stockBreakdown);
        if (dynamicRegions.length > 0) regions = dynamicRegions;
    }
    
    let currentVal = regionSelector.value;
    let html = `<option value="">-- Select Hub Region for Inbound --</option>`;
    regions.forEach(reg => { html += `<option value="${escapeHtml(reg)}">Hub: ${escapeHtml(reg)}</option>`; });
    
    regionSelector.innerHTML = html;
    if (currentVal && regions.includes(currentVal)) { regionSelector.value = currentVal; }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone'); if(!dropZone) return;
  
  let regionSelector = document.getElementById('inboundRegionSelector');
  if (regionSelector && !document.getElementById('linkedHqOrderId')) {
      const input = document.createElement('input');
      input.type = 'text'; input.id = 'linkedHqOrderId';
      input.placeholder = "Link HQ Order ID (Optional, e.g. REQ-...)";
      input.className = "w-full text-[13px] p-3.5 mt-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] outline-none font-bold text-gray-800 text-center bg-gray-50 focus:bg-white transition-all shadow-sm";
      regionSelector.parentNode.insertBefore(input, regionSelector.nextSibling);
  }

  const clone = dropZone.cloneNode(true); dropZone.parentNode.replaceChild(clone, dropZone);

  clone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); clone.classList.add('bg-red-50/20', 'border-[#E3000F]'); });
  clone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); clone.classList.remove('bg-red-50/20', 'border-[#E3000F]'); });
  clone.addEventListener('drop', (e) => { 
      e.preventDefault(); e.stopPropagation();
      clone.classList.remove('bg-red-50/20', 'border-[#E3000F]'); 
      
      const rs = document.getElementById('inboundRegionSelector');
      if (rs && !rs.value) {
          rs.focus(); rs.classList.add('border-[#E3000F]', 'animate-pulse');
          setTimeout(() => rs.classList.remove('animate-pulse'), 1000);
          showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error"); return;
      }
      handleExcelUpload(e); 
  });
  
  const fileInput = document.getElementById('excelFileInput'); if(fileInput) {
      const fiClone = fileInput.cloneNode(true); fileInput.parentNode.replaceChild(fiClone, fileInput);
      fiClone.addEventListener('change', (e) => {
          const rs = document.getElementById('inboundRegionSelector');
          if (rs && !rs.value) {
              e.target.value = ''; rs.focus(); rs.classList.add('border-[#E3000F]', 'animate-pulse');
              setTimeout(() => rs.classList.remove('animate-pulse'), 1000);
              showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error"); return;
          }
          handleExcelUpload(e);
      });
  }
  
  if (regionSelector) { regionSelector.addEventListener('change', function() { if (this.value) this.classList.remove('border-[#E3000F]'); }); }
}

async function loadHeavyLibrary(url, objName) {
    if (window[objName] !== undefined) return true;
    return new Promise((resolve, reject) => { 
        const script = document.createElement('script'); script.src = url; 
        script.onload = () => resolve(true); script.onerror = () => reject(false); 
        document.head.appendChild(script); 
    });
}

function compressImage(file, maxWidth = 1600, maxHeight = 1600) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image(); img.src = event.target.result;
            img.onload = () => {
                let width = img.width, height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) { height = Math.round((height *= maxWidth / width)); width = maxWidth; } 
                    else { width = Math.round((width *= maxHeight / height)); height = maxHeight; }
                }
                const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => { resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })); }, 'image/jpeg', 0.8); 
            };
            img.onerror = error => resolve(file);
        };
        reader.onerror = error => resolve(file);
    });
}

// ============================================================================
// 🚀 Time-Slicing 비동기 엑셀 파싱 엔진 (Atomic Array Crush 방어 및 XSS 방어)
// ============================================================================
async function handleExcelUpload(event) {
  event.preventDefault();
  if (isSubmitting) return showToast("현재 데이터를 서버로 전송 중입니다. 잠시 기다려주세요.", "error");

  const file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) return showToast("파일 크기가 너무 큽니다. (최대 10MB 지원)", "error");

  isSubmitting = true;
  const validExcelExts = [".xlsx", ".xls", ".csv"], validImgExts = [".png", ".jpg", ".jpeg"], fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (validExcelExts.includes(fileExt)) {
    setUploadStatus(`<span class="animate-pulse text-[#E3000F] font-bold font-inter">Loading Excel Engine...</span>`);
    try { await loadHeavyLibrary("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "XLSX"); } 
    catch(e) { isSubmitting = false; return showToast("엑셀 엔진 로드 실패. 네트워크를 확인하세요.", "error"); }

    setUploadStatus(`<span class="animate-pulse text-[#E3000F] font-bold font-inter">Parsing Excel Document...</span>`);
    const reader = new FileReader();
    
    reader.onerror = () => { isSubmitting = false; setUploadStatus("Drag & Drop vendor document here"); showToast("파일을 읽는 중 시스템 오류가 발생했습니다.", "error"); };
    reader.onload = async function(e) {
      try {
        const data = new Uint8Array(e.target.result), workbook = XLSX.read(data, {type: 'array'}), worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
        if (jsonData.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다."); 
        
        setTimeout(async () => {
            await processExcelData(jsonData, file.name);
        }, 50);
      } catch(err) { isSubmitting = false; showToast("엑셀 파싱 오류: " + err.message, "error"); setUploadStatus("Drag & Drop vendor document here"); }
    };
    reader.readAsArrayBuffer(file);
  } 
  else if (validImgExts.includes(fileExt)) {
    setUploadStatus(`<span class="animate-pulse text-indigo-500 font-bold font-inter">Loading AI OCR Engine...</span>`);
    try { await loadHeavyLibrary("https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js", "Tesseract"); } 
    catch(e) { isSubmitting = false; return showToast("AI 엔진 로드 실패. 네트워크를 확인하세요.", "error"); }

    setUploadStatus(`<span class="animate-pulse text-indigo-500 font-bold font-inter">AI Vision OCR Scanning...</span>`);
    try {
      let targetFile = file; try { targetFile = await compressImage(file); } catch(e) {}
      const result = await Tesseract.recognize(targetFile, 'eng+kor', { logger: m => { if (m.status === 'recognizing text') { const pct = Math.floor(m.progress * 100); setUploadStatus(`<span class="text-indigo-500 font-bold font-inter">AI Vision Parsing: ${pct}%</span>`); } } });
      
      // 🌟 [방어 9] OCR XSS 인젝션 차단을 위한 정규식 클렌징 적용
      const safeText = String(result.data.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      await processOCRText(safeText, file.name);
    } catch(err) { isSubmitting = false; showToast("이미지 인식 실패: " + err.message, "error"); setUploadStatus("Drag & Drop vendor document here"); }
  } else { 
      isSubmitting = false; return showToast("지원하지 않는 포맷입니다. (.xlsx, .xls, .csv, .jpg, .jpeg, .png 지원)", "error"); 
  }
}

async function processOCRText(text, filename) {
  const safeText = String(text || ""); const lines = safeText.split('\n'), jsonData = [];
  lines.forEach(line => {
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/), expDate = dateMatch ? dateMatch[0] : "";
    const barcodeMatch = line.match(/\b\d{13,14}\b/), codeMatch = line.match(/\b[A-Z0-9]{5,15}\b/);
    const itemCode = (codeMatch ? codeMatch[0] : (barcodeMatch ? barcodeMatch[0] : ""));
    let cleanLine = line.replace(/\b\d+(\.\d+)?[KkGgLlMmCc]+\*\d+\b/g, '').replace(/,/g, '');
    let nums = cleanLine.match(/\b\d+\b/g), qty = 0;
    
    if (nums && nums.length > 0) {
      for(let i = nums.length - 1; i >= 0; i--) { 
          const n = parseStrictNonNegativeInteger(nums[i]); 
          if(n !== 0 && n < 10000 && String(n) !== itemCode) { qty = n; break; } 
      }
    }
    if(itemCode && itemCode.length >= 3 && qty > 0) jsonData.push({ "Item#": itemCode, "Qty": qty, "Exp.Date": expDate });
  });

  if (jsonData.length === 0) { isSubmitting = false; showToast("이미지에서 품번 및 수량을 찾지 못했습니다.", "error"); setUploadStatus("Drag & Drop vendor document here"); return; }
  await processExcelData(jsonData, filename + " (OCR)");
}

async function processExcelData(jsonData, filename) {
  const targetRegion = document.getElementById('inboundRegionSelector');
  if (!targetRegion || !targetRegion.value) { isSubmitting = false; showToast("입고될 기준 지역(Hub)을 먼저 선택해 주세요.", "error"); setUploadStatus("Drag & Drop vendor document here"); return; }
  const regionVal = targetRegion.value;
  if (cachedItems.length === 0) { isSubmitting = false; showToast("카탈로그 데이터를 불러오는 중입니다. 잠시 후 시도하세요.", "error"); return; }

  const linkedOrderIdInput = document.getElementById('linkedHqOrderId');
  let finalLinkedOrderId = null;
  if (linkedOrderIdInput && linkedOrderIdInput.value.trim() !== "") {
      finalLinkedOrderId = String(linkedOrderIdInput.value).trim().toUpperCase();
      if (!/^[\w-]+$/.test(finalLinkedOrderId)) {
          isSubmitting = false; setUploadStatus("Drag & Drop vendor document here");
          return showToast("연동할 발주 번호 형식이 올바르지 않습니다.", "error");
      }
  }

  let inboundMap = Object.create(null), successCount = 0, validationErrors = [];

  for (let i = 0; i < jsonData.length; i++) {
    if (i > 0 && i % 200 === 0) {
        await new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));
    }

    const row = jsonData[i];
    let vItemCode = "", vQty = 0, vExp = ""; let qtyMatches = 0;

    Object.keys(row).forEach(k => {
      // 🌟 [방어 4] 엑셀 빈 셀(Empty Cell) TypeError 픽스
      let cleanK = String(k || "").replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '').toLowerCase(), valStr = String(row[k] || "").trim();
      if (cleanK === 'item#' || cleanK === 'itemcode' || cleanK === '품번') vItemCode = valStr;
      if (!vItemCode && cleanK === 'barcode') vItemCode = valStr;
      if (cleanK === 'qty' || cleanK === 'quantity' || cleanK === 'stock' || cleanK === '수량') {
          if (valStr !== "") { 
              qtyMatches++; const parsedQty = parseStrictNonNegativeInteger(valStr);
              if (parsedQty === 0 && valStr !== "0") { validationErrors.push(`[${safeDisplay(vItemCode, "Unknown")}] 수량 형식이 잘못되었습니다: ${escapeHtml(valStr)}`); } 
              else { vQty = parsedQty; }
          }
      }
      if (cleanK === 'exp.date' || cleanK === 'expdate' || cleanK === '유통기한') vExp = valStr;
    });

    if (qtyMatches > 1) { validationErrors.push(`[${safeDisplay(vItemCode, "Unknown")}] 수량 컬럼이 중복 매칭되어 데이터를 덮어쓰는 것을 차단했습니다.`); continue; }

    const expString = String(vExp || "").trim();
    if (expString === "" || expString.toLowerCase() === "null" || expString === "-") { vExp = null; } 
    else { 
        vExp = parseStrictISODate(expString); 
        if (vExp === null) { validationErrors.push(`[${safeDisplay(vItemCode, "Unknown")}] 유통기한 시간역전 감지: ${escapeHtml(expString)}`); continue; }
    }
    
    const safeVItemCode = String(vItemCode || "").trim().toUpperCase();

    if (safeVItemCode.length >= 3 && vQty > 0 && qtyMatches === 1) {
      let hqCode = null, mapObj = cachedMappings.find(m => String(m.vendorCode || "").trim().toUpperCase() === safeVItemCode);
      if (mapObj) { hqCode = mapObj.hqCode; } else { const directMatch = cachedItems.find(item => String(item.code || "").trim().toUpperCase() === safeVItemCode); if (directMatch) hqCode = directMatch.code; }
      
      if (hqCode) {
        const safeHqCode = String(hqCode || "").trim().toUpperCase();
        const directMatch = cachedItems.find(item => String(item.code || "").trim().toUpperCase() === safeHqCode);
        
        if (directMatch && directMatch.expBreakdown && directMatch.expBreakdown[regionVal] !== undefined) {
            if (!vExp) { validationErrors.push(`[${safeHqCode}] ${directMatch.name} 품목의 유통기한이 누락되었습니다.`); continue; }
        }

        if (!inboundMap[safeHqCode]) inboundMap[safeHqCode] = { totalQty: 0, batches: Object.create(null) };
        inboundMap[safeHqCode].totalQty += vQty;
        if (vExp) { inboundMap[safeHqCode].batches[vExp] = (inboundMap[safeHqCode].batches[vExp] || 0) + vQty; }
        successCount++;
      }
    }
  }

  if (validationErrors.length > 0) {
      isSubmitting = false; setUploadStatus("Drag & Drop vendor document here");
      return showToast(`🚨 입고 실패 (데이터 오염 감지):\n\n${validationErrors.join('\n')}`, "error");
  }

  if (successCount === 0) { isSubmitting = false; setUploadStatus("Drag & Drop vendor document here"); showToast("마스터 DB와 매칭되는 품목이 0건입니다.", "error"); return; }

  const finalStockUpdates = Object.keys(inboundMap).map(hqCode => {
    let newExpArr = [], sortedDates = Object.keys(inboundMap[hqCode].batches).sort();
    sortedDates.forEach(d => { newExpArr.push(`${d}:${inboundMap[hqCode].batches[d]}`); });
    return { code: hqCode, stockBreakdown: { [regionVal]: inboundMap[hqCode].totalQty }, expBreakdown: { [regionVal]: newExpArr.join(' | ') } };
  });

  const matchedRowCount = successCount;
  const updatedItemCount = finalStockUpdates.length;

  setUploadStatus(`<span class="animate-pulse text-emerald-600 font-bold font-inter">Synchronizing ${matchedRowCount} Rows (Atomic ADD)...</span>`);
  
  try {
    const result = await executeApi("update_stock", { mode: "ADD", stockUpdates: finalStockUpdates, syncId: generateIdempotencyKey(), linkedOrderId: finalLinkedOrderId }); 
    if (result && result.success) { 
        showToast(`입고 완료: ${updatedItemCount}개 품목 / ${matchedRowCount}개 행 누적 성공`, "success"); 
        setUploadStatus(`<span class="text-emerald-600 font-bold font-inter">✅ Uploaded: ${escapeHtml(filename)}</span>`); 
        setTimeout(() => { location.reload(); }, 1500); 
    } 
  } catch (err) {
    setUploadStatus("Drag & Drop vendor document here");
    if(err.ledgerPending) { 
        showToast(`✅ 재고 입고 반영 완료\n⚠️ 원장 기록 지연: 관리자 확인 필요\n(TX: ${safeDisplay(err.txId || "N/A")})`, "success"); 
        setTimeout(() => { fetchCatalogForInbound(); }, 2500); 
    } else { 
        showToast(err.message, "error"); 
    }
  } finally {
    isSubmitting = false;
  }
}

// 🌟 [방어 2] 글로벌 브라우저 Drag & Drop 하이재킹 차단
window.addEventListener("dragover", function(e) { e.preventDefault(); e.stopPropagation(); }, false);
window.addEventListener("drop", function(e) { e.preventDefault(); e.stopPropagation(); }, false);

window.switchAdminTab = switchAdminTab; window.handleExcelUpload = handleExcelUpload; window.saveHqOrder = saveHqOrder; 

// ============================================================================
// 🌟 시스템 초기화 바인딩
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.changeLanguage(currentLang); applyGlobalRbacNavigation(); setupDragAndDrop(); transformHqInputsToDigital();
  
  if (userRole === "VENDOR") {
      ['tabBtn_profiles', 'tabBtn_sales'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) { btn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none'); btn.innerHTML += ' <span class="text-xs ml-1">🔒</span>'; }
      });
      const hqVendorInput = document.getElementById('hqVendorInput');
      if (hqVendorInput) { hqVendorInput.value = clientName; hqVendorInput.readOnly = true; hqVendorInput.classList.add('bg-gray-100', 'text-[#E3000F]', 'cursor-not-allowed', 'font-black'); }
      switchAdminTab('hqorders'); fetchMappings().then(() => fetchCatalogForInbound()); 
  } else if (userRole === "PARTNER") {
      const adminSection = document.getElementById('section_admin_container') || document.querySelector('.admin-tabs-wrapper');
      if(adminSection) adminSection.style.display = 'none';
      fetchCatalogForInbound();
  } else {
      populateSalesYearSelector(); switchAdminTab('profiles'); fetchMasterData().then(() => fetchMappings()).then(() => fetchCatalogForInbound()); 
  }
});
