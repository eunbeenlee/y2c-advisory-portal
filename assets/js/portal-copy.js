/* Presentation-only translations. Does not fetch or modify business data. */
(function (w, d) {
  'use strict';
  function language() {
    try { return w.localStorage.getItem('y2c_lang') === 'ko' ? 'ko' : 'en'; }
    catch (_) { return d.documentElement.lang === 'ko' ? 'ko' : 'en'; }
  }
  function apply() {
    const current = language();
    // Apply text translations only to explicitly marked leaf elements.
    d.querySelectorAll('[data-copy-ko][data-copy-en]').forEach(function (node) {
      node.textContent = node.getAttribute('data-copy-' + current);
    });
    [['placeholder', 'placeholder'], ['label', 'aria-label'], ['title', 'title']].forEach(function (pair) {
      d.querySelectorAll('[data-copy-' + pair[0] + '-ko][data-copy-' + pair[0] + '-en]').forEach(function (node) {
        node.setAttribute(pair[1], node.getAttribute('data-copy-' + pair[0] + '-' + current));
      });
    });
    const fields = {
      catalogSearchInput: ['상품명 또는 코드 검색', 'Search item name or code'],
      recipeSearchInput: ['레시피 이름 검색', 'Search recipe name'],
      recipeCategoryFilter: ['레시피 카테고리', 'Recipe category'],
      hubSelector: ['재고 지역', 'Stock region'],
      inboundRegionSelector: ['입고 지역', 'Stock region'],
      kpiClientSelector: ['조회 가맹점', 'Franchise'],
      dashYearSelector: ['조회 연도', 'Sales year'],
      salesYearSelector: ['매출 연도', 'Sales year'],
      salesClientSelector: ['매출 가맹점', 'Franchise'],
      procHubSelect: ['입고 지역', 'Destination region'],
      procShippingMethod: ['운송 방식', 'Shipping method'],
      procTrackingNo: ['운송장 번호', 'Tracking number'],
      procItemsSummary: ['상품과 수량 선택', 'Select items and quantities'],
      refreshChartBtn: ['매출 새로고침', 'Refresh sales']
    };
    Object.keys(fields).forEach(function (id) {
      const node = d.getElementById(id);
      if (node) node.setAttribute('aria-label', fields[id][current === 'ko' ? 0 : 1]);
    });
    ['catalogSearchInput', 'recipeSearchInput'].forEach(function (id) {
      const node = d.getElementById(id);
      if (node) node.placeholder = fields[id][current === 'ko' ? 0 : 1];
    });
    const suggestion = d.getElementById('btnAutoFillAI');
    if (suggestion && suggestion.disabled) {
      suggestion.textContent = current === 'ko' ? '발주 추천 준비 중' : 'Suggestions unavailable';
      suggestion.title = current === 'ko' ? '수량을 직접 입력해 발주하세요.' : 'Enter quantities to place an order.';
    }
  }
  d.addEventListener('y2c-language-changed', apply);
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', apply);
  else apply();
  w.Y2C_PortalCopy = Object.freeze({ apply: apply });
})(window, document);
