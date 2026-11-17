'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = { window: {} };
for (const file of ['invoice-dates', 'invoice-math', 'invoice-draft']) vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/' + file + '.js'), 'utf8'), env);
const { Y2C_InvoiceMath: math, Y2C_InvoiceDraft: draft } = env.window;
function source(pos = 100, delivery = 50, total = 150) {
 return { data: { clientInfo: {name: 'Sample'}, posSales: pos, deliverySales: delivery, totalSales: total }, rows: [{month:10,pos,delivery,total}], params: {targetYear:'2026',clientName:'Sample',startMonth:10,endMonth:10} };
}
const sum = f => math.summarize(f.data, f.rows, f.params, .02, .005);
const settings = () => ({client:'Sample',year:'2026',start:'10',end:'10',advisory:'0.020',advertising:'0.005',issue:'2026-11-01',due:'2026-11-15',terms:'14',reference:'INV-SAMPLE',note:'Please include the invoice reference.'});
function store() { const data = new Map(); const storage = {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}; return {data,storage,api:draft.create(storage)}; }
test('decimal cents round half-up exactly even for large decimal strings', () => {
 for (const [value, expected] of [['0.005',1],['1.005',101],['12345678901.495',1234567890150],['80.299999',8030],['1,234.565',123457],['0.00499999',0]]) {
  const f=source(value,0,value); assert.equal(sum(f).cents.totalSales,expected);
 }
});
test('1000 deterministic decimal samples agree with a BigInt cent oracle', () => {
 let seed=73;
 for(let i=0;i<1000;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const whole=BigInt(seed)*100n, frac=String(seed%1000).padStart(3,'0');
  const expected=Number(whole*100n+BigInt(frac.slice(0,2))+(frac[2]>='5'?1n:0n));
  assert.equal(sum(source(whole+'.'+frac,0,whole+'.'+frac)).cents.totalSales,expected);
 }
});
test('numeric scientific notation remains supported without accepting ambiguous string exponents',()=>{
 assert.equal(sum(source(1e-7,0,1e-7)).cents.totalSales,0);
 assert.throws(()=>sum(source('1e3',0,'1e3')));
});
test('unsafe integer-cent amounts and nonfinite scalars are rejected',()=>{
 for(const value of ['90071992547409.92',1e200,Infinity,NaN,true,{},'\t'])assert.throws(()=>sum(source(value,0,value)));
});
test('legacy delayed totals retain compatibility but now require explicit source review',()=>{
 const f=source();f.rows[0].total=0;const result=sum(f);
 assert.equal(result.totalSales,150);assert.equal(result.reviewRequired,true);
 assert.equal(result.months[0].status,'inferred');assert.deepEqual(Array.from(result.coverage.inferredMonths),[10]);
});
test('missing optional components can never be silently called fully matched',()=>{
 const f=source(0,50,50);delete f.rows[0].pos;
 const r=sum(f);assert.equal(r.reviewRequired,true);assert.equal(r.months[0].status,'inferred');
});
test('explicit zero differs from unregistered and absent monthly records',()=>{
 const f=source(0,0,0);let r=sum(f);assert.equal(r.canIssue,true);assert.equal(r.reviewRequired,false);assert.equal(r.months[0].status,'zero');
 f.rows=[{month:10,exists:false}];r=sum(f);assert.equal(r.canIssue,false);assert.equal(r.reviewRequired,true);assert.equal(r.months[0].status,'unregistered');
 f.rows=[];r=sum(f);assert.equal(r.canIssue,false);assert.deepEqual(Array.from(r.coverage.missingMonths),[10]);
});
test('partial periods disclose every missing month while preserving reconciled totals',()=>{
 const f=source();f.params.startMonth=9;f.params.endMonth=11;const r=sum(f);
 assert.equal(r.canIssue,true);assert.equal(r.reviewRequired,true);assert.equal(r.totalFees,3.75);assert.equal(r.coverage.confirmedCount,1);
 assert.deepEqual(Array.from(r.coverage.missingMonths),[9,11]);
});
test('total-only legacy records remain supported and distinctly flagged',()=>{
 const f=source(0,0,150);f.rows[0].totalOnly=true;const r=sum(f);
 assert.equal(r.canIssue,true);assert.equal(r.reviewRequired,true);assert.equal(r.months[0].status,'totalOnly');
});
test('invalid years are rejected in the math layer',()=>{
 for(const year of ['0000','1899','10000','xx26']){const f=source();f.params.targetYear=year;assert.throws(()=>sum(f));}
});
test('settings drafts save only whitelisted fields, never tokens, sales, or acknowledged state',()=>{
 const s=store(),v={...settings(),token:'DO_NOT_STORE',sales:1234,reviewAcknowledged:true};assert.equal(s.api.save('ACCOUNT_A',v,100).ok,true);
 const stored=[...s.data.values()][0];assert.ok(!stored.includes('DO_NOT_STORE'));assert.ok(!stored.includes('sales'));assert.ok(!stored.includes('reviewAcknowledged'));
 const restored=s.api.load('ACCOUNT_A',200);assert.equal(restored.ok,true);assert.equal(restored.values.note,v.note);
});
test('account changes cannot restore another account draft and remove it',()=>{
 const s=store();s.api.save('ACCOUNT_A',settings(),100);assert.equal(s.api.load('ACCOUNT_B',101).reason,'owner');assert.equal(s.data.size,0);
});
test('drafts expire after 24 hours and reject future-dated storage',()=>{
 for(const now of [100+draft.ttlMs+1,99]){const s=store();s.api.save('A',settings(),100);assert.equal(s.api.load('A',now).reason,'expired');assert.equal(s.data.size,0);}
});
test('corrupt and oversized stored drafts cannot break the invoice page',()=>{
 for(const raw of ['{bad','null','[]','x'.repeat(13000)]){const s=store();s.data.set('y2c_invoice_settings_v1',raw);assert.equal(s.api.load('A',200).ok,false);assert.equal(s.data.size,0);}
});
test('storage denial returns a recoverable result without throwing',()=>{
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};
 const api=draft.create(blocked);assert.equal(api.save('A',settings(),100).reason,'storage');assert.equal(api.load('A',101).reason,'storage');assert.equal(api.clear(),false);
 const none=draft.create(null);assert.equal(none.load('A').reason,'storage');
});
test('invalid dates, terms, rates, text and reversed periods cannot be saved',()=>{
 for(const patch of [{issue:'2026-02-29'},{due:'2026-10-31'},{terms:'7'},{advisory:'0.050'},{start:'12',end:'1'},{note:'x'.repeat(301)},{note:'a\nb\nc\nd\ne'},{reference:'a\nb'},{reference:'x'.repeat(65)}]){
  const s=store();assert.equal(s.api.save('A',{...settings(),...patch},100).ok,false);assert.equal(s.data.size,0);
 }
});
test('new 0.1 percent rates and custom due dates are valid draft settings',()=>{
 const s=store();assert.equal(s.api.save('A',{...settings(),advisory:'0.023',terms:'custom',due:'2026-12-08'},100).ok,true);
});
test('clearing saved settings does not mutate the input draft object',()=>{
 const s=store(),v=settings();s.api.save('A',v,100);assert.equal(s.api.clear(),true);assert.equal(s.api.load('A',101).reason,'empty');assert.equal(v.client,'Sample');
});

test('string status flags and contradictory total-only markers are rejected',()=>{
 for(const patch of [{exists:'false'},{totalOnly:'true'},{totalOnly:true}]){const f=source();Object.assign(f.rows[0],patch);assert.throws(()=>sum(f));}
});
