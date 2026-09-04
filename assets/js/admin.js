// assets/js/admin.js

// 1. 마스터 권한 보안 검증
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || userRole !== "MASTER") {
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

// 2. 🌟 구글 스프레드시트 Master_Data 불러오기
async function fetchMasterData() {
  const tableBody = document.getElementById('masterTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-16 text-center text-gray-500 font-bold">Loading Master_Data from Google Sheets...</td></tr>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.GET_MASTER })
    });

    const responseText = await response.text();
    let result = JSON.parse(responseText);

    if (result.success) {
      tableBody.innerHTML = '';
      const clients = result.clients || [];

      if (clients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500">등록된 가맹점 정보가 없습니다.</td></tr>`;
        return;
      }

      clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-red-50/30 transition";
        tr.innerHTML = `
          <td class="px-4 py-3 font-extrabold text-gray-900 whitespace-nowrap">${c.name}</td>
          <td class="px-4 py-3 text-center"><input type="text" id="state_${c.rowIdx}" value="${c.state || ''}" class="w-16 border rounded px-2 py-1 text-center font-bold"></td>
          <td class="px-4 py-3"><input type="text" id="city_${c.rowIdx}" value="${c.city || ''}" class="w-24 border rounded px-2 py-1"></td>
          <td class="px-4 py-3"><input type="text" id="addr_${c.rowIdx}" value="${c.address || ''}" class="w-48 border rounded px-2 py-1"></td>
          <td class="px-4 py-3"><input type="text" id="attn_${c.rowIdx}" value="${c.attn || ''}" class="w-28 border rounded px-2 py-1"></td>
          <td class="px-4 py-3"><input type="text" id="email_${c.rowIdx}" value="${c.email || ''}" class="w-40 border rounded px-2 py-1"></td>
          <td class="px-4 py-3"><input type="text" id="biz_${c.rowIdx}" value="${c.bizId || ''}" class="w-24 border rounded px-2 py-1 font-mono"></td>
          <td class="px-4 py-3 text-center whitespace-nowrap">
            <button onclick="saveClientData(${c.rowIdx})" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded shadow text-xs transition cursor-pointer">
              Save
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
    tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-red-500 font-bold">Failed to load Master_Data.</td></tr>`;
  }
}

// 3. 🌟 수정된 가맹점 정보를 구글 스프레드시트에 실시간 저장
async function saveClientData(rowIdx) {
  const payload = {
    rowIdx: rowIdx,
    state: document.getElementById(`state_${rowIdx}`).value,
    city: document.getElementById(`city_${rowIdx}`).value,
    address: document.getElementById(`addr_${rowIdx}`).value,
    attn: document.getElementById(`attn_${rowIdx}`).value,
    email: document.getElementById(`email_${rowIdx}`).value,
    bizId: document.getElementById(`biz_${rowIdx}`).value
  };

  if (!confirm(`Row #${rowIdx} 가맹점 정보를 구글 스프레드시트에 반영하시겠습니까?`)) return;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.UPDATE_MASTER,
        client: payload
      })
    });

    const responseText = await response.text();
    let result = JSON.parse(responseText);

    if (result.success) {
      alert("✅ 성공적으로 스프레드시트에 반영되었습니다!");
      fetchMasterData();
    } else {
      alert("저장 실패: " + result.message);
    }
  } catch (err) {
    console.error("Save Error:", err);
    alert("서버 통신 중 오류가 발생했습니다.");
  }
}

window.saveClientData = saveClientData;
window.addEventListener('DOMContentLoaded', fetchMasterData);
