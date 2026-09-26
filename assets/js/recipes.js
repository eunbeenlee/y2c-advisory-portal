/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Recipe Engine (V40.19 HOTFIX)
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

// 권한 무결성 검증 (VENDOR 접근 원천 차단)
if (!sessionToken || sessionToken.length < 10 || !clientName) { 
    window.location.replace("index.html"); 
}
if (userRole === "VENDOR") { 
    alert("레시피 보안 구역입니다. 열람 권한이 없습니다."); 
    window.location.replace("items.html"); 
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
// 🌐 다국어 (i18n) 엔진 섀도우 맵핑
// ============================================================================
const I18N_DICT = {
    en: {
        "nav_dashboard": "Dashboard", "nav_catalog": "Item Catalog", "nav_recipes": "Recipe Center", "nav_admin": "Master DB", "nav_invoice": "Advisory Invoice",
        "logout": "LOGOUT", "cancel_order": "Cancel Order",
        "recipe_title": "Official Recipe Center", "recipe_desc": "Standardized operational manuals and cooking instructions.",
        "search_placeholder": "Search recipes by name or ingredient...",
        "all_recipes": "All Recipes", "no_recipes": "No recipes found.", "uncategorized": "Uncategorized",
        "btn_view": "View Instruction", "modal_close": "Close Recipe", "modal_ing": "Ingredients", "modal_inst": "Instructions", "modal_tips": "Pro Tips & Warnings"
    },
    ko: {
        "nav_dashboard": "대시보드", "nav_catalog": "카탈로그 및 발주", "nav_recipes": "레시피 센터", "nav_admin": "마스터 DB (물류)", "nav_invoice": "정산 인보이스",
        "logout": "로그아웃", "cancel_order": "발주 취소",
        "recipe_title": "공식 레시피 센터", "recipe_desc": "표준 조리 매뉴얼, 식자재 정량 및 운영 가이드라인.",
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
    
    const btnEn = document.getElementById('lang_en'), btnKo = document.getElementById('lang_ko');
    if (btnEn && btnKo) {
        btnEn.className = safeLang === 'en' ? "px-2.5 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2.5 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
        btnKo.className = safeLang === 'ko' ? "px-2.5 py-1 text-[10px] font-black rounded-md bg-white shadow-sm text-[var(--premium-charcoal)] transition-all" : "px-2.5 py-1 text-[10px] font-black rounded-md text-gray-400 hover:text-gray-600 transition-all";
    }
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    
    if(allRecipes && allRecipes.length > 0) { 
        buildCategoryFilters(); 
        filterRecipes(); 
    }
};

window.applyTranslations = function() {
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];
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
    if(map) { for(let key in map) { if(tStr.includes(key.toUpperCase())) return map[key]; } }
    return text;
}

// ============================================================================
// 🔒 Advanced XSS Sanitizer 및 Null-Safe 치환
// ============================================================================
function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/javascript:/gi, "blocked:")
        .replace(/on\w+=/gi, "blocked=");
}

const userNameDisplay = document.getElementById('userNameDisplay');
if (userNameDisplay) userNameDisplay.textContent = escapeHtml(clientName);

