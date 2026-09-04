// assets/js/recipes.js

const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해 주세요.");
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
    <div class="col-span-full premium-glass p-16 rounded-[2rem] text-center shadow-lg">
      <div class="flex flex-col items-center justify-center space-y-4">
        <svg class="animate-spin h-10 w-10 text-[#E84C60]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-[13px] font-bold text-gray-400 tracking-wide">Syncing operational recipes from secure database...</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.RECIPES
      })
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Server Raw Response:", responseText);
      throw new Error("서버에서 올바른 JSON 데이터를 반환하지 않았습니다.");
    }

    if (result.success) {
      container.innerHTML = '';
      const recipes = result.recipes || [];

      if (recipes.length === 0) {
        container.innerHTML = `
          <div class="col-span-full premium-glass p-12 rounded-[2rem] text-center text-gray-400 font-bold tracking-wide">
            등록된 조리 레시피가 없습니다. 본사 관리자에게 문의하세요.
          </div>
        `;
        return;
      }

      recipes.forEach(recipe => {
        const card = document.createElement('div');
        // 카드 배경에 premium-glass와 라운딩 적용
        card.className = "premium-glass p-7 sm:p-9 rounded-[2rem] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden";
        
        // 카드 렌더링 HTML (고급화 적용)
        card.innerHTML = `
          <div class="absolute -right-4 -top-4 text-[var(--premium-charcoal)] opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none">
            <svg class="w-40 h-40" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>
          </div>
          
          <div class="relative z-10">
            <div class="flex justify-between items-center mb-5 gap-2">
              <span class="text-[10px] font-black px-3 py-1.5 rounded-full bg-[#E84C60]/10 text-[#E84C60] border border-[#E84C60]/20 uppercase tracking-[0.15em] shadow-sm whitespace-nowrap">
                ${recipe.category || 'Standard'}
              </span>
              <span class="text-[11px] font-mono text-gray-400 font-bold tracking-wider">${recipe.id}</span>
            </div>
            
            <h3 class="text-xl sm:text-2xl font-black text-[var(--premium-charcoal)] mb-6 tracking-tight leading-tight">${recipe.title}</h3>
            
            <div class="space-y-4 mb-6">
              <!-- 재료 섹션 -->
              <div class="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 shadow-inner">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Ingredients & Materials</h4>
                <p class="text-[13px] text-[var(--premium-charcoal)] font-semibold leading-relaxed">${recipe.ingredients || '-'}</p>
              </div>
              
              <!-- 조리 순서 섹션 (핑크 하이라이트) -->
              <div class="bg-[#E84C60]/5 p-5 rounded-2xl border border-[#E84C60]/20 shadow-inner">
                <h4 class="text-[10px] font-black text-[#E84C60] uppercase tracking-[0.2em] mb-2">Step-by-Step Instructions</h4>
                <p class="text-[13px] text-[var(--premium-charcoal)] font-bold leading-relaxed whitespace-pre-line">${recipe.instructions || '-'}</p>
              </div>
            </div>
          </div>

          <!-- 셰프 팁 섹션 (골드 테마) -->
          ${recipe.tips ? `
            <div class="relative z-10 mt-2 pt-4 border-t border-gray-200/60 flex items-start gap-3 bg-[var(--y2c-gold)]/5 p-4 rounded-2xl border border-[var(--y2c-gold)]/30">
              <span class="text-[var(--y2c-gold)] text-lg shrink-0 leading-none mt-0.5">💡</span>
              <div>
                <h4 class="text-[10px] font-black text-[var(--y2c-gold)] uppercase tracking-[0.2em] mb-1">Chef's Tip</h4>
                <p class="text-[12px] text-gray-700 font-bold leading-snug">${recipe.tips}</p>
              </div>
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
      const errorBannerText = document.getElementById('errorBannerText');
      if (errorBannerText) errorBannerText.innerText = error.message;
    }
    container.innerHTML = `
      <div class="col-span-full premium-glass p-12 rounded-[2rem] text-center text-[#E84C60] font-bold tracking-wide shadow-lg border border-[#E84C60]/20">
        Failed to load recipes. Please check connection and retry.
      </div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', fetchRecipes);
