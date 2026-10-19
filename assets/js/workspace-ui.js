/* Presentation only: uses existing visible navigation. Never fetches or writes business data. */
(function(w){
 'use strict';
 const d=document,byId=id=>id?d.getElementById(id):null,lang=()=>{try{return localStorage.getItem('y2c_lang')==='ko'?'ko':'en';}catch(_){return 'en';}},t=(ko,en)=>lang()==='ko'?ko:en;
 const el=(tag,text,cls)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const paths={orders:'M7 3h10v3h3v15H4V6h3 M8 3v5h8V3 M8 12h8 M8 16h5',catalog:'M3 7l9-4 9 4v10l-9 4-9-4V7 M3 7l9 4 9-4 M12 11v10 M8 5l9 4',monitor:'M4 4h16v12H4z M8 21h8 M12 16v5 M7 12l3-3 3 2 4-4',recipes:'M12 5C8 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-5-1-9 1v15',inbound:'M4 12v8h16v-8 M12 3v12 M7 10l5 5 5-5',factory:'M3 21V9l6 3V7l6 3V3h5v18z M6 16h2 M11 16h2 M16 16h2',search:'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',sales:'M4 20V4 M4 20h17 M8 16v-5 M13 16V7 M18 16V3'};
 function icon(name){const n=d.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('fill','none');n.setAttribute('stroke','currentColor');n.setAttribute('stroke-width','1.6');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');n.setAttribute('aria-hidden','true');n.setAttribute('focusable','false');n.setAttribute('class','workspace-icon');const p=d.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',paths[name]||paths.catalog);n.append(p);return n;}
 function artwork(){const n=d.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 140 80');n.setAttribute('class','workspace-art');n.setAttribute('fill','none');n.setAttribute('aria-hidden','true');n.setAttribute('focusable','false');for(const [path,color,width] of [['M10 70h120','#dfe5ec','2'],['M28 68V30L70 10l42 20v38 M28 30h84 M40 68V40h60v28 M58 40v28 M82 40v28','currentColor','2'],['M48 20l22 11 22-11 M59 10v10 M81 10v10','#e9a8b4','2'],['M17 54h28v16H17z M28 54v6 M97 52h24v18H97z M109 52v6','#586779','2']]){const p=d.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',path);p.setAttribute('stroke',color);p.setAttribute('stroke-width',width);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');n.append(p);}return n;}
 function visible(n){return !!n&&!n.hidden&&!n.classList.contains('hidden')&&n.getAttribute('aria-hidden')!=='true';}
 function jump(n){if(!n)return;if(!/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(n.tagName))n.tabIndex=-1;n.scrollIntoView({block:'start',behavior:'instant'});n.focus({preventScroll:true});}
 function boot(){
  const main=d.querySelector('main');if(!main)return;
  const page=location.pathname.split('/').pop()||'index.html';
  if(page==='index.html'){
   const intro=d.querySelector('.portal-login-intro');if(intro&&!byId('workspaceLoginArt')){const art=el('div',undefined,'workspace-login-art');art.id='workspaceLoginArt';const text=el('p');const label=()=>text.textContent=t('주문부터 입고까지, 연결된 파트너 업무 공간','One workspace for orders, stock and partner operations');label();art.append(text,artwork());intro.append(art);d.addEventListener('y2c-language-changed',label);}
  }
  const titles={'dashboard.html':['업무 현황','Workspace overview','주문 진행과 매장 운영을 한곳에서 확인하세요.','Follow orders and store activity in one place.'],'admin.html':['주문 · 공급 관리','Orders & supply','가맹점 발주, 입고, 공장 발주 공유를 관리하세요.','Manage franchise orders, stock receipts and factory order sharing.']};
  const destinations=[
   {key:'orders',name:['발주 내역','Orders'],note:['진행 · 취소 · 수령','Progress · cancellations · receipt'],source:['navAdmin','navDashboard'],target:'orderHistorySection'},
   {key:'catalog',name:['상품 · 재고','Items & stock'],note:['수량 선택 · 재고 확인','Select quantities · view stock'],source:['navCatalog'],target:'catalogSearchInput'},
   {key:'monitor',name:['운영 모니터링','Operations'],note:['재고 대조 · 처리 기록','Reconciliation · activity'],source:['navDashboard'],target:'operationsMonitor',onlyTarget:true},
   {key:'inbound',name:['재고 입고','Stock receipt'],note:['엑셀 · 사진 · 직접 입력','Excel · photo · manual'],source:['navAdmin'],tab:'tab-excel'},
   {key:'factory',name:['공장 발주 공유','Factory orders'],note:['조달 요청 · 현황 공유','Procurement · shared status'],source:['navAdmin'],tab:'tab-procurement'},
   {key:'recipes',name:['레시피','Recipes'],note:['제조 기준 · 상세 안내','Preparation · guidance'],source:['navRecipes']}
  ];
  const sources=()=>Array.from(d.querySelectorAll('[data-portal-navigation] a'));
  let bar=null,links=null,last='';
  if(titles[page]||['items.html','recipes.html'].includes(page)){
   bar=el('section',undefined,'workspace-bar');bar.id='workspaceShortcuts';bar.setAttribute('aria-label',t('자주 쓰는 업무','Frequent tasks'));
   if(titles[page]){const head=el('div',undefined,'workspace-bar-heading'),copy=el('div');copy.append(el('p','SINJEON PARTNER PORTAL','workspace-eyebrow'),el('h1',t(...titles[page].slice(0,2))),el('p',t(...titles[page].slice(2,4))));head.append(copy,artwork());bar.append(head);}
   links=el('nav',undefined,'workspace-links');links.setAttribute('aria-label',t('업무 바로가기','Task shortcuts'));bar.append(links);main.prepend(bar);
  }
  function selected(){return destinations.filter(a=>{
   const nav=a.source.map(byId).find(visible);if(!nav)return false;
   const target=byId(a.target);if(a.onlyTarget&&!visible(target))return false;
   if(a.tab&&!byId('adminSubNav'))return false;
   return true;
  }).map(a=>({...a,nav:a.source.map(byId).find(visible)})).slice(0,4);}
  function render(){
   if(!bar)return;const actions=selected();const signature=lang()+'|'+actions.map(a=>a.key+':'+a.nav.getAttribute('href')).join('|');if(signature===last)return;last=signature;
   const focused=d.activeElement?.dataset?.workspaceTask;links.replaceChildren();bar.hidden=!actions.length;bar.setAttribute('aria-label',t('자주 쓰는 업무','Frequent tasks'));links.setAttribute('aria-label',t('업무 바로가기','Task shortcuts'));
   if(titles[page]){bar.querySelector('h1').textContent=t(...titles[page].slice(0,2));bar.querySelector('.workspace-bar-heading').querySelectorAll('p')[1].textContent=t(...titles[page].slice(2,4));}
   for(const a of actions){
    const local=byId(a.target),tab=a.tab?d.querySelector('#adminSubNav [data-target="'+a.tab+'"]'):null,n=el(local||tab?'button':'a',undefined,'workspace-link');n.dataset.workspaceTask=a.key;
    if(n.tagName==='BUTTON')n.type='button';else{const route=a.nav.getAttribute('href');if(!/^(dashboard|admin|items|recipes)\.html$/.test(route||''))continue;n.href=route+(a.key==='orders'?'#orderHistorySection':'');}
    const copy=el('span');copy.append(el('strong',t(...a.name)),el('small',t(...a.note)));n.append(icon(a.key),copy);
    // Follow only existing navigation and tab handlers. Hidden/disabled sources stay inert.
    n.addEventListener('click',e=>{if(!visible(a.nav)||(a.onlyTarget&&!visible(local))||tab?.disabled){e.preventDefault();render();return;}if(local){e.preventDefault();jump(local);}else if(tab){e.preventDefault();tab.click();if(visible(byId(a.tab)))jump(byId(a.tab));}});links.append(n);
   }
   if(focused)links.querySelector('[data-workspace-task="'+focused+'"]')?.focus({preventScroll:true});
  }
  const mobile=d.querySelector('[data-portal-mobile-navigation]');
  function dock(){if(!mobile)return;const count=Array.from(mobile.children).filter(visible).length;mobile.dataset.workspaceMany=String(count>5);}
  function refresh(){render();dock();}
  const observer=new MutationObserver(refresh);sources().forEach(n=>observer.observe(n,{attributes:true,attributeFilter:['class','hidden','aria-hidden']}));const monitor=byId('operationsMonitor');if(monitor)observer.observe(monitor,{attributes:true,attributeFilter:['hidden']});if(mobile)observer.observe(mobile,{childList:true});refresh();
  // Fixed table containers only. Dynamic order/log tables own their accessible labels.
  for(const id of ['franchiseTable','salesTable','excelTable','hqOrdersTable']){
   const table=byId(id);if(!table)continue;const region=table.parentElement;region.classList.add('workspace-table-region');region.tabIndex=0;region.setAttribute('role','region');
   const names={franchiseTable:['가맹점 정보','Franchise information'],salesTable:['월별 매출','Monthly sales'],excelTable:['입고 검증 결과','Stock import review'],hqOrdersTable:['공장 발주 내역','Factory orders']};
   const hint=el('p',undefined,'workspace-scroll-hint');hint.hidden=true;region.before(hint);
   function measure(){hint.hidden=region.clientWidth===0||region.scrollWidth<=region.clientWidth+1;}
   function label(){region.setAttribute('aria-label',t(...names[id]));hint.textContent=t('표를 좌우로 이동하여 나머지 열을 확인하세요.','Scroll horizontally to view the remaining columns.');table.querySelectorAll('th').forEach(th=>th.scope='col');measure();}
   if(w.ResizeObserver)new ResizeObserver(measure).observe(region);label();d.addEventListener('y2c-language-changed',label);
  }
  // Restore field focus after a same-page shortcut, without submitting a form.
  d.addEventListener('y2c-language-changed',refresh);w.addEventListener('pageshow',refresh);
  if(location.hash==='#orderHistorySection')jump(byId('orderHistorySection'));
 }
 w.Y2C_WorkspaceUI={icon,artwork};
 d.addEventListener('DOMContentLoaded',boot);
})(window);
