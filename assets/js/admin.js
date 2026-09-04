// assets/js/admin.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || userRole !== "MASTER") {
  alert("접근 권한이 없습니다. 마스터 계정으로 로그인해주세요.");
  window.location.href = "index.html";
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName || "MASTER";

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

async function fetchMasterData() {
  const tableBody = document.getElementById('masterTableBody');
  const errorBanner = document.getElementById('errorBanner');
  
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="px-6 py-24 text-center">
        <div class="flex flex-col items-center justify-center space-y-4">
          <svg class="animate-spin h-10 w-10 text-[var(--premium-charcoal)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-[13px] font-bold text-gray-400 tracking-wide">Syncing Master_Data from secure database...</p>
        </div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_MASTER })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const responseText = await response.text();
    let result = JSON.parse(responseText);

    if (result.success) {
      tableBody.innerHTML = '';
      const clients = result.clients || [];

      if (clients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;
        return;
      }

      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] focus:ring-2 focus:ring-[#E84C60]/20 focus:bg-white outline-none transition-all shadow-sm";

      clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 transition-colors duration-200";
        // 🌟 버튼에 고유 ID(saveBtn_번호) 부여
        tr.innerHTML = `
          <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${c.name}</td>
          <td class="px-3 py-4 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="${inputClass} text-center" placeholder="e.g. BC"></td>
          <td class="px-3 py-4"><input type="text" id="city_${c.rowIdx}" value="${c.city || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="addr_${c.rowIdx}" value="${c.address || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="attn_${c.rowIdx}" value="${c.attn || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="email_${c.rowIdx}" value="${c.email || ''}" class="${inputClass}"></td>
          <td class="px-3 py-4"><input type="text" id="biz_${c.rowIdx}" value="${c.bizId || ''}" class="${inputClass} font-mono"></td>
          <td class="px-5 py-4 text-center whitespace-nowrap bg-[#E84C60]/5 border-l border-[#E84C60]/10">
            <button id="saveBtn_${c.rowIdx}" onclick="saveClientData(${c.rowIdx})" class="bg-[var(--premium-charcoal)] hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-[11px] tracking-wider cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed">
              SAVE
            </button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    console.error("Master Data Fetch Error:", err);
    if (errorBanner) {
      errorBanner.classList.remove('hidden');
      const errText = document.getElementById('errorBannerText');
      if (errText) errText.innerText = err.message;
    }
    tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-[#E84C60] font-black tracking-wide">Failed to load Master_Data.</td></tr>`;
  }
}

async function saveClientData(rowIdx) {
  // 🌟 [2번 방어 로직] 버튼 비활성화 (Double Submit 방지)
  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "⏳ SAVING...";
    saveBtn.classList.add('animate-pulse');
  }

  const payload = {
    rowIdx: rowIdx,
    state: document.getElementById(`state_${rowIdx}`).value,
    city: document.getElementById(`city_${rowIdx}`).value,
    address: document.getElementById(`addr_${rowIdx}`).value,
    attn: document.getElementById(`attn_${rowIdx}`).value,
    email: document.getElementById(`email_${rowIdx}`).value,
    bizId: document.getElementById(`biz_${rowIdx}`).value
  };

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_MASTER, client: payload })
    });

    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText); } 
    catch(e) { throw new Error("서버 응답 파싱 오류"); }

    if (result.success) {
      // 팝업 없이 부드럽게 UI 상에서 성공 인지 후 새로고침 (사용성 극대화)
      if(saveBtn) {
        saveBtn.innerText = "✅ SAVED";
        saveBtn.classList.remove('animate-pulse');
        saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600');
      }
      setTimeout(() => fetchMasterData(), 1500);
    } else {
      alert("저장 실패: " + result.message);
    }
  } catch (err) {
    console.error("Save Error:", err);
    alert("서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    // 통신이 완전히 종료되면(성공이든 실패든) 버튼 복구
    if (saveBtn && saveBtn.innerText !== "✅ SAVED") {
      saveBtn.disabled = false;
      saveBtn.innerText = "SAVE";
      saveBtn.classList.remove('animate-pulse');
    }
  }
}

window.fetchMasterData = fetchMasterData;
window.saveClientData = saveClientData;
window.addEventListener('DOMContentLoaded', fetchMasterData);
