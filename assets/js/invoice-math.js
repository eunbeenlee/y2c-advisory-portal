/* Reconcile source records before printing; accumulate and round in integer cents. */
(function (global) {
  'use strict';
  function cents(value, required) {
    if (value == null || value === '') {
      if (required) throw new Error('매출 집계 항목이 누락되었습니다. 원본 데이터를 확인해 주세요.');
      return 0;
    }
    if (typeof value !== 'number' && typeof value !== 'string') throw new Error('매출 금액의 형식이 올바르지 않습니다.');
    const text = String(value).trim();
    if (!text || (typeof value === 'string' && !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text))) {
      throw new Error('매출 금액의 형식이 올바르지 않습니다.');
    }
    const number = Number(text.replace(/,/g, ''));
    const result = Math.round(number * 100 + 1e-8);
    if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(result)) throw new Error('매출 금액이 유효하지 않습니다. 원본 데이터를 확인해 주세요.');
    return result;
  }
  function feeCents(amount, rate) {
    // Rates are expressed in basis points, so half-cent ties always round up.
    const basisPoints = Math.round(rate * 10000);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1 || Math.abs(rate * 10000 - basisPoints) > 1e-7) {
      throw new Error('수수료율을 확인해 주세요.');
    }
    const result = Number((BigInt(amount) * BigInt(basisPoints) + 5000n) / 10000n);
    if (!Number.isSafeInteger(result)) throw new Error('수수료가 처리 가능한 금액 범위를 초과했습니다.');
    return result;
  }
  function summarize(data, records, params, advRate, adfRate) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !params || !Array.isArray(records) ||
        !/^\d{4}$/.test(String(params.targetYear)) || !Number.isInteger(params.startMonth) ||
        !Number.isInteger(params.endMonth) || params.startMonth < 1 || params.endMonth > 12 ||
        params.startMonth > params.endMonth) throw new Error('인보이스 조회 조건이 유효하지 않습니다.');
    feeCents(0, advRate); feeCents(0, adfRate);
    if (!data.clientInfo || data.clientInfo.name !== params.clientName) throw new Error('조회된 가맹점이 선택한 가맹점과 다릅니다. 다시 조회해 주세요.');
    const declaredPos = cents(data.posSales, true), declaredDelivery = cents(data.deliverySales, true), declaredGross = cents(data.totalSales, true);
    const seen = new Set(), months = [];
    let pos = 0, delivery = 0, gross = 0, fees = 0;
    for (const row of records) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('월별 매출 내역의 형식이 올바르지 않습니다.');
      const month = Number(row.month);
      if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('월별 매출의 월 범위를 확인해 주세요.');
      if (month < params.startMonth || month > params.endMonth) continue;
      if (seen.has(month)) throw new Error('선택한 기간에 중복된 월별 매출이 있습니다. 원본 데이터를 확인해 주세요.');
      seen.add(month);
      if ((row.year != null && String(row.year) !== String(params.targetYear)) ||
          (row.clientName != null && row.clientName !== params.clientName)) throw new Error('매출 내역의 가맹점 또는 연도가 선택 조건과 다릅니다.');
      // Explicitly empty months are valid; missing nonempty rows are not zero sales.
      if (row.exists !== false && row.pos == null && row.delivery == null && row.total == null) throw new Error('월별 매출 금액이 누락되었습니다. 원본 데이터를 확인해 주세요.');
      const p = cents(row.pos), d = cents(row.delivery), declared = cents(row.total), sum = p + d;
      if (!Number.isSafeInteger(sum)) throw new Error('매출이 처리 가능한 금액 범위를 초과했습니다.');
      const totalOnly = row.totalOnly === true && sum === 0 && declared > 0;
      if (declared > 0 && declared !== sum && !totalOnly) throw new Error('월별 합계와 POS·배달 매출이 일치하지 않습니다. 원본 데이터를 확인해 주세요.');
      const recognized = totalOnly ? declared : sum;
      const adv = feeCents(recognized, advRate), adf = feeCents(recognized, adfRate);
      pos += p; delivery += d; gross += recognized; fees += adv + adf;
      if (![pos, delivery, gross, fees].every(Number.isSafeInteger)) throw new Error('금액이 처리 가능한 범위를 초과했습니다.');
      months.push({ month, gross: recognized / 100, totalOnly, advFee: adv / 100, adfFee: adf / 100 });
    }
    if (declaredPos !== pos || declaredDelivery !== delivery || declaredGross !== gross) throw new Error('월별 내역과 인보이스 집계가 다릅니다. 최신 데이터를 다시 조회해 주세요.');
    return { months, totalFees: fees / 100, totalSales: gross / 100 };
  }
  global.Y2C_InvoiceMath = Object.freeze({ summarize });
})(window);
