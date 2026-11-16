'use strict';
/*
 * Integration fallback for environments where a browser cannot launch.
 * Requires jsdom. This executes the real page scripts and DOM event handlers,
 * with local synthetic business data. It does not certify visual layout or PDF
 * rasterization; tests/invoice-browser.js owns those checks.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');
const { fixtureCode } = require('./invoice-fixture.js');
const root = path.resolve(__dirname, '..');

async function until(predicate, message) {
    const deadline = Date.now() + 2000;
    while (!predicate()) {
        if (Date.now() > deadline) throw Error('Timed out: ' + message);
        await new Promise(resolve => setTimeout(resolve, 5));
    }
}

test('actual invoice page event workflow with synthetic responses', async t => {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'invoice.html'), 'utf8'), {
        url: 'https://invoice-test.invalid/invoice.html',
        runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
        beforeParse(window) {
            // jsdom has no layout engine; map only its missing text API.
            Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
                get() { return this.textContent; }, set(value) { this.textContent = value; }, configurable: true
            });
            window.matchMedia = query => ({ matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
            window.scrollTo = () => {};
            window.HTMLElement.prototype.scrollIntoView = function () {};
            window.print = () => { window.__printCount = (window.__printCount || 0) + 1; };
            const NativeDate = window.Date;
            window.Date = class extends NativeDate {
                constructor(...args) { super(...(args.length ? args : ['2026-01-10T17:00:00Z'])); }
                static now() { return new NativeDate('2026-01-10T17:00:00Z').getTime(); }
            };
            window.localStorage.setItem('y2c_token', 'LOCAL_ONLY_SYNTHETIC_TOKEN');
            window.localStorage.setItem('y2c_role', 'MASTER');
            window.localStorage.setItem('y2c_client', 'Test HQ');
            window.localStorage.setItem('y2c_lang', 'en');
            window.fetch = () => { throw Error('Network is prohibited in the invoice DOM fixture'); };
            // Image decoding cannot occur in a DOM-only runtime. Resource failure
            // is tested separately below; successful resource readiness is modeled.
            Object.defineProperty(window.HTMLImageElement.prototype, 'complete', { get: () => true, configurable: true });
            Object.defineProperty(window.HTMLImageElement.prototype, 'naturalWidth', { get: () => 100, configurable: true });
            window.HTMLImageElement.prototype.decode = () => Promise.resolve();
            window.html2pdf = () => {
                let options, element;
                return {
                    set(value) { options = value; return this; },
                    from(value) { element = value; return this; },
                    async save() {
                        window.__invoiceTest.pdfExports.push({ filename: options.filename,
                            issue: element.querySelector('#docIssueDate').textContent,
                            due: element.querySelector('#docDueDate').textContent,
                            rows: element.querySelectorAll('#valInvoiceLines tr').length });
                        if (window.__invoiceTest.exportFailure) throw Error('Intentional export failure');
                    }
                };
            };
        }
    });
    const w = dom.window, d = w.document;
    const control = id => d.getElementById(id);
    const change = (id, value, type = 'change') => {
        control(id).value = value;
        control(id).dispatchEvent(new w.Event(type, { bubbles: true }));
    };
    try {
        const scripts = Array.from(d.scripts);
        for (const script of [...scripts.filter(s => !s.defer), ...scripts.filter(s => s.defer)]) {
            const src = script.getAttribute('src');
            if (src === 'assets/js/auth.js') w.eval(fixtureCode);
            else if (src && !/^https?:/.test(src)) w.eval(fs.readFileSync(path.join(root, src), 'utf8'));
            else if (!src && script.textContent.trim()) w.eval(script.textContent);
        }
        await until(() => Array.from(control('invClientSelector').options).some(option => option.value === 'Test Toronto'), 'client options');

        await t.test('January defaults to the previous December billing year', () => {
            assert.equal(control('invYearSelector').value, '2025');
            assert.equal(control('invStartSelector').value, '12');
        });
        change('invClientSelector', 'Test Toronto');
        change('invYearSelector', '2026');
        change('invStartSelector', '10');
        change('invEndSelector', '10');
        change('invAdFeeRate', '0.005');
        change('invIssueDate', '2026-11-01', 'input');
        change('invPaymentTerms', '7');
        const generate = async () => {
            control('btnGenerateInvoice').click();
            await until(() => !control('btnGenerateInvoice').disabled, 'generation end');
            assert.equal(control('btnExportPDF').disabled, false, control('invoiceResultStatus').textContent);
        };

        await t.test('selected dates, terms, numeric business ID and reconciled totals render', async () => {
            assert.equal(control('invDueDate').value, '2026-11-08');
            await generate();
            assert.equal(control('docIssueDate').textContent, '2026-11-01');
            assert.equal(control('docDueDate').textContent, '2026-11-08');
            assert.equal(control('docPaymentTerms').textContent, 'Net 7 days');
            assert.match(control('valGrandTotal').textContent, /37\.51/);
            assert.equal(control('docClientBiz').textContent, '123456789');
        });
        await t.test('custom due date survives issue date edits and invalidates every export', async () => {
            change('invDueDate', '2026-11-20', 'input');
            assert.equal(control('invPaymentTerms').value, 'custom');
            change('invIssueDate', '2026-11-02', 'input');
            assert.equal(control('invDueDate').value, '2026-11-20');
            for (const id of ['btnExportPDF', 'btnDownloadPdf', 'btnPrintInvoice']) assert.equal(control(id).disabled, true);
            w.printInvoice(); assert.equal(w.__printCount || 0, 0);
            await generate();
            assert.equal(control('docPaymentTerms').textContent, 'Net 18 days');
        });
        await t.test('invalid due dates block both request and print', () => {
            change('invDueDate', '2026-11-01', 'input');
            const count = w.__invoiceTest.calls.length;
            control('btnGenerateInvoice').click();
            assert.equal(w.__invoiceTest.calls.length, count);
            assert.equal(control('invDueDate').getAttribute('aria-invalid'), 'true');
            w.printInvoice(); assert.equal(w.__printCount || 0, 0);
            change('invDueDate', '2026-11-20', 'input');
        });
        await t.test('changing an input during a slow response does not publish stale output', async () => {
            w.__invoiceTest.mode = 'slow'; control('btnGenerateInvoice').click();
            await until(() => w.__invoiceTest.pending.length === 2, 'pending reads');
            change('invIssueDate', '2026-11-03', 'input');
            w.__invoiceTest.mode = 'normal'; w.__invoiceTest.pending.splice(0).forEach(resolve => resolve());
            await until(() => !control('btnGenerateInvoice').disabled, 'stale read settle');
            assert.equal(control('btnExportPDF').disabled, true);
            assert.equal(control('invoiceResultStatus').dataset.state, 'changed');
        });
        await t.test('read failure, malformed payload and mismatched totals disable old exports', async () => {
            for (const mode of ['failure', 'malformed', 'mismatch']) {
                w.__invoiceTest.mode = mode; control('btnGenerateInvoice').click();
                await until(() => !control('btnGenerateInvoice').disabled, mode);
                assert.equal(control('btnExportPDF').disabled, true, mode);
                assert.equal(control('invoiceResultStatus').dataset.state, 'failed', mode);
            }
            w.__invoiceTest.mode = 'normal'; await generate();
        });
        await t.test('custom reference and snapshot dates are passed to export', async () => {
            change('invInvoiceReference', 'TEST-2026-011', 'input'); await generate();
            assert.equal(control('docInvoiceNo').textContent, 'TEST-2026-011');
            control('btnExportPDF').click();
            await until(() => !w.Y2C_DocumentIO.isBusy(), 'export');
            assert.equal(w.__invoiceTest.pdfExports.length, 1);
            const snapshot = w.__invoiceTest.pdfExports[0];
            assert.equal(snapshot.issue, '2026-11-03');
            assert.equal(snapshot.due, '2026-11-20');
            assert.ok(snapshot.filename.startsWith('TEST-2026-011_'));
            assert.equal(d.querySelectorAll('.pdf-export-mode').length, 0);
        });
        await t.test('failed PDF save restores form and removes only the offscreen copy', async () => {
            w.__invoiceTest.exportFailure = true; control('btnExportPDF').click();
            await until(() => !w.Y2C_DocumentIO.isBusy(), 'failed export');
            assert.equal(control('btnGenerateInvoice').disabled, false);
            assert.equal(control('btnExportPDF').disabled, false);
            assert.equal(control('invIssueDate').disabled, false);
            assert.equal(d.querySelectorAll('.pdf-export-mode').length, 0);
            assert.ok(control('invoiceDocument'));
            assert.ok(w.__invoiceTest.toasts.some(toast => toast.message === 'Intentional export failure'));
            w.__invoiceTest.exportFailure = false;
        });
        await t.test('twelve months retain all 24 fee lines and the exact total', async () => {
            w.__invoiceTest.mode = 'year'; change('invStartSelector', '1'); change('invEndSelector', '12');
            await generate();
            assert.equal(control('valInvoiceLines').querySelectorAll('tr').length, 24);
            assert.match(control('valGrandTotal').textContent, /450\.12/);
            w.printInvoice(); assert.equal(w.__printCount, 1);
        });
        await t.test('language switch preserves fields, totals and invoice validity', () => {
            w.changeLanguage('ko');
            assert.equal(control('invIssueDate').value, '2026-11-03');
            assert.equal(control('docPaymentTerms').textContent, 'Net 17 days');
            assert.equal(control('btnExportPDF').disabled, false);
            assert.match(control('invoiceTermsSummary').textContent, /입금 요청일/);
        });
        await t.test('loaded page scripts raise no uncaught errors', () => assert.deepEqual(errors, []));
    } finally { w.close(); }
});
