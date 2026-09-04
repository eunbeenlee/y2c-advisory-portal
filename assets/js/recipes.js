// assets/js/recipes.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN); // 🌟 보안 토큰 확인

// 토큰이 없거나 세션이 만료된 경우 튕겨냄
if (!sessionToken || !clientName) {
  alert("보안 세션이 만료되었습니다. 다시 로그인 해 주세요.");
  window.location.href = "index.html";
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName;

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

async function fetchRecipes() {
  const container = document.getElementById('recipeContainer');
  const errorBanner = document.getElementById('errorBanner');
  
  if (!container) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  container.innerHTML = `
    <div class="col-span-full premium-glass p-16 rounded-[2rem] text-center">
      <div class="flex flex-col items-center justify-center space-y-4">
        <svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-[13px] font-bold text-gray-400 tracking-wide">Syncing operational recipes...</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      // 🌟 서버로 요청할 때 반드시 토큰(sessionToken)을 동봉
      body: JSON.stringify({ action: SYSTEM_CONFIG.API.ENDPOINTS.RECIPES, token: sessionToken })
    });

    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText); } 
    catch(e) { throw new Error("서버 통신 오류 (CORS/권한 확인)"); }

    if (result.success) {
      container.innerHTML = '';
      const recipes = result.recipes || [];

      if (recipes.length === 0) {
        container.innerHTML = `<div class="col-span-full premium-glass p-12 rounded-[2rem] text-center text-gray-500 font-bold tracking-wide">등록된 조리 레시피가 없습니다. 본사 관리자에게 문의하세요.</div>`;
        return;
      }

      recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = "premium-glass p-6 sm:p-8 rounded-[2rem] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300";
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-5">
              <span class="text-[10px] sm:text-[11px] font-black px-3 py-1.5 rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm">${recipe.category || 'Standard'}</span>
              <span class="text-[11px] font-mono text-gray-400 font-bold tracking-wider">${recipe.id}</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-[var(--premium-charcoal)] mb-6 tracking-tight leading-snug">${recipe.title}</h3>
            
            <div class="space-y-4 mb-6">
              <div class="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/60">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><span class="text-[13px]">🛒</span> Ingredients & Materials</h4>
                <p class="text-[13px] sm:text-sm text-gray-700 font-bold leading-relaxed tracking-wide">${recipe.ingredients || '-'}</p>
              </div>
              <div class="bg-[#E84C60]/5 p-5 rounded-2xl border border-[#E84C60]/10">
                <h4 class="text-[10px] font-black text-[#E84C60] uppercase tracking-widest mb-2 flex items-center gap-1.5"><span class="text-[13px]">👨‍🍳</span> Step-by-Step Instructions</h4>
                <p class="text-[13px] sm:text-sm text-gray-800 font-bold leading-relaxed whitespace-pre-line tracking-wide">${recipe.instructions || '-'}</p>
              </div>
            </div>
          </div>
          ${recipe.tips ? `
            <div class="pt-5 border-t border-gray-100 flex items-start gap-3 bg-[var(--y2c-gold)]/5 p-4 rounded-2xl border border-[var(--y2c-gold)]/20 mt-2 shadow-inner">
              <span class="text-[var(--y2c-gold)] font-black text-sm shrink-0 mt-0.5">💡 Chef's Tip:</span>
              <p class="text-[12px] sm:text-[13px] text-gray-700 font-black tracking-wide leading-relaxed">${recipe.tips}</p>
            </div>
          ` : ''}
        `;
        container.appendChild(card);
      });

    } else {
      throw new Error(result.message || "레시피를 불러오지 못했습니다.");
    }
  } catch (error) {
    console.error("Recipe Fetch Error:", error);
    if (errorBanner) {
      errorBanner.classList.remove('hidden');
      const errText = document.getElementById('errorBannerText');
      if (errText) errText.innerText = error.message;
    }
    container.innerHTML = `<div class="col-span-full premium-glass p-12 rounded-[2rem] text-center text-[#E84C60] font-black tracking-wide">Failed to load recipes. Please check connection and retry.</div>`;
  }
}

window.addEventListener('DOMContentLoaded', fetchRecipes);
