/* V88_32_0. Explicit, single-tab invoice SETTINGS drafts, never an invoice register.
 * No token, fetched revenue, bank details, PDF, or acknowledgement is persisted.
 * Restoring always requires a new sales lookup; owner changes and expiry fail closed.
 */
(function (global) {
  'use strict';
  const KEY = 'y2c_invoice_settings_v1', TTL = 24 * 60 * 60 * 1000;
  const fields = ['client', 'year', 'start', 'end', 'advisory', 'advertising', 'issue', 'due', 'terms', 'reference', 'note'];
  function clean(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('DRAFT_INVALID');
    const out = {};
    for (const field of fields) {
      if (typeof input[field] !== 'string') throw new Error('DRAFT_INVALID');
      out[field] = input[field];
    }
    if (!out.client.trim() || out.client.length > 256 || !/^\d{4}$/.test(out.year) || +out.year < 1900 || +out.year > 9999) throw new Error('DRAFT_INVALID');
    for (const field of ['start', 'end']) if (!/^(?:[1-9]|1[0-2])$/.test(out[field])) throw new Error('DRAFT_INVALID');
    if (+out.start > +out.end) throw new Error('DRAFT_INVALID');
    for (const field of ['advisory', 'advertising']) if (!/^0\.\d{3}$/.test(out[field]) || +out[field] > .04) throw new Error('DRAFT_INVALID');
    if (!global.Y2C_InvoiceDates.validate(out.issue, out.due).valid) throw new Error('DRAFT_INVALID');
    if (!['0', '7', '14', '30', 'custom'].includes(out.terms)) throw new Error('DRAFT_INVALID');
    if (out.terms !== 'custom' && global.Y2C_InvoiceDates.addDays(out.issue, +out.terms) !== out.due) throw new Error('DRAFT_INVALID');
    if (out.reference.length > 64 || /[\x00-\x1f\x7f]/.test(out.reference)) throw new Error('DRAFT_INVALID');
    if (out.note.length > 300 || /[\x00-\x08\x0b-\x1f\x7f]/.test(out.note) || out.note.split('\n').length > 4) throw new Error('DRAFT_INVALID');
    return out;
  }
  function create(storage) {
    function remove() { try { storage.removeItem(KEY); return true; } catch (_) { return false; } }
    return Object.freeze({
      save(owner, settings, now = Date.now()) {
        if (typeof owner !== 'string' || !owner || owner.length > 1024 || !Number.isFinite(now)) return { ok: false, reason: 'invalid' };
        let values;
        try { values = clean(settings); } catch (_) { return { ok: false, reason: 'invalid' }; }
        try { storage.setItem(KEY, JSON.stringify({ version: 1, owner, savedAt: now, values })); return { ok: true, savedAt: now }; }
        catch (_) { return { ok: false, reason: 'storage' }; }
      },
      load(owner, now = Date.now()) {
        if (typeof owner !== 'string' || !owner || !Number.isFinite(now)) return { ok: false, reason: 'owner' };
        let raw;
        try { raw = storage.getItem(KEY); } catch (_) { return { ok: false, reason: 'storage' }; }
        if (!raw) return { ok: false, reason: 'empty' };
        try {
          if (raw.length > 12000) throw new Error('DRAFT_INVALID');
          const saved = JSON.parse(raw);
          if (!saved || saved.version !== 1 || typeof saved.owner !== 'string') throw new Error('DRAFT_INVALID');
          if (saved.owner !== owner) { remove(); return { ok: false, reason: 'owner' }; }
          if (!Number.isFinite(saved.savedAt) || now - saved.savedAt < 0 || now - saved.savedAt > TTL) { remove(); return { ok: false, reason: 'expired' }; }
          return { ok: true, savedAt: saved.savedAt, values: clean(saved.values) };
        } catch (_) { remove(); return { ok: false, reason: 'invalid' }; }
      },
      clear: remove
    });
  }
  global.Y2C_InvoiceDraft = Object.freeze({ create, validate: clean, ttlMs: TTL });
})(window);