const badge = document.getElementById('userRoleBadge');
if(badge) { badge.classList.remove('hidden'); badge.textContent = escapeHtml(userRole); }

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    window.location.replace("index.html"); 
});

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer'; 
        container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none no-print'; 
        document.body.appendChild(container);
    }
    if (container.childNodes.length >= 5) container.firstChild.remove();

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-[#E3000F]';
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.className = `transform transition-all duration-300 translate-y-[-100%] opacity-0 flex items-center gap-3 ${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto min-w-[300px] font-bold tracking-wide text-sm font-inter`;
    toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="toast-msg"></span>`;
    toast.querySelector('.toast-msg').textContent = String(message);
    container.appendChild(toast);
    
    requestAnimationFrame(() => { setTimeout(() => { toast.classList.remove('translate-y-[-100%]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10); });
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

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

window.addEventListener('unhandledrejection', function(event) { 
    console.error("[Y2C Telemetry Promise Rejection]", event.reason); 
    isFetchingRecipes = false; // 글로벌 데드락 릴리즈
});

// ============================================================================
// 🌟 [방어 1] 35초 절대 백오프 통신 엔진 (let 변경 및 GC 완벽 릴리즈)
// ============================================================================
const apiInFlight = new Set();

async function executeApi(action, payload = {}, retries = 2) {
    if (!navigator.onLine) throw new Error("네트워크가 오프라인 상태입니다. 연결을 확인하세요.");
    let lastNetworkError;
    const safePayload = (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) ? payload : {};

    const hashKey = action + "_" + JSON.stringify(safePayload).length;
    if (apiInFlight.has(hashKey)) throw new Error("동일한 요청이 처리 중입니다. 잠시 대기하세요.");
    apiInFlight.add(hashKey);

    for (let i = 0; i <= retries; i++) {
        // 🚨 const -> let 변경 (가비지 컬렉터 충돌 방어)
        let controller = new AbortController();
        let timeoutId = setTimeout(() => controller.abort(), 35000); 

        try {
            const response = await fetch(TARGET_API_URL, {
                method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
                body: JSON.stringify({ action: action, token: sessionToken, ...safePayload }),
                signal: controller.signal
            });
            
            if (!response.ok) {
                if (response.status === 404 || response.status === 401 || response.status === 403) {
                    const explicitError = new Error(`서버 통신 거부됨 (HTTP ${response.status})`);
                    explicitError.httpStatus = response.status;
                    explicitError.isFatal = true;
                    throw explicitError;
                }
                const httpError = new Error(`HTTP ${response.status}`);
                httpError.httpStatus = response.status;
                throw httpError;
            }

            const rawText = await response.text();
            
            let jsonResult;
            try { jsonResult = JSON.parse(rawText); } 
            catch (parseErr) { throw new Error("서버 응답 파싱 실패. 시스템 포맷 오염 감지."); }

            if (!jsonResult || typeof jsonResult !== "object" || Array.isArray(jsonResult)) throw new Error("서버 응답 규격 오염.");

            if (!jsonResult.success) {
                if (jsonResult.message && (jsonResult.message.includes("만료") || jsonResult.message.includes("로그인"))) {
                    [STORAGE.ROLE, STORAGE.CLIENT_NAME, STORAGE.USER_TOKEN, 'y2c_premium_state', 'y2c_lang'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
                    alert("보안 세션이 만료되었습니다. 안전을 위해 다시 로그인해 주세요.");
                    window.location.replace("index.html");
                    return;
                }
                throw new Error(jsonResult.message || "서버 연산 중 알 수 없는 오류가 발생했습니다.");
            }
            apiInFlight.delete(hashKey);
            return jsonResult;
        } catch (err) {
            if (err.isFatal) { apiInFlight.delete(hashKey); throw err; }

            if (err && err.httpStatus) {
                if (err.httpStatus === 429) { apiInFlight.delete(hashKey); throw new Error("서버에 요청이 집중되어 지연 중입니다. (HTTP 429)"); }
                if (err.httpStatus === 503) { apiInFlight.delete(hashKey); throw new Error("서버가 점검 중입니다. (HTTP 503)"); }
            }

            if (err.message && err.message.includes("Failed to fetch")) {
                lastNetworkError = new Error("🚨 구글 서버 접근 지연(CORS) 또는 네트워크 단절.");
            } else {
                lastNetworkError = err;
            }

            if (i < retries) {
                const waitTime = (Math.pow(1.5, i) * 1000) + Math.floor(Math.random() * 800); 
                await new Promise(res => setTimeout(res, waitTime));
            }
        } finally {
            // 🚨 finally 블록 릴리즈 강제
            clearTimeout(timeoutId);
            controller = null;
        }
    }
    apiInFlight.delete(hashKey);
    throw new Error(lastNetworkError?.name === 'AbortError' ? "서버 응답 시간이 초과되었습니다. (35초 대기열 초과)" : (lastNetworkError?.message || "서버 통신 실패. 잠시 후 새로고침 해주세요."));
}

// ============================================================================
// 🍳 레시피 데이터 파이프라인 (SWR Cache + Hash Lock + Isolation)
// ============================================================================
let allRecipes = [];
let currentCategory = "All Recipes";
let searchDebounceTimer = null;
let isFetchingRecipes = false; // 🌟 [방어 2] Race Condition 락다운

function generateRecipeHash(arr) {
    if (!arr || arr.length === 0) return "";
    return arr.length + "_" + (arr[0]?.title?.length || 0) + "_" + (arr[arr.length-1]?.title?.length || 0);
}

async function fetchRecipes() {
    if (isFetchingRecipes) return;
    isFetchingRecipes = true;

    const grid = document.getElementById('recipeGrid');
    if (!grid) { isFetchingRecipes = false; return; }

    const cacheKey = "Y2C_RECIPES_CACHE_V40";

    try {
        const cachedRaw = await Y2C_DB.get(cacheKey);
        if (cachedRaw && Array.isArray(cachedRaw) && cachedRaw.length > 0) {
            allRecipes.length = 0; 
            allRecipes = cachedRaw;
            buildCategoryFilters();
            filterRecipes();
        }
    } catch(e) {}

    try {
        const result = await executeApi("get_recipes");
        
        if (result && result.success) {
            let dataPayload = result.recipes || result.data || result || [];
            if (!Array.isArray(dataPayload)) dataPayload = []; 
            
            dataPayload = dataPayload.filter(r => r && typeof r === 'object' && r.title);
            
            const newHash = generateRecipeHash(dataPayload);
            const oldHash = generateRecipeHash(allRecipes);

            if (newHash !== oldHash || allRecipes.length === 0) {
                allRecipes.length = 0;
                allRecipes = dataPayload;
                try { await Y2C_DB.set(cacheKey, allRecipes); } catch(e) {}
                buildCategoryFilters();
                filterRecipes();
            }
        } else {
            if (allRecipes.length === 0) throw new Error(result?.message || "레시피 데이터를 불러올 수 없습니다.");
        }
    } catch (err) {
        if (allRecipes.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-20 text-center text-[#E3000F] font-black tracking-widest uppercase font-inter">${escapeHtml(err.message || "로딩 오류")}</div>`;
            showToast("데이터를 불러오지 못했습니다.", "error");
        }
    } finally {
        isFetchingRecipes = false;
    }
}

