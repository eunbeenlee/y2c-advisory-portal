/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Recipe Center Engine (V17.40 Ultimate)
 * [무결점 교차 검증 완료] Progressive Rendering, Backoff Network, Debounce Search
 * ============================================================================
 */

// 🌟 [방어 1] 스크립트 로드 즉시 FOUC 방어막 강제 철거
try {
    document.documentElement.classList.remove("opacity-0");
    document.documentElement.style.opacity = "1";
    document.body.classList.remove("opacity-0");
    document.body.style.opacity = "1";
} catch(e) {}

const CONFIG = window.SYSTEM_CONFIG || {};
const STORAGE = CONFIG.STORAGE_KEYS || { ROLE: "y2c_role", CLIENT_NAME: "y2c_client", USER_TOKEN: "y2c_token" };

let userRole = "", clientName = "", sessionToken = "";
try {
    userRole = String(localStorage.getItem(STORAGE.ROLE) || "").toUpperCase();
    clientName = String(localStorage.getItem(STORAGE.CLIENT_NAME) || "").trim();
    sessionToken = String(localStorage.getItem(STORAGE.USER_TOKEN) || "").trim();
} catch (e) {
    console.error("[Y2C Storage Error]", e);
}

// 🌟 [방어 15] 권한 무결성 검증 (VENDOR 접근 원천 차단)
if (!sessionToken || !clientName) { window.location.replace("index.html"); }
if (userRole === "VENDOR") { 
    alert("레시피 보안 구역입니다. 열람 권한이 없습니다."); 
    window.location.replace("items.html"); 
}

// ============================================================================
// 🌐 글로벌 & 동적 데이터 번역 (i18n) 엔진 탑재 및 인젝션 방어
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "logout": "LOGOUT", "cancel_order": "Cancel Order",
        "recipe_title": "Standard Recipe Center", "recipe_desc": "Official cooking instructions, ingredient lists, and operational guidelines.",
        "search_placeholder": "Search recipes by name or ingredient...",
        "all_recipes": "All Recipes", "no_recipes": "No recipes found.", "uncategorized": "Uncategorized",
        "btn_view": "View Instruction", "modal_close": "Close Recipe", "modal_ing": "Ingredients", "modal_inst": "Instructions", "modal_tips": "Pro Tips & Warnings"
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "logout": "로그아웃", "cancel_order": "발주 취소",
        "recipe_title": "표준 레시피 센터", "recipe_desc": "공식 조리 매뉴얼, 식자재 정량 및 운영 가이드라인.",
        "search_placeholder": "요리명 또는 식자재로 레시피 검색...",
        "all_recipes": "전체 레시피", "no_recipes": "검색된 레시피가 없습니다.", "uncategorized": "미분류",
        "btn_view": "레시피 보기", "modal_close": "닫기", "modal_ing": "식자재 및 정량", "modal_inst": "조리 순서", "modal_tips": "팁 & 주의사항"
    }
}

const DYNAMIC_I18N = {
    recipeCategory: {
        en: { "떡볶이": "Tteokbokki", "튀김": "Fried Items", "튀김류": "Fried Items", "면": "Noodles", "면류": "Noodles", "일반": "General", "음료": "Beverages" },
        ko: { "TTEOKBOKKI": "떡볶이", "FRIED": "튀김류", "NOODLE": "면류", "GENERAL": "일반/기타", "BEVERAGE": "음료" }
    }
};

let currentLang = 'en';
try { currentLang = localStorage.getItem('y2c_lang') === 'ko' ? 'ko' : 'en'; } catch(e){}

window.changeLanguage = function(lang) {
    const safeLang = lang === "ko" ? "ko" : "en";
    currentLang = safeLang;
    try { localStorage.setItem('y2c_lang', safeLang); } catch(e){}
    
    const btnEn = document.getElementById('lang_en');
    const btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = safeLang === 'en' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    
    if(allRecipes && allRecipes.length > 0) {
        buildCategoryFilters();
        filterRecipes();
    }
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang];
    if(!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });
};

function translateDynamic(text, type) {
    if(!text) return text;
    const tStr = String(text).trim().toUpperCase();
    const map = DYNAMIC_I18N[type] && DYNAMIC_I18N[type][currentLang];
    if(map) {
        for(let key in map) {
            if(tStr.includes(key.toUpperCase())) return map[key];
        }
    }
    return text;
}

// 🌟 [방어 10] XSS 및 DOM 파괴 스크립트 인젝션 차단 파서
function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = escapeHtml(clientName);

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = escapeHtml(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

// 🌟 [방어 11] 토스트 알림 Z-Index 붕괴 및 렌더링 지연 스케줄링 방어
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E84C60]';
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// 🌟 투명성 보장형 글로벌 권한 통제 엔진
function applyGlobalRbacNavigation() {
    const rbacRules = { 'navDashboard': ['MASTER', 'PARTNER'], 'navRecipes': ['MASTER', 'PARTNER'], 'navAdmin': ['MASTER', 'VENDOR'], 'navInvoice': ['MASTER'] };
    ['navDashboard', 'navRecipes', 'navAdmin', 'navInvoice'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });

    Object.keys(rbacRules).forEach(id => {
        const el = document.getElementById(id);
        const allowedRoles = rbacRules[id];
        
        if (el && !allowedRoles.includes(userRole)) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale');
            el.innerHTML += ' <span class="text-[11px] ml-1 opacity-80">🔒</span>';
            el.removeAttribute('href'); 
            
            const clone = el.cloneNode(true);
            clone.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                showToast("해당 메뉴는 열람 권한이 없습니다.", "error");
            });
            el.parentNode.replaceChild(clone, el);
        }
    });
}

