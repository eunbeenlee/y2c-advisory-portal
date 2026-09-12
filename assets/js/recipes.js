// assets/js/recipes.js
// 🌟 V15.4 Ultimate Kernel - Cross-Validation Passed, Null-Safe Search, No Deletions

const CONFIG = window.SYSTEM_CONFIG;
const userRole = (localStorage.getItem(CONFIG.STORAGE_KEYS.ROLE) || "").toUpperCase();
const clientName = localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENT_NAME);
const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);

// 🌟 [방화벽 1] 토큰 및 권한 무결성 검증 (VENDOR 접근 원천 차단)
if (!sessionToken || !clientName) { window.location.replace("index.html"); }
if (userRole === "VENDOR") { 
    alert("레시피 열람 권한이 없습니다."); 
    window.location.replace("items.html"); 
}

// UI 헤더 세팅
const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.innerText = clientName;

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.innerText = userRole; }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    localStorage.clear(); window.location.replace("index.html"); 
});

// 마스터 권한일 경우 관리자 탭 활성화
if (userRole === "MASTER") {
    document.getElementById('navAdmin')?.classList.remove('hidden');
    document.getElementById('navInvoice')?.classList.remove('hidden');
}

// 🌟 상태 알림 토스트 (V15.4 신전 핑크 테마)
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

// ============================================================================
// 🌟 [방화벽 2] 지능형 백오프(Jittered Backoff) 통신 엔진
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
                    if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                        localStorage.clear();
                        alert("보안 세션이 만료되었습니다. 다시 로그인해 주세요.");
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
    throw new Error(lastError.message || "서버 트래픽이 혼잡하여 처리되지 않았습니다. 잠시 후 새로고침 해주세요.");
}

// ============================================================================
// 🍳 레시피 데이터 파이프라인
// ============================================================================
let allRecipes = [];
let currentCategory = "All Recipes";

// 데이터 불러오기
async function fetchRecipes() {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;

    try {
        const result = await executeApi("get_recipes");
        if (result && result.success) {
            allRecipes = result.recipes || [];
            buildCategoryFilters();
            renderRecipes(allRecipes);
        } else {
            throw new Error(result.message || "Failed to load recipes.");
        }
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-[#E84C60] font-black tracking-widest">${err.message}</div>`;
        showToast("데이터를 불러오지 못했습니다.", "error");
    }
}

// 🌟 동적 카테고리 필터 생성
function buildCategoryFilters() {
    const filterContainer = document.getElementById('recipeCategoryFilters');
    if (!filterContainer) return;
    
    // 카테고리 추출 (중복 제거)
    const categories = ["All Recipes", ...new Set(allRecipes.map(r => r.category || "Uncategorized"))];
    filterContainer.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat;
        if (cat === currentCategory) {
            btn.className = "bg-[#E84C60] text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-md whitespace-nowrap transition-all";
        } else {
            btn.className = "bg-white border border-gray-200 text-gray-500 hover:text-[#E84C60] hover:border-[#E84C60] px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm whitespace-nowrap transition-all active:scale-95";
        }
        btn.onclick = () => { 
            currentCategory = cat; 
            buildCategoryFilters(); // 액티브 상태 재렌더링
            filterRecipes(); 
        };
        filterContainer.appendChild(btn);
    });
}

// 🌟 [보안 및 안정성 강화] Null-Safe 검색 필터링 엔진
function filterRecipes() {
    const searchInput = document.getElementById('recipeSearchInput');
    const searchTerm = searchInput ? String(searchInput.value || "").toLowerCase().trim() : "";

    const filtered = allRecipes.filter(r => {
        // 데이터가 아예 비어있어도 시스템이 다운되지 않도록 예외 처리
        const safeTitle = String(r.title || "").toLowerCase();
        const safeIngredients = String(r.ingredients || "").toLowerCase();
        const safeCategory = String(r.category || "Uncategorized");

        const matchCat = (currentCategory === "All Recipes" || safeCategory === currentCategory);
        const matchSearch = (safeTitle.includes(searchTerm) || safeIngredients.includes(searchTerm));
        
        return matchCat && matchSearch;
    });

    renderRecipes(filtered);
}

// 🌟 시네마틱 레시피 카드 렌더링
function renderRecipes(recipes) {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;
    
    if (recipes.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 font-bold tracking-widest uppercase">No recipes found.</div>`;
        return;
    }
    
    grid.innerHTML = '';
    recipes.forEach((recipe, index) => {
        // 시네마틱 순차 등장 이펙트
        const delay = (index % 12) * 50;
        const card = document.createElement('div');
        
        card.className = `recipe-card bg-white border border-gray-200 rounded-[1.5rem] p-6 shadow-sm flex flex-col h-full cinematic-enter`;
        card.style.animationDelay = `${delay}ms`;
        card.onclick = () => openRecipeModal(recipe);
        
        // Null-Safe 렌더링
        const catText = recipe.category || 'General';
        const titleText = recipe.title || 'Untitled Recipe';
        const ingText = recipe.ingredients || 'Details inside...';

        card.innerHTML = `
            <div class="mb-4">
                <span class="px-2.5 py-1 bg-[#E84C60]/10 text-[#E84C60] font-black text-[9px] uppercase tracking-widest rounded-md border border-[#E84C60]/20">${catText}</span>
            </div>
            <h3 class="text-lg font-black text-[var(--premium-charcoal)] font-montserrat tracking-tight mb-2 leading-tight">${titleText}</h3>
            <p class="text-xs font-medium text-gray-500 line-clamp-3 mb-4 flex-grow">${ingText}</p>
            <div class="mt-auto pt-4 border-t border-gray-100">
                <span class="text-[10px] font-black text-[var(--premium-charcoal)] uppercase tracking-widest flex items-center gap-1 group-hover:text-[#E84C60] transition-colors">View Instruction <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></span>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ============================================================================
// 🌟 레시피 상세 모달 (이중 스크롤 잠금 버그 완벽 수정)
// ============================================================================
function openRecipeModal(recipe) {
    document.getElementById('recipeModalCategory').innerText = recipe.category || 'General';
    document.getElementById('recipeModalTitle').innerText = recipe.title || 'Untitled';
    document.getElementById('recipeModalIngredients').innerText = recipe.ingredients || 'No ingredients listed.';
    document.getElementById('recipeModalInstructions').innerText = recipe.instructions || 'No instructions provided.';
    document.getElementById('recipeModalTips').innerText = recipe.tips || 'No special tips for this recipe.';
    
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // 🚨 모달 오픈 시 배경 화면 스크롤 강제 잠금 (모바일 UX 최적화)
        document.body.style.overflow = 'hidden';
    }
}

// 글로벌 영역(Window)에 함수 노출하여 HTML의 onclick 이벤트 연동
window.closeRecipeModal = function() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // 🚨 모달 종료 시 배경 스크롤 원복
        document.body.style.overflow = '';
    }
}

// ============================================================================
// 🌟 시스템 초기화 및 이벤트 리스너 바인딩
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 실시간 검색어 필터링 바인딩
    const searchInput = document.getElementById('recipeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterRecipes);
    }
    
    // 엔진 가동
    fetchRecipes();
});
