// assets/js/recipes.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); 

if (!sessionToken || !clientName) { window.location.href = "index.html"; }
document.getElementById('userNameDisplay').innerText = clientName;
document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = "index.html"; });

// 🌟 대기업식 자동 주입 토스트 알림
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
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

// 🌟 [엔터프라이즈 기능 1] 재료 목록 자동 뱃지 변환
function formatIngredients(text) {
  if (!text || text.trim() === '-' || text.trim() === '') return '-';
  // 쉼표(,)를 기준으로 잘라서 예쁜 태그 모양으로 렌더링
  const items = text.split(',').map(i => i.trim()).filter(i => i !== '');
  return `<div class="flex flex-wrap gap-2.5 mt-3">` +
    items.map(i => `<span class="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-[12px] sm:text-[13px] font-extrabold text-gray-600 shadow-sm">${i}</span>`).join('') +
    `</div>`;
}

// 🌟 [엔터프라이즈 기능 2] 조리 순서 자동 스텝 UI 변환
function formatInstructions(text) {
  if (!text || text.trim() === '-' || text.trim() === '') return '-';
  
  // 스프레드시트에서 사용자가 줄바꿈을 했든 안 했든 한 줄로 정규화
  let normalized = text.replace(/\n/g, ' ');
  
  // "1. ", "2. " 등 숫자+마침표+공백 패턴을 감지하여 배열로 분할
  let steps = normalized.split(/(?=\b\d+\.\s)/).filter(s => s.trim() !== '');

  // 숫자가 감지되지 않은 단순 줄글인 경우 기본 출력
  if (steps.length <= 1) {
     return `<p class="text-[13px] sm:text-sm text-gray-800 font-bold leading-relaxed whitespace-pre-line tracking-wide mt-2">${text}</p>`;
  }

  // 감지된 스텝들을 고급스러운 리스트 UI로 조립
  let html = '<ul class="space-y-3 mt-4">';
  steps.forEach((step) => {
    let match = step.match(/^(\d+)\.\s(.*)/);
    if (match) {
      html += `
        <li class="flex items-start gap-3.5 bg-white/60 p-3.5 rounded-xl border border-[#E84C60]/15 shadow-sm">
          <span class="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-pink text-white flex items-center justify-center text-[11px] sm:text-[12px] font-black shadow-md mt-0.5">${match[1]}</span>
          <span class="text-[13px] sm:text-[14px] text-gray-800 font-extrabold leading-relaxed tracking-wide pt-0.5 sm:pt-1 break-keep">${match[2]}</span>
        </li>`;
    } else {
      html += `<li class="text-[13px] sm:text-sm text-gray-800 font-bold leading-relaxed tracking-wide">${step}</li>`;
    }
  });
  html += '</ul>';
  return html;
}

async function fetchRecipes() {
  const container = document.getElementById('recipeContainer');
  const errorBanner = document.getElementById('errorBanner');
  if (!container) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  container.innerHTML = `<div class="col-span-full premium-glass p-16 rounded-[2rem] text-center"><div class="flex flex-col items-center justify-center space-y-4"><svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-[13px] font-bold text-gray-400 tracking-wide">Syncing operational recipes...</p></div></div>`;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.RECIPES, token: sessionToken })
    });
    const result = JSON.parse(await response.text());

    if (result.success) {
      container.innerHTML = '';
      const recipes = result.recipes || [];
      if (recipes.length === 0) return container.innerHTML = `<div class="col-span-full premium-glass p-12 rounded-[2rem] text-center text-gray-500 font-bold tracking-wide">등록된 조리 레시피가 없습니다.</div>`;

      recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = "premium-glass p-6 sm:p-8 rounded-[2rem] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300";
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-5">
              <span class="text-[10px] sm:text-[11px] font-black px-3 py-1.5 rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${recipe.category || 'Standard'}</span>
              <span class="text-[11px] font-mono text-gray-400 font-bold tracking-wider">${recipe.id}</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-[var(--premium-charcoal)] mb-6 tracking-tight leading-snug break-keep">${recipe.title}</h3>
            
            <div class="space-y-5 mb-6">
              <div class="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/60">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><span class="text-[14px]">🛒</span> Ingredients & Materials</h4>
                ${formatIngredients(recipe.ingredients)}
              </div>
              
              <div class="bg-[#E84C60]/5 p-5 rounded-2xl border border-[#E84C60]/10">
                <h4 class="text-[10px] font-black text-[#E84C60] uppercase tracking-widest flex items-center gap-1.5"><span class="text-[14px]">👨‍🍳</span> Step-by-Step Instructions</h4>
                ${formatInstructions(recipe.instructions)}
              </div>
            </div>
          </div>
          ${recipe.tips ? `<div class="pt-5 border-t border-gray-100 flex items-start gap-3 bg-[var(--y2c-gold)]/5 p-4 rounded-2xl border border-[var(--y2c-gold)]/20 mt-2 shadow-inner"><span class="text-[var(--y2c-gold)] font-black text-sm shrink-0 mt-0.5">💡 Chef's Tip:</span><p class="text-[12px] sm:text-[13px] text-gray-700 font-black tracking-wide leading-relaxed break-keep">${recipe.tips}</p></div>` : ''}
        `;
        container.appendChild(card);
      });
    } else {
      if (result.message.includes("만료") || result.message.includes("로그인")) {
        alert("보안 세션이 종료되었습니다."); localStorage.clear(); window.location.href = "index.html"; return;
      }
      throw new Error(result.message);
    }
  } catch (error) {
    showToast("레시피 데이터를 불러오지 못했습니다.", "error");
    if (errorBanner) { errorBanner.classList.remove('hidden'); document.getElementById('errorBannerText').innerText = error.message; }
    container.innerHTML = `<div class="col-span-full premium-glass p-12 rounded-[2rem] text-center text-[#E84C60] font-black tracking-wide">Failed to load recipes.</div>`;
  }
}
window.addEventListener('DOMContentLoaded', fetchRecipes);