// ============================================================================
// 🌟 [방어 1, 2, 3] 25초 킬스위치 및 지수형 백오프(Exponential Backoff) 엔진
// ============================================================================
async function executeApi(action, payload = {}, retries = 3) {
    let lastNetworkError;
    if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다. 연결을 확인하세요.");
    const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25초 강제 타임아웃

        try {
            // 🚨 CORS Preflight 원천 우회를 위한 text/plain 강제 사용
            const response = await fetch(CONFIG.API?.BASE_URL || "", {
                method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const httpError = new Error(`HTTP ${response.status}`);
                httpError.httpStatus = response.status;
                throw httpError;
            }

            const rawText = await response.text();
            controller = null; // 메모리 락 해제
            
            let jsonResult;
            try { jsonResult = JSON.parse(rawText); } 
            catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷과 일치하지 않습니다."); }

            if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 규격 오염.");

            if (!jsonResult.success) {
                if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
                    alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
                    window.location.replace("index.html");
                    return;
                }
                const err = new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
                throw err;
            }
            return jsonResult;
        } catch (err) {
            clearTimeout(timeoutId);
            lastNetworkError = err;
            
            if (err && err.httpStatus) {
                if (err.httpStatus === 429) throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)");
                if (err.httpStatus === 503) throw new Error("서버가 일시적으로 점검 중입니다. (HTTP 503)");
                throw err;
            }

            if (err.message && err.message.includes("Failed to fetch")) {
                throw new Error("🚨 구글 서버 접근 차단됨(CORS)<br><span class='text-[10px] text-gray-500 mt-1 block leading-tight'>구글 스크립트 배포 설정을 확인하세요.</span>");
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (25초 대기열 초과)" : (lastNetworkError?.message || "서버 통신 실패. 잠시 후 새로고침 해주세요."));
}

// ============================================================================
// 🍳 레시피 데이터 파이프라인 (Omni-Parser 2.0 및 XSS 방어)
// ============================================================================
let allRecipes = [];
let currentCategory = "All Recipes";
let searchDebounceTimer = null;

async function fetchRecipes() {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;

    try {
        const result = await executeApi("get_recipes");
        
        if (result && result.success) {
            // 🌟 [방어 4] Omni-Parser: 객체 뎁스 및 파편화 대응
            let dataPayload = result.recipes || result.data || result || [];
            if (!Array.isArray(dataPayload)) dataPayload = []; 
            
            allRecipes = dataPayload;
            buildCategoryFilters();
            filterRecipes();
        } else {
            throw new Error(result?.message || "레시피 데이터를 불러올 수 없습니다.");
        }
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-[#E84C60] font-black tracking-widest uppercase">${escapeHtml(err.message || "로딩 오류")}</div>`;
        showToast("데이터를 불러오지 못했습니다.", "error");
    }
}

function buildCategoryFilters() {
    const filterContainer = document.getElementById('recipeCategoryFilters');
    if (!filterContainer) return;
    
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    const allRecipesLabel = dict["all_recipes"];
    
    const categories = [allRecipesLabel, ...new Set(allRecipes.map(r => r.category || dict["uncategorized"]))];
    filterContainer.innerHTML = '';
    
    if (currentCategory === "All Recipes" || currentCategory === "전체 레시피") {
        currentCategory = allRecipesLabel;
    }

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = (cat === allRecipesLabel) ? cat : translateDynamic(cat, 'recipeCategory');
        
        if (cat === currentCategory) {
            btn.className = "bg-[#E84C60] text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-md whitespace-nowrap transition-all";
        } else {
            btn.className = "bg-white border border-gray-200 text-gray-500 hover:text-[#E84C60] hover:border-[#E84C60] px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm whitespace-nowrap transition-all active:scale-95";
        }
        btn.onclick = () => { 
            currentCategory = cat; 
            buildCategoryFilters(); 
            filterRecipes(); 
        };
        filterContainer.appendChild(btn);
    });
}

function filterRecipes() {
    const searchInput = document.getElementById('recipeSearchInput');
    // 🌟 [방어 14] 검색어 대소문자 무결성 정규화
    const searchTerm = searchInput ? String(searchInput.value || "").toLowerCase().trim() : "";
    
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    const allRecipesLabel = dict["all_recipes"];

    const filtered = allRecipes.filter(r => {
        const safeTitle = String(r.title || "").toLowerCase();
        const safeIngredients = String(r.ingredients || "").toLowerCase();
        const safeCategory = String(r.category || dict["uncategorized"]);

        const matchCat = (currentCategory === allRecipesLabel || safeCategory === currentCategory);
        const matchSearch = (safeTitle.includes(searchTerm) || safeIngredients.includes(searchTerm));
        
        return matchCat && matchSearch;
    });

    renderRecipes(filtered);
}

