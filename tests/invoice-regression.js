'use strict';
/* Local-only financial regressions. No browser, credentials or network needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/invoice-math.js'), 'utf8'), sandbox);
const math = sandbox.window.Y2C_InvoiceMath;
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/invoice-dates.js'), 'utf8'), sandbox);
const dates = sandbox.window.Y2C_InvoiceDates;

function fixture() {
    return {
        data: { clientInfo: { name: 'Test Toronto', bizId: 123456789 }, posSales: 1000.25, deliverySales: 500.15, totalSales: 1500.40 },
        records: [{ month: 10, pos: 1000.25, delivery: 500.15, total: 1500.40 }],
        params: { targetYear: '2026', clientName: 'Test Toronto', startMonth: 10, endMonth: 10 }
    };
}
function summarize(f, adv = 0.02, ad = 0.005) { return math.summarize(f.data, f.records, f.params, adv, ad); }

test('two independently rounded fee lines reconcile in cents', () => {
    const result = summarize(fixture());
    assert.equal(result.totalSales, 1500.40);
    assert.equal(result.months[0].advFee, 30.01);
    assert.equal(result.months[0].adfFee, 7.50);
    assert.equal(result.totalFees, 37.51);
});

test('delayed zero total uses the reconciled POS and delivery components', () => {
    const f = fixture();
    f.records[0].total = 0;
    assert.equal(summarize(f).totalSales, 1500.40);
});

test('mismatch between monthly components and reported total blocks issue', () => {
    const f = fixture(); f.records[0].total = 1400;
    assert.throws(() => summarize(f));
});

test('aggregate mismatch blocks issue instead of publishing an incorrect amount', () => {
    const f = fixture(); f.data.totalSales = 1550.40;
    assert.throws(() => summarize(f));
});

test('missing aggregate fields cannot turn an incomplete response into a zero invoice', () => {
    const f = fixture(); f.data = { clientInfo: { name: 'Test Toronto' } }; f.records = [];
    assert.throws(() => summarize(f));
});

test('wrong client, duplicate month and invalid month are rejected', () => {
    const wrong = fixture(); wrong.data.clientInfo.name = 'Another Client';
    assert.throws(() => summarize(wrong));
    const duplicate = fixture(); duplicate.records.push({ ...duplicate.records[0] });
    assert.throws(() => summarize(duplicate));
    const invalid = fixture(); invalid.records[0].month = 13;
    assert.throws(() => summarize(invalid));
});

test('explicit total-only legacy records are accepted only with matching aggregate', () => {
    const f = fixture();
    f.data.posSales = f.data.deliverySales = 0;
    f.records[0] = { month: 10, pos: 0, delivery: 0, total: 1500.40, totalOnly: true };
    assert.equal(summarize(f).totalFees, 37.51);
    delete f.records[0].totalOnly;
    assert.throws(() => summarize(f));
});

test('negative, non-finite and malformed amounts cannot be invoiced', () => {
    for (const value of [-1, Infinity, 'abc', '1,00.25']) {
        const f = fixture(); f.records[0].pos = value;
        assert.throws(() => summarize(f), 'must reject ' + String(value));
    }
});

test('invalid rates and reversed billing periods are rejected', () => {
    assert.throws(() => summarize(fixture(), -0.01));
    assert.throws(() => summarize(fixture(), Infinity));
    const f = fixture(); f.params.startMonth = 11;
    assert.throws(() => summarize(f));
});

test('valid zero fee and zero sales invoices remain representable', () => {
    assert.equal(summarize(fixture(), 0, 0).totalFees, 0);
    const f = fixture(); f.data.posSales = f.data.deliverySales = f.data.totalSales = 0;
    f.records = [{ month: 10, pos: 0, delivery: 0, total: 0 }];
    assert.equal(summarize(f).totalFees, 0);
});

test('calendar date math covers leap years, month boundaries and year rollover', () => {
    assert.equal(dates.addDays('2024-02-28', 1), '2024-02-29');
    assert.equal(dates.addDays('2026-02-28', 1), '2026-03-01');
    assert.equal(dates.addDays('2026-12-25', 14), '2027-01-08');
    assert.equal(dates.dayDifference('2026-03-07', '2026-03-09'), 2);
    assert.equal(dates.dayDifference('2026-10-31', '2026-11-02'), 2);
});

test('business timezone determines today even when the user is in Korea', () => {
    const instant = new Date('2026-11-17T01:00:00Z');
    assert.equal(dates.today(instant, 'America/Toronto'), '2026-11-16');
    assert.equal(dates.today(instant, 'Asia/Seoul'), '2026-11-17');
});

test('impossible dates and due dates before issue are rejected', () => {
    for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '11/16/2026', '']) {
        assert.equal(dates.parse(value), null);
        assert.equal(dates.validate(value, '2026-12-01').valid, false);
    }
    assert.equal(dates.validate('2026-11-16', '2026-11-15').code, 'due_before_issue');
    assert.equal(dates.validate('2026-11-16', '').valid, false);
});

test('payment terms are derived from the dates on the invoice', () => {
    assert.equal(dates.paymentTerms('2026-11-01', '2026-11-01'), 'Due on issue date');
    assert.equal(dates.paymentTerms('2026-11-01', '2026-11-08'), 'Net 7 days');
    assert.equal(dates.paymentTerms('2026-11-01', '2026-11-15'), 'Net 14 days');
    assert.equal(dates.paymentTerms('2026-11-01', '2026-12-01'), 'Net 30 days');
});

test('missing-month coverage is visible and is not silently described as confirmed zero',()=>{
 const f=fixture();f.params.startMonth=9;f.params.endMonth=11;
 const r=summarize(f);assert.equal(r.coverage.expected,3);assert.equal(r.coverage.returned,1);
 assert.deepEqual(Array.from(r.coverage.missingMonths),[9,11]);
});
test('nonexistent months cannot also contain financial values',()=>{
 const f=fixture();f.records[0].exists=false;assert.throws(()=>summarize(f));
});
test('boolean and non-scalar months cannot be coerced into valid months',()=>{
 for(const month of [true,false,null,{},[]]){const f=fixture();f.records[0].month=month;assert.throws(()=>summarize(f));}
});
test('unsorted valid source months are returned in chronological order',()=>{
 const f=fixture();f.params.startMonth=9;f.records.push({month:9,pos:0,delivery:0,total:0});
 assert.deepEqual(Array.from(summarize(f).months,m=>m.month),[9,10]);
});
test('explicit empty monthly records retain complete coverage',()=>{
 const f=fixture();f.records=[{month:10,exists:false}];f.data.posSales=f.data.deliverySales=f.data.totalSales=0;
 const r=summarize(f);assert.equal(r.totalFees,0);assert.equal(r.coverage.missingMonths.length,0);
});

test('whitespace-padded numeric spreadsheet months retain compatibility',()=>{
 const f=fixture();f.records[0].month=' 10 ';assert.equal(summarize(f).totalFees,37.51);
});
