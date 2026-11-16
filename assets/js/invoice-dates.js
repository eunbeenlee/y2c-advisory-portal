/* Invoice dates are calendar dates. UTC arithmetic avoids DST and locale shifts. */
(function (global) {
  'use strict';
  const DAY = 86400000;
  function parse(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
  }
  function format(date) {
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  }
  function today(now = new Date(), timeZone = global.SYSTEM_CONFIG?.TIMEZONE || 'America/Toronto') {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function addDays(value, days) {
    const date = parse(value);
    if (!date || !Number.isSafeInteger(days)) return '';
    date.setUTCDate(date.getUTCDate() + days);
    if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 9999) return '';
    return format(date);
  }
  function dayDifference(issue, due) {
    const start = parse(issue), end = parse(due);
    return start && end ? Math.round((end - start) / DAY) : null;
  }
  function validate(issue, due) {
    if (!issue) return { valid: false, code: 'issue_required', field: 'issue' };
    if (!parse(issue)) return { valid: false, code: 'issue_invalid', field: 'issue' };
    if (!due) return { valid: false, code: 'due_required', field: 'due' };
    if (!parse(due)) return { valid: false, code: 'due_invalid', field: 'due' };
    const days = dayDifference(issue, due);
    if (days < 0) return { valid: false, code: 'due_before_issue', field: 'due' };
    return { valid: true, days };
  }
  function paymentTerms(issue, due) {
    const result = validate(issue, due);
    return result.valid ? (result.days === 0 ? 'Due on issue date' : `Net ${result.days} days`) : '';
  }
  global.Y2C_InvoiceDates = Object.freeze({ parse, today, addDays, dayDifference, validate, paymentTerms });
})(window);
