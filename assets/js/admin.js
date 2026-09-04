const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); // 🌟

if (!sessionToken || userRole !== "MASTER") {
  alert("접근 권한이 없습니다. 마스터 계정으로 로그인해주세요.");
  window.location.href = "index.html";
}

document.getElementById('userNameDisplay').innerText = clientName || "MASTER";
document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = "index.html"; });

async function fetchMasterData() {
  const tableBody = document.getElementById('masterTableBody');
  const errorBanner = document.getElementById('errorBanner');
  if (!tableBody) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_MASTER, token: sessionToken }) // 🌟
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      tableBody.innerHTML = '';
      const clients = result.clients || [];
      if (clients.length === 0) return tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500 font-bold tracking-wide">등록된 가맹점 정보가 없습니다.</td></tr>`;

      const inputClass = "w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2 text-[12px] sm:text-[13px] font-bold text-gray-800 focus:border-[#E84C60] outline-none shadow-sm";

      clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 transition-colors duration-200";
        tr.innerHTML = `
          <td class="px-5 py-4 font-black text-[var(--premium-charcoal)] whitespace-nowrap tracking-tight">${c.name}</td>
          <td class="px-3 py-4 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="${inputClass} text-center"></td>
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
    } else { throw new Error(result.message); }
  } catch (err) {
    if (errorBanner) { errorBanner.classList.remove('hidden'); document.getElementById('errorBannerText').innerText = err.message; }
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-[#E84C60] font-black tracking-wide py-12">Failed to load data.</td></tr>`;
  }
}

async function saveClientData(rowIdx) {
  // 🌟 [2번 방어] 더블 서밋 방지
  const saveBtn = document.getElementById(`saveBtn_${rowIdx}`);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "⏳ SAVING...";
    saveBtn.classList.add('animate-pulse');
  }

  const payload = {
    rowIdx: rowIdx, state: document.getElementById(`state_${rowIdx}`).value, city: document.getElementById(`city_${rowIdx}`).value,
    address: document.getElementById(`addr_${rowIdx}`).value, attn: document.getElementById(`attn_${rowIdx}`).value,
    email: document.getElementById(`email_${rowIdx}`).value, bizId: document.getElementById(`biz_${rowIdx}`).value
  };

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      // 🌟 토큰 동봉
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_MASTER, token: sessionToken, client: payload }) 
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      if(saveBtn) { saveBtn.innerText = "✅ SAVED"; saveBtn.classList.remove('animate-pulse'); saveBtn.classList.replace('bg-[var(--premium-charcoal)]', 'bg-emerald-600'); }
      setTimeout(() => fetchMasterData(), 1500);
    } else { alert("저장 실패: " + result.message); }
  } catch (err) { alert("통신 중 오류가 발생했습니다.");
  } finally {
    if (saveBtn && saveBtn.innerText !== "✅ SAVED") { saveBtn.disabled = false; saveBtn.innerText = "SAVE"; saveBtn.classList.remove('animate-pulse'); }
  }
}
window.fetchMasterData = fetchMasterData; window.saveClientData = saveClientData; window.addEventListener('DOMContentLoaded', fetchMasterData);
