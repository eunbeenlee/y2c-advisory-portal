'use strict';
/*
 * Exercise the real invoice page using a synthetic, local-only AuthEngine.
 * No credentials or business API requests are used. Optional --pdf-bundle must
 * point to the unmodified html2pdf 0.10.1 file matching invoice.html's SRI hash.
 * Run: node tests/invoice-browser.js --pdf-bundle /path/html2pdf.bundle.min.js
 */
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const argument = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = path.resolve(argument('--output', path.join(root, '..', 'invoice-qa')));
const bundlePath = argument('--pdf-bundle', '');
const results = [];
const { fixtureCode } = require('./invoice-fixture.js');

async function check(name, fn) {
    await fn(); results.push({ name, passed: true }); console.log('PASS ' + name);
}

async function main() {
    await fsp.mkdir(output, { recursive: true });
    let pdfBundle = null;
    if (bundlePath) {
        pdfBundle = await fsp.readFile(path.resolve(bundlePath));
        const expected = 'GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==';
        assert.equal(crypto.createHash('sha512').update(pdfBundle).digest('base64'), expected, 'PDF dependency integrity');
    }
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
    const server = http.createServer(async (req, res) => {
        try {
            const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
            if (!file.startsWith(root + path.sep) || file.includes(path.sep + '.git' + path.sep)) throw Error('Invalid path');
            const data = await fsp.readFile(file);
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
        } catch (_) { res.writeHead(404); res.end('Not found'); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const executablePath = argument('--browser', process.env.CHROMIUM_PATH || undefined);
    let browser;
    const errors = [], externalAttempts = [];
    try {
        browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, locale: 'en-CA', timezoneId: 'America/Toronto', serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true });
        await context.addInitScript(() => {
            localStorage.setItem('y2c_token', 'LOCAL_ONLY_SYNTHETIC_TOKEN');
            localStorage.setItem('y2c_role', 'MASTER');
            localStorage.setItem('y2c_client', 'Test HQ');
            localStorage.setItem('y2c_lang', 'en');
        });
        await context.route('**/*', async route => {
            const url = route.request().url();
            if (url === origin + '/assets/js/auth.js') return route.fulfill({ contentType: 'application/javascript', body: fixtureCode });
            if (url.startsWith(origin + '/')) return route.continue();
            if (url.includes('/html2pdf.js/0.10.1/') && pdfBundle) return route.fulfill({ contentType: 'application/javascript', body: pdfBundle, headers: { 'Access-Control-Allow-Origin': '*' } });
            externalAttempts.push(url);
            return route.abort('blockedbyclient');
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        // January is intentional: it catches the previous-December year rollover.
        await page.clock.install({ time: new Date('2026-01-10T17:00:00Z') });
        await page.goto(origin + '/invoice.html', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Array.from(document.querySelector('#invClientSelector').options).some(o => o.value === 'Test Toronto'));

        await check('January defaults to December of the previous billing year', async () => {
            assert.equal(await page.inputValue('#invYearSelector'), '2025');
            assert.equal(await page.inputValue('#invStartSelector'), '12');
            assert.equal(await page.inputValue('#invEndSelector'), '12');
        });
        const selectRates = async (adv, ad) => {
            for (const [id, value] of [['#invAdvisoryRate', adv], ['#invAdFeeRate', ad]]) {
                const selected = await page.locator(id).evaluate((el, n) => Array.from(el.options).find(option => Number(option.value) === n).value, value);
                await page.selectOption(id, selected);
            }
        };
        await page.selectOption('#invClientSelector', 'Test Toronto');
        await page.selectOption('#invYearSelector', '2026');
        await page.selectOption('#invStartSelector', '10');
        await page.selectOption('#invEndSelector', '10');
        await selectRates(.02, .005);
        await page.fill('#invIssueDate', '2026-11-01');
        await page.selectOption('#invPaymentTerms', '7');

        const generate = async () => {
            await page.click('#btnGenerateInvoice');
            await page.waitForFunction(() => !document.querySelector('#btnExportPDF').disabled);
        };
        await check('chosen issue date, payment preset and numeric client ID render successfully', async () => {
            assert.equal(await page.inputValue('#invDueDate'), '2026-11-08');
            await generate();
            assert.equal((await page.textContent('#docIssueDate')).trim(), '2026-11-01');
            assert.equal((await page.textContent('#docDueDate')).trim(), '2026-11-08');
            assert.match(await page.textContent('#invoiceDocument'), /Net 7 days/);
            assert.match(await page.textContent('#valGrandTotal'), /37\.51/);
            assert.equal(await page.isDisabled('#btnDownloadPdf'), false);
            assert.equal(await page.isDisabled('#btnPrintInvoice'), false);
        });

        await check('date edits invalidate every export action and preserve custom due dates', async () => {
            await page.selectOption('#invPaymentTerms', 'custom');
            await page.fill('#invDueDate', '2026-11-20');
            await page.fill('#invIssueDate', '2026-11-02');
            assert.equal(await page.inputValue('#invDueDate'), '2026-11-20');
            for (const id of ['#btnExportPDF', '#btnDownloadPdf', '#btnPrintInvoice']) assert.equal(await page.isDisabled(id), true);
            await generate();
            assert.equal((await page.textContent('#docDueDate')).trim(), '2026-11-20');
            assert.match(await page.textContent('#invoiceDocument'), /Net 18 days/);
        });

        await check('due date before issue blocks reads and exports', async () => {
            await page.fill('#invDueDate', '2026-11-01');
            const before = await page.evaluate(() => window.__invoiceTest.calls.length);
            await page.locator('#btnGenerateInvoice').evaluate(button => button.click());
            assert.equal(await page.evaluate(() => window.__invoiceTest.calls.length), before);
            assert.equal(await page.isDisabled('#btnExportPDF'), true);
            await page.fill('#invDueDate', '2026-11-20');
        });

        await check('changed inputs during an in-flight read cannot enable a stale invoice', async () => {
            await page.evaluate(() => { window.__invoiceTest.mode = 'slow'; });
            await page.click('#btnGenerateInvoice');
            await page.waitForFunction(() => window.__invoiceTest.pending.length === 2);
            // A scripted value change models autofill / another integration, even if inputs are locked.
            await page.locator('#invIssueDate').evaluate(input => { input.value = '2026-11-03'; input.dispatchEvent(new Event('change', { bubbles: true })); });
            await page.evaluate(() => { window.__invoiceTest.mode = 'normal'; window.__invoiceTest.pending.splice(0).forEach(resolve => resolve()); });
            await page.waitForFunction(() => !document.querySelector('#btnGenerateInvoice').disabled);
            assert.equal(await page.isDisabled('#btnExportPDF'), true);
            await generate();
        });

        await check('failed, malformed and unreconciled responses cannot export the preceding invoice', async () => {
            for (const mode of ['failure', 'malformed', 'mismatch']) {
                await page.evaluate(mode => { window.__invoiceTest.mode = mode; }, mode);
                await page.click('#btnGenerateInvoice');
                await page.waitForFunction(() => !document.querySelector('#btnGenerateInvoice').disabled);
                assert.equal(await page.isDisabled('#btnExportPDF'), true, mode);
            }
            await page.evaluate(() => { window.__invoiceTest.mode = 'normal'; });
            await generate();
        });

        await check('explicit invoice reference is reflected in the document', async () => {
            if (!await page.locator('#invInvoiceReference').count()) throw Error('Invoice reference field missing');
            await page.fill('#invInvoiceReference', 'TEST-2026-011');
            await generate();
            assert.equal((await page.textContent('#docInvoiceNo')).trim(), 'TEST-2026-011');
        });

        await page.screenshot({ path: path.join(output, 'invoice-desktop.png'), fullPage: true });
        if (pdfBundle) {
            await check('real html2pdf exports a ready invoice and restores all controls', async () => {
                const downloadReady = page.waitForEvent('download');
                await page.click('#btnExportPDF');
                const download = await downloadReady;
                await download.saveAs(path.join(output, 'invoice-one-month.pdf'));
                await page.waitForFunction(() => !window.Y2C_DocumentIO.isBusy());
                assert.equal(await page.isDisabled('#btnGenerateInvoice'), false);
                assert.equal(await page.isDisabled('#btnExportPDF'), false);
                assert.equal(await page.locator('.pdf-export-mode').count(), 0);
                assert.equal((await fsp.readFile(path.join(output, 'invoice-one-month.pdf'))).subarray(0, 5).toString(), '%PDF-');
            });
        }

        await check('twelve-month invoice contains every fee line without clipping', async () => {
            await page.evaluate(() => { window.__invoiceTest.mode = 'year'; });
            await page.selectOption('#invStartSelector', '1');
            await page.selectOption('#invEndSelector', '12');
            await generate();
            assert.equal(await page.locator('#valInvoiceLines tr').count(), 24);
            assert.match(await page.textContent('#valGrandTotal'), /450\.12/);
            const dimensions = await page.locator('#invoiceDocument').evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight, overflow: getComputedStyle(el).overflow }));
            assert.ok(dimensions.scroll <= dimensions.client + 2 || dimensions.overflow !== 'hidden');
            await page.pdf({ path: path.join(output, 'invoice-twelve-months-print.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
            if (pdfBundle) {
                const ready = page.waitForEvent('download');
                await page.click('#btnExportPDF');
                await (await ready).saveAs(path.join(output, 'invoice-twelve-months.pdf'));
                await page.waitForFunction(() => !window.Y2C_DocumentIO.isBusy());
            }
        });

        await check('Korean controls and mobile layout remain usable', async () => {
            await page.evaluate(() => window.changeLanguage('ko'));
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({ path: path.join(output, 'invoice-mobile.png'), fullPage: true });
            const layout = await page.evaluate(() => ({ viewport: window.innerWidth, page: document.documentElement.scrollWidth, controls: document.querySelector('#invoiceControls').getBoundingClientRect().toJSON() }));
            assert.ok(layout.page <= layout.viewport + 1, JSON.stringify(layout));
            assert.ok(layout.controls.width <= layout.viewport);
            for (const id of ['#invIssueDate', '#invDueDate', '#invPaymentTerms']) assert.equal(await page.isVisible(id), true);
        });
        await check('page has no uncaught JavaScript errors and never contacts a business endpoint', async () => {
            assert.deepEqual(errors, []);
            assert.equal(externalAttempts.some(url => /script\.google(?:usercontent)?\.com/.test(url)), false);
        });
        await context.close();
        await fsp.writeFile(path.join(output, 'browser-results.json'), JSON.stringify({ passed: results.length, results, pdfEngineTested: !!pdfBundle, liveBusinessApiTested: false, externalAttempts, pageErrors: errors }, null, 2));
        console.log(JSON.stringify({ passed: results.length, output, pdfEngineTested: !!pdfBundle }));
    } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
module.exports = { fixtureCode };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
