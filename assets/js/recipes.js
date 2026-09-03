// assets/js/recipes.js

// 1. 세션 검증
const userRole = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE);
const clientName = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME);

if (!userRole || !clientName) {
  alert("세션이 만료되었습니다. 다시 로그인 해 주세요.");
  window.location.href = "index.html";
}

if (userRole === "MASTER") {
  const navInvoice = document.getElementById('navInvoice');
  if (navInvoice) navInvoice.classList.remove('hidden');
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

// 2. 🌟 서버에서 레시피 데이터를 안전하게 불러와 카드 형태로 렌더링
async function fetchRecipes() {
  const container = document.getElementById('recipeContainer');
  const errorBanner = document.getElementById('errorBanner');
  
  if (!container) return;
  if (errorBanner) errorBanner.classList.add('hidden');

  container.innerHTML = `
    <div class="col-span-full glass-card p-16 rounded-3xl text-center shadow-2xl">
      <div class="flex flex-col items-center justify-center space-y-3">
        <svg class="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-sm font-bold text-gray-500">Loading operational recipes from secure database...</p>
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
          <div class="col-span-full glass-card p-12 rounded-3xl text-center text-gray-500 font-medium">
            등록된 조리 레시피가 없습니다. 본사 관리자에게 문의하세요.
          </div>
        `;
        return;
      }

      recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = "glass-card p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-100 flex flex-col justify-between";
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-4">
              <span class="text-xs font-black px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 uppercase">
                ${recipe.category || 'Standard'}
              </span>
              <span class="text-xs font-mono text-gray-400 font-bold">${recipe.id}</span>
            </div>
            
            <h3 class="text-xl font-black text-gray-900 mb-4 tracking-tight">${recipe.title}</h3>
            
            <div class="space-y-4 mb-6">
              <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200/60">
                <h4 class="text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Ingredients & Materials</h4>
                <p class="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">${recipe.ingredients || '-'}</p>
              </div>
              
              <div class="bg-red-50/40 p-4 rounded-2xl border border-red-100">
                <h4 class="text-xs font-black text-red-700 uppercase tracking-wider mb-1">Step-by-Step Instructions</h4>
                <p class="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-line">${recipe.instructions || '-'}</p>
              </div>
            </div>
          </div>

          ${recipe.tips ? `
            <div class="pt-4 border-t border-gray-100 flex items-start gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 mt-4">
              <span class="text-amber-600 font-bold shrink-0">💡 Chef's Tip:</span>
              <p class="text-xs text-amber-900 font-medium">${recipe.tips}</p>
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
      <div class="col-span-full glass-card p-12 rounded-3xl text-center text-red-500 font-bold">
        Failed to load recipes. Please check connection and retry.
      </div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', fetchRecipes);