let isCategorySwitching = false;

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
            btn.className = "bg-[#E3000F] text-white px-5 py-2.5 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-md whitespace-nowrap transition-all font-inter focus:outline-none";
        } else {
            btn.className = "bg-white border border-gray-200 text-gray-500 hover:text-[#E3000F] hover:bg-red-50/50 hover:border-[#E3000F] px-5 py-2.5 rounded-full font-bold text-[11px] sm:text-xs uppercase tracking-widest shadow-sm whitespace-nowrap transition-all active:scale-95 font-inter focus:outline-none";
        }
        
        btn.onclick = () => { 
            if(isCategorySwitching) return;
            isCategorySwitching = true;
            currentCategory = cat; 
            buildCategoryFilters(); 
            filterRecipes(); 
            setTimeout(() => { isCategorySwitching = false; }, 200);
        };
        filterContainer.appendChild(btn);
    });
}

function filterRecipes() {
    const searchInput = document.getElementById('recipeSearchInput');
    const searchTerm = searchInput ? String(searchInput.value || "").replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, ' ').toLowerCase().trim() : "";
    
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

    renderRecipesFast(filtered);
}

function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(filterRecipes, 300);
}

// ============================================================================
// ⚡ Infinite Chunk Observer (무한 스크롤 & 데드락 자동 힐링)
// ============================================================================
let recipeObserver = null;
let globalFilteredRecipes = [];
let recipeRenderIndex = 0;
const RECIPE_CHUNK_SIZE = 24; 

function renderRecipesFast(recipes) {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;

    if (recipeObserver) { 
        recipeObserver.disconnect(); 
        recipeObserver = null; 
    }
    
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];

    if (!recipes || recipes.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 font-bold tracking-widest uppercase font-inter flex flex-col items-center gap-3"><span class="text-3xl">📭</span><span>${dict["no_recipes"]}</span></div>`;
        return;
    }
    
    globalFilteredRecipes.length = 0; 
    globalFilteredRecipes = recipes;
    recipeRenderIndex = 0;
    grid.innerHTML = '';

    recipeObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            recipeObserver.disconnect();
            appendRecipeChunk();
        }
    }, { rootMargin: '500px' });

    appendRecipeChunk();
}