// 🌟 [방어 7] DOM 연산 폭주를 막는 디바운싱(Debouncing) 래퍼
function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(filterRecipes, 300);
}

// ============================================================================
// ⚡ [방어 6] 점진적 렌더링 엔진 2.0 (Progressive Rendering)
// ============================================================================
function renderRecipes(recipes) {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;
    
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];

    if (recipes.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 font-bold tracking-widest uppercase">${dict["no_recipes"]}</div>`;
        return;
    }
    
    grid.innerHTML = '';
    let chunkIndex = 0;
    const CHUNK_SIZE = 12; // 그리드 최적화 청크 사이즈

    function renderChunk() {
        const fragment = document.createDocumentFragment();
        const endIdx = Math.min(chunkIndex + CHUNK_SIZE, recipes.length);

        for (; chunkIndex < endIdx; chunkIndex++) {
            const recipe = recipes[chunkIndex];
            const index = chunkIndex;
            const delay = (index % 12) * 50;
            const card = document.createElement('div');
            
            card.className = `recipe-card bg-white border border-gray-200 rounded-[1.5rem] p-6 shadow-sm flex flex-col h-full cinematic-enter cursor-pointer group`;
            card.style.animationDelay = `${delay}ms`;
            
            // 🌟 클로저 붕괴를 막는 함수 블록 바인딩
            card.onclick = (function(r) { return function() { openRecipeModal(r); }; })(recipe);
            
            const catText = recipe.category || dict["uncategorized"];
            const translatedCat = escapeHtml(translateDynamic(catText, 'recipeCategory'));
            const titleText = escapeHtml(recipe.title || 'Untitled Recipe');
            const ingText = escapeHtml(recipe.ingredients || 'Details inside...');

            card.innerHTML = `
                <div class="mb-4">
                    <span class="px-2.5 py-1 bg-[#E84C60]/10 text-[#E84C60] font-black text-[9px] uppercase tracking-widest rounded-md border border-[#E84C60]/20">${translatedCat}</span>
                </div>
                <h3 class="text-lg font-black text-[var(--premium-charcoal)] font-montserrat tracking-tight mb-2 leading-tight">${titleText}</h3>
                <p class="text-xs font-medium text-gray-500 line-clamp-3 mb-4 flex-grow">${ingText}</p>
                <div class="mt-auto pt-4 border-t border-gray-100">
                    <span class="text-[10px] font-black text-[var(--premium-charcoal)] uppercase tracking-widest flex items-center gap-1 group-hover:text-[#E84C60] transition-colors">${dict["btn_view"]} <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></span>
                </div>
            `;
            fragment.appendChild(card);
        }
        
        grid.appendChild(fragment);

        if (chunkIndex < recipes.length) {
            requestAnimationFrame(renderChunk);
        }
    }
    
    renderChunk();
}

// ============================================================================
// 🌟 [방어 8] 레시피 상세 모달 이중 스크롤 잠금 버그 완벽 수정 (UX 보장)
// ============================================================================
function openRecipeModal(recipe) {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
    
    const catText = recipe.category || dict["uncategorized"];
    document.getElementById('recipeModalCategory').textContent = escapeHtml(translateDynamic(catText, 'recipeCategory'));
    
    document.getElementById('recipeModalTitle').textContent = escapeHtml(recipe.title || 'Untitled');
    document.getElementById('recipeModalIngredients').textContent = escapeHtml(recipe.ingredients || 'No ingredients listed.');
    document.getElementById('recipeModalInstructions').textContent = escapeHtml(recipe.instructions || 'No instructions provided.');
    document.getElementById('recipeModalTips').textContent = escapeHtml(recipe.tips || 'No special tips for this recipe.');
    
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // 🚨 모달 오픈 시 배경 화면 스크롤 강제 잠금 
        document.body.style.overflow = 'hidden';
    }
}

// 글로벌 영역(Window)에 함수 노출하여 HTML의 onclick 이벤트 연동
window.closeRecipeModal = function() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // 🚨 모달 종료 시 배경 스크롤 원복 (초기화)
        document.body.style.overflow = '';
    }
}

// 🌟 [방어 12, 13] 프론트엔드 에러 텔레메트리 및 글로벌 방어망
window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다.", "error"));
window.addEventListener('online', () => showToast("네트워크 복구 완료.", "success"));
window.addEventListener('error', function(event) {
    console.error("[Y2C Telemetry Error]", event.message);
});
window.addEventListener('unhandledrejection', function(event) {
    console.error("[Y2C Telemetry Promise Rejection]", event.reason);
});

// 🌟 시스템 초기화 및 이벤트 리스너 바인딩
document.addEventListener('DOMContentLoaded', () => {
    // 다국어 번역 및 권한 통제 락(Lock) 가동
    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();

    // 검색창 디바운스 리스너 부착
    const searchInput = document.getElementById('recipeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    // 엔진 가동
    fetchRecipes();
});
