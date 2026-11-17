/* Reconcile source records before printing; accumulate and round in integer cents. */
(function (global) {
  'use strict';
  function present(value) { return value != null && value !== ''; }
  function cents(value, required) {
    if (!present(value)) {
      if (required) throw new Error('매출 집계 항목이 누락되었습니다. 원본 데이터를 확인해 주세요.');
      return 0;
    }
    if (typeof value !== 'number' && typeof value !== 'string') throw new Error('매출 금액의 형식이 올바르지 않습니다.');
    let text = String(value).trim();
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) throw new Error('매출 금액이 유효하지 않습니다.');
      // Expand a numeric exponent before decimal, half-up rounding. No binary
      // multiplication is used to turn currency into integer cents.
      const exponential = /^(\d+)(?:\.(\d+))?e([+-]?\d+)$/i.exec(text);
      if (exponential) {
        const digits = exponential[1] + (exponential[2] || '');
        const point = exponential[1].length + Number(exponential[3]);
        text = point <= 0 ? '0.' + '0'.repeat(-point) + digits :
          point >= digits.length ? digits + '0'.repeat(point - digits.length) : digits.slice(0, point) + '.' + digits.slice(point);
      }
    }
    if (!text || text.length > 512 || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) {
      throw new Error('매출 금액의 형식이 올바르지 않습니다.');
    }
    const [whole, fraction = ''] = text.replace(/,/g, '').split('.');
    const result = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)) + (fraction.length > 2 && fraction[2] >= '5' ? 1n : 0n);
    if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('매출 금액이 처리 가능한 범위를 초과했습니다.');
    return Number(result);
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
        !/^\d{4}$/.test(String(params.targetYear)) || Number(params.targetYear) < 1900 || Number(params.targetYear) > 9999 || !Number.isInteger(params.startMonth) ||
        !Number.isInteger(params.endMonth) || params.startMonth < 1 || params.endMonth > 12 ||
        params.startMonth > params.endMonth) throw new Error('인보이스 조회 조건이 유효하지 않습니다.');
    feeCents(0, advRate); feeCents(0, adfRate);
    if (!data.clientInfo || data.clientInfo.name !== params.clientName) throw new Error('조회된 가맹점이 선택한 가맹점과 다릅니다. 다시 조회해 주세요.');
    const declaredPos = cents(data.posSales, true), declaredDelivery = cents(data.deliverySales, true), declaredGross = cents(data.totalSales, true);
    const seen = new Set(), months = [], unregisteredMonths = [], inferredMonths = [], totalOnlyMonths = [];
    let pos = 0, delivery = 0, gross = 0, fees = 0;
    for (const row of records) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('월별 매출 내역의 형식이 올바르지 않습니다.');
      if ((typeof row.month !== 'string' && typeof row.month !== 'number') || !/^\d{1,2}$/.test(String(row.month).trim())) throw new Error('월별 매출의 월 형식을 확인해 주세요.');
      const month = Number(row.month);
      if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('월별 매출의 월 범위를 확인해 주세요.');
      if (month < params.startMonth || month > params.endMonth) continue;
      for (const flag of ['exists', 'totalOnly']) if (row[flag] != null && typeof row[flag] !== 'boolean') throw new Error('월별 매출 상태값의 형식이 올바르지 않습니다.');
      if (seen.has(month)) throw new Error('선택한 기간에 중복된 월별 매출이 있습니다. 원본 데이터를 확인해 주세요.');
      seen.add(month);
      if ((row.year != null && String(row.year) !== String(params.targetYear)) ||
          (row.clientName != null && row.clientName !== params.clientName)) throw new Error('매출 내역의 가맹점 또는 연도가 선택 조건과 다릅니다.');
      // Explicitly empty months are valid; missing nonempty rows are not zero sales.
      if (row.exists !== false && row.pos == null && row.delivery == null && row.total == null) throw new Error('월별 매출 금액이 누락되었습니다. 원본 데이터를 확인해 주세요.');
      const p = cents(row.pos), d = cents(row.delivery), declared = cents(row.total), sum = p + d;
      if (!Number.isSafeInteger(sum)) throw new Error('매출이 처리 가능한 금액 범위를 초과했습니다.');
      if (row.exists === false && (sum !== 0 || declared !== 0)) throw new Error('미등록 월에 매출 금액이 있습니다. 원본 데이터를 확인해 주세요.');
      if (row.totalOnly === true && sum !== 0) throw new Error('합계 전용 매출에 POS·배달 금액이 함께 있습니다. 원본을 확인해 주세요.');
      const totalOnly = row.totalOnly === true && sum === 0 && declared > 0;
      if (declared > 0 && declared !== sum && !totalOnly) throw new Error('월별 합계와 POS·배달 매출이 일치하지 않습니다. 원본 데이터를 확인해 주세요.');
      const recognized = totalOnly ? declared : sum;
      const adv = feeCents(recognized, advRate), adf = feeCents(recognized, adfRate);
      pos += p; delivery += d; gross += recognized; fees += adv + adf;
      if (![pos, delivery, gross, fees].every(Number.isSafeInteger)) throw new Error('금액이 처리 가능한 범위를 초과했습니다.');
      // Preserve legacy total=0 / total-only compatibility, but never present
      // inferred or unregistered data as fully confirmed sales.
      const unregistered = row.exists === false;
      const inferred = !unregistered && !totalOnly &&
        (!present(row.pos) || !present(row.delivery) || !present(row.total) || (declared === 0 && sum > 0));
      if (unregistered) unregisteredMonths.push(month);
      if (inferred) inferredMonths.push(month);
      if (totalOnly) totalOnlyMonths.push(month);
      const status = unregistered ? 'unregistered' : totalOnly ? 'totalOnly' : inferred ? 'inferred' : recognized === 0 ? 'zero' : 'matched';
      months.push({ month, pos: p / 100, delivery: d / 100, gross: recognized / 100, totalOnly,
        status, advFee: adv / 100, adfFee: adf / 100,
        cents: { pos: p, delivery: d, gross: recognized, advFee: adv, adfFee: adf } });
    }
    if (declaredPos !== pos || declaredDelivery !== delivery || declaredGross !== gross) throw new Error('월별 내역과 인보이스 집계가 다릅니다. 최신 데이터를 다시 조회해 주세요.');
    months.sort((a, b) => a.month - b.month);
    [unregisteredMonths, inferredMonths, totalOnlyMonths].forEach(list => list.sort((a, b) => a - b));
    const missingMonths = [];
    for (let month = params.startMonth; month <= params.endMonth; month++) if (!seen.has(month)) missingMonths.push(month);
    const confirmedCount = months.length - unregisteredMonths.length;
    const reviewRequired = [missingMonths, unregisteredMonths, inferredMonths, totalOnlyMonths].some(list => list.length > 0);
    return { months, totalFees: fees / 100, totalSales: gross / 100, cents: { totalFees: fees, totalSales: gross },
      canIssue: confirmedCount > 0, reviewRequired,
      coverage: { expected: params.endMonth - params.startMonth + 1, returned: months.length, confirmedCount,
        missingMonths, unregisteredMonths, inferredMonths, totalOnlyMonths } };
  }
  global.Y2C_InvoiceMath = Object.freeze({ summarize });
})(window);