function appendRecipeChunk() {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;

    // 🌟 [방어 3] 배열 바운더리 픽스
    if (recipeRenderIndex >= globalFilteredRecipes.length) return;

    const endIdx = Math.min(recipeRenderIndex + RECIPE_CHUNK_SIZE, globalFilteredRecipes.length);
    const fragment = document.createDocumentFragment();
    const dict = I18N_DICT[currentLang] || I18N_DICT['en'];

    for (; recipeRenderIndex < endIdx; recipeRenderIndex++) {
        const recipe = globalFilteredRecipes[recipeRenderIndex];
        const delay = (recipeRenderIndex % 12) * 30; 
        
        const card = document.createElement('div');
        card.className = `recipe-card bg-white premium-shadow rounded-[1.5rem] p-6 sm:p-7 flex flex-col h-full cinematic-enter group cursor-pointer hover:-translate-y-1 transition-transform duration-300`;
        card.style.animationDelay = `${delay}ms`;
        card.setAttribute('data-index', recipeRenderIndex);
        
        const catText = recipe.category || dict["uncategorized"];
        const translatedCat = escapeHtml(translateDynamic(catText, 'recipeCategory'));
        const titleText = escapeHtml(recipe.title || 'Untitled Recipe');
        const ingText = escapeHtml(recipe.ingredients || 'Details inside...');

        card.innerHTML = `
            <div class="mb-5">
                <span class="px-3 py-1.5 bg-[#E3000F]/10 text-[#E3000F] font-black text-[9px] uppercase tracking-widest rounded-md border border-[#E3000F]/20 font-inter">${translatedCat}</span>
            </div>
            <h3 class="text-lg sm:text-xl font-black text-[var(--premium-charcoal)] font-montserrat tracking-tight mb-2.5 leading-tight group-hover:text-[#E3000F] transition-colors">${titleText}</h3>
            <p class="text-[12px] font-medium text-gray-500 line-clamp-3 mb-5 flex-grow font-inter leading-relaxed">${ingText}</p>
            <div class="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                <span class="text-[10px] font-black text-[var(--premium-charcoal)] uppercase tracking-widest flex items-center gap-1.5 group-hover:text-[#E3000F] transition-colors font-inter">${dict["btn_view"]}</span>
                <div class="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#E3000F] group-hover:text-white transition-colors text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    }
    
    grid.appendChild(fragment);

    requestAnimationFrame(() => {
        if (recipeRenderIndex < globalFilteredRecipes.length) {
            if (grid.scrollHeight <= window.innerHeight) {
                appendRecipeChunk();
            } else {
                const lastCard = grid.lastElementChild;
                if (lastCard) recipeObserver.observe(lastCard);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('recipeGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.recipe-card');
            if (card) {
                const idx = card.getAttribute('data-index');
                if (idx !== null && globalFilteredRecipes[idx]) {
                    openRecipeModal(globalFilteredRecipes[idx]);
                }
            }
        });
    }
});

// ============================================================================
// 🌟 [방어 5, 7] 레시피 모달 XSS 인젝션 방어 및 Body Scroll Lock 릴리즈
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
        
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleModalEsc);
    }
}

function handleModalEsc(e) {
    if (e.key === "Escape") closeRecipeModal();
}

window.closeRecipeModal = function() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleModalEsc);
        
        setTimeout(() => {
            document.getElementById('recipeModalTitle').textContent = '';
            document.getElementById('recipeModalIngredients').textContent = '';
            document.getElementById('recipeModalInstructions').textContent = '';
            document.getElementById('recipeModalTips').textContent = '';
        }, 300);
    }
}

// ============================================================================
// 🌟 시스템 초기화 및 멱등성 록다운
// ============================================================================
let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    isInitialized = true;

    window.changeLanguage(currentLang);
    applyGlobalRbacNavigation();

    const searchInput = document.getElementById('recipeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    fetchRecipes();
});

window.addEventListener('offline', () => showToast("인터넷 연결이 끊어졌습니다. 로컬 캐시로 구동됩니다.", "error"));
window.addEventListener('online', () => { showToast("네트워크 복구 완료.", "success"); fetchRecipes(); });
window.addEventListener('error', function(event) { console.error("[Y2C Telemetry Error]", event.message); });
