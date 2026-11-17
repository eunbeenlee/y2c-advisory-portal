#!/usr/bin/env python3
"""Offline Chromium source-rendering QA. No website navigation or live API calls.

Run: python tests/source-browser.py --browser /usr/bin/chromium --output /tmp/portal-qa
Requires Python playwright, beautifulsoup4 and PyMuPDF; Chromium must be available.
This inlines repository CSS/JS/images into a browser document, preserves script
order, and substitutes memory storage plus synthetic AuthEngine responses.
It tests real rendering/events and native print PDFs, NOT hosted routing,
service-worker installation, live permissions or actual PDF rasterization (see native-pdf-browser.py).
"""
import argparse, base64, json, mimetypes, re, subprocess, sys
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def fixture(name):
    if name == 'invoice':
        return subprocess.check_output(['node','-e',"process.stdout.write(require('./tests/invoice-fixture.js').fixtureCode)"],cwd=ROOT,text=True)
    source = (ROOT/'tests/ui-browser.js').read_text()
    start = source.index('const fixture=`')
    end = source.index('\n(async()=>', start)
    return subprocess.check_output(['node','-e',"const vm=require('node:vm');process.stdout.write(vm.runInNewContext("+json.dumps(source[start:end]+'\nfixture;')+"))"],text=True)

def data_uri(file):
    return 'data:'+ (mimetypes.guess_type(str(file))[0] or 'application/octet-stream')+';base64,'+base64.b64encode(file.read_bytes()).decode()

def local_resource(value, base):
    if re.match(r'^(?:https?:|data:|blob:|#|//)',value): return None
    file = (base/value.split('?')[0].split('#')[0]).resolve()
    if ROOT not in file.parents or not file.is_file(): return None
    return file

def inline_css(css, base):
    def sub(match):
        value = match[1].strip(' \"\'')
        file = local_resource(value, base)
        return 'url("'+data_uri(file)+'")' if file else match[0]
    return re.sub(r'url\(([^)]+)\)',sub,css)

PDF_STUB = r"""
window.__pdfHarness={saves:[],mode:'normal',pending:[],calls:0};
window.Y2C_InvoicePDF={render:async(element)=>{window.__pdfHarness.calls++;
  if(window.__pdfHarness.mode==='slow')await new Promise(resolve=>window.__pdfHarness.pending.push(resolve));
  if(window.__pdfHarness.mode==='failure')throw Error('Synthetic PDF render failure');
  return {save:filename=>window.__pdfHarness.saves.push({filename,issue:element.querySelector('#docIssueDate').textContent,due:element.querySelector('#docDueDate').textContent,rows:element.querySelectorAll('#valInvoiceLines tr').length})};
}};

"""

def document(name):
    soup = BeautifulSoup((ROOT/(name+'.html')).read_text(),'html.parser')
    for link in list(soup.find_all('link')):
        if 'stylesheet' in link.get('rel',[]):
            file=local_resource(link.get('href',''),ROOT)
            if file:
                style=soup.new_tag('style');style.string=inline_css(file.read_text(),file.parent);link.replace_with(style);continue
        link.decompose()
    for style in soup.find_all('style'):
        if style.string: style.string=inline_css(style.string,ROOT)
    for img in soup.find_all('img'):
        file=local_resource(img.get('src',''),ROOT)
        if file: img['src']=data_uri(file)
    deferred=[]
    for script in list(soup.find_all('script')):
        src=script.get('src')
        if src:
            code=''
            if src=='assets/js/auth.js':code=fixture(name)
            elif src=='assets/js/invoice-pdf.js':code=PDF_STUB
            elif src.startswith('http'): code=''
            else:
                file=local_resource(src,ROOT)
                if file:code=file.read_text()
            new=soup.new_tag('script');new.string=code.replace('</script','<\\/script')
            if script.has_attr('defer'):deferred.append(new);script.decompose()
            else:script.replace_with(new)
    for script in deferred:soup.body.append(script)
    return str(soup)

STORAGE = r"""({name,role})=>{
 for(const key of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,key,{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i]||null,get length(){return m.size;}}});}
 localStorage.setItem('y2c_lang','en');
 if(name!=='index'){
  const claims={id:'LOCAL_ONLY_UI_ACCOUNT',role,clientName:name==='invoice'?'Test HQ':role==='PARTNER'?'Sample Toronto':'Sample HQ',region:'ON',allowedStates:['ON'],exp:2000000000};
  localStorage.setItem('y2c_token','local.'+btoa(JSON.stringify(claims))+'.fixture');localStorage.setItem('y2c_role',role);localStorage.setItem('y2c_client',claims.clientName);localStorage.setItem('y2c_region','ON');
 }
 window.__blockedRequests=[];
 window.fetch=(url)=>{window.__blockedRequests.push(String(url));return Promise.reject(new Error('External network disabled in offline source QA'));};
}"""

def run(args):
    out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
    results=[]
    def check(name,condition,detail=None):
        if not condition:raise AssertionError(name+': '+str(detail))
        results.append({'name':name,'passed':True});print('PASS',name,flush=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            context=browser.new_context(viewport={'width':1440,'height':1000},locale='en-CA',timezone_id='America/Toronto',service_workers='block',reduced_motion='reduce')
            context.route('**/*',lambda route:route.abort('blockedbyclient'))
            page=context.new_page();page.set_default_timeout(6000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.evaluate(STORAGE,{'name':'invoice','role':'MASTER'})
            page.clock.install(time=__import__('datetime').datetime.fromisoformat('2026-01-10T17:00:00+00:00'))
            page.set_content(document('invoice'),wait_until='load')
            page.wait_for_function("document.querySelector('#invClientSelector').options.length>1")
            check('January starts with previous December',page.input_value('#invYearSelector')=='2025' and page.input_value('#invStartSelector')=='12')
            def select(id,value):page.select_option('#'+id,value)
            select('invClientSelector','Test Toronto');select('invYearSelector','2026');select('invStartSelector','10');select('invEndSelector','10');select('invAdFeeRate','0.005')
            page.fill('#invIssueDate','2026-11-01');select('invPaymentTerms','7')
            def generate(expect_export=True):
                page.locator('#btnGenerateInvoice').click();page.wait_for_function("!document.querySelector('#btnGenerateInvoice').disabled")
                check('generation completes with expected export gate ('+str(expect_export)+')',(not page.is_disabled('#btnExportPDF'))==expect_export,page.inner_text('#invoiceResultStatus'))
            generate()
            check('chosen issue and due dates are on the real document',page.inner_text('#docIssueDate')=='2026-11-01' and page.inner_text('#docDueDate')=='2026-11-08')
            check('review panel and document reconcile in cents','37.51' in page.inner_text('#reviewFees') and '37.51' in page.inner_text('#valGrandTotal'))
            page.fill('#invDueDate','2026-11-20');page.fill('#invIssueDate','2026-11-02')
            check('custom due date survives issue-date editing',page.input_value('#invDueDate')=='2026-11-20')
            check('editing disables PDF and native print',all(page.is_disabled('#'+i) for i in ['btnExportPDF','btnDownloadPdf','btnPrintInvoice']))
            generate()
            page.evaluate("() => {window.__invoiceTest.revision++;window.__invoiceTest.readListeners.forEach(fn=>fn({reason:'mutation-committed'}));}")
            check('a source-data revision immediately invalidates prior output',page.is_disabled('#btnExportPDF') and page.inner_text('#reviewFees')=='—')
            generate()
            page.fill('#invDueDate','2026-10-31');calls=page.evaluate('window.__invoiceTest.calls.length')
            page.locator('#btnGenerateInvoice').click()
            check('reversed payment dates do not call the API',page.evaluate('window.__invoiceTest.calls.length')==calls and page.locator('#invoiceDateValidation').is_visible())
            page.fill('#invDueDate','2026-11-20')
            page.evaluate("window.__invoiceTest.mode='slow'");page.click('#btnGenerateInvoice');page.wait_for_function('window.__invoiceTest.pending.length===2')
            page.click('#btnCancelInvoice');check('query cancellation restores inputs and generation',not page.is_disabled('#btnGenerateInvoice') and page.is_disabled('#btnExportPDF'))
            page.evaluate("() => {window.__invoiceTest.mode='normal';window.__invoiceTest.pending.splice(0).forEach(fn=>fn());}")
            page.wait_for_timeout(50);check('cancelled late responses cannot publish an invoice',page.is_disabled('#btnExportPDF'))
            # A cancelled old request must not unlock or overwrite its replacement.
            page.evaluate("window.__invoiceTest.mode='slow'");page.click('#btnGenerateInvoice');page.wait_for_function('window.__invoiceTest.pending.length===2')
            page.click('#btnCancelInvoice');page.click('#btnGenerateInvoice');page.wait_for_function('window.__invoiceTest.pending.length===4')
            page.evaluate('window.__invoiceTest.pending.splice(0,2).forEach(fn=>fn())');page.wait_for_timeout(50)
            check('late cancelled request cannot unlock its replacement',page.is_disabled('#btnGenerateInvoice') and page.is_disabled('#btnExportPDF'))
            page.evaluate("() => {window.__invoiceTest.mode='normal';window.__invoiceTest.pending.splice(0).forEach(fn=>fn());}")
            page.wait_for_function("!document.querySelector('#btnGenerateInvoice').disabled")
            check('replacement request alone can publish a ready invoice',not page.is_disabled('#btnExportPDF'))
            page.evaluate("window.__invoiceTest.mode='slow'");page.click('#btnGenerateInvoice');page.wait_for_function('window.__invoiceTest.pending.length===2')
            page.evaluate("() => {window.__invoiceTest.revision++;window.__invoiceTest.readListeners.forEach(fn=>fn());window.__invoiceTest.mode='normal';window.__invoiceTest.pending.splice(0).forEach(fn=>fn());}")
            page.wait_for_function("!document.querySelector('#btnGenerateInvoice').disabled")
            check('source changes during a query reject the returned preview',page.is_disabled('#btnExportPDF') and 'Source data changed' in page.inner_text('#invoiceResultStatus'))
            # Ctrl+P/native browser printing cannot leak a previously rendered stale bill.
            page.pdf(path=str(out/'invoice-stale-print.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
            import fitz
            stale=fitz.open(out/'invoice-stale-print.pdf');stale_text='\n'.join(pg.get_text() for pg in stale);stale.close()
            check('native print blocks a stale invoice and prints an explanatory notice','Generate an invoice with the current selections' in stale_text and '37.51' not in stale_text,stale_text)
            for mode in ['failure','malformed','mismatch']:
                page.evaluate("window.__invoiceTest.mode='"+mode+"'");page.click('#btnGenerateInvoice');page.wait_for_function("!document.querySelector('#btnGenerateInvoice').disabled")
                check('invoice rejects '+mode+' responses and restores retry',page.is_disabled('#btnExportPDF') and page.inner_text('#invoiceStateBadge')=='Review required')
            page.evaluate("window.__invoiceTest.mode='normal'")
            generate()
            page.evaluate("window.__pdfHarness.mode='slow'");page.click('#btnExportPDF');page.wait_for_function('window.__pdfHarness.pending.length===1')
            check('PDF preparation locks editable financial fields',page.is_disabled('#invDueDate') and page.is_disabled('#invAdvisoryRate'))
            page.click('#btnCancelPDF');page.wait_for_function('!window.Y2C_DocumentIO.isBusy()')
            page.evaluate("() => {window.__pdfHarness.mode='normal';window.__pdfHarness.pending.splice(0).forEach(fn=>fn());}")
            page.wait_for_timeout(50);check('PDF cancellation blocks a late save and removes export clone',page.evaluate('window.__pdfHarness.saves.length')==0 and page.locator('.document-export-host').count()==0)
            page.click('#btnExportPDF');page.wait_for_function('!window.Y2C_DocumentIO.isBusy()')
            check('PDF control flow saves exactly the selected dates',page.evaluate('window.__pdfHarness.saves[0].due')=='2026-11-20')
            page.evaluate("() => {window.scrollTo(0,0);document.getElementById('invoiceControls').scrollTop=0;}")
            page.screenshot(path=str(out/'invoice-desktop.png'),full_page=True)
            page.pdf(path=str(out/'invoice-one-month-print.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
            import fitz
            printed=fitz.open(out/'invoice-one-month-print.pdf')
            printed_text='\n'.join(p.get_text() for p in printed)
            check('native one-month print is not blank and includes the total and due date', '37.51' in printed_text and '2026-11-20' in printed_text, printed_text[:300])
            check('native one-month invoice stays on one page',len(printed)==1,len(printed))
            for i,pg in enumerate(printed):pg.get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(out/f'invoice-one-month-print-{i+1}.png')
            printed.close()
            page.evaluate("window.__invoiceTest.mode='year'");page.click('#btnInvoiceFullYear');generate()
            check('all 24 annual fee lines survive rendering',page.locator('#valInvoiceLines tr').count()==24 and '450.12' in page.inner_text('#valGrandTotal'))
            page.pdf(path=str(out/'invoice-twelve-months-print.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
            printed=fitz.open(out/'invoice-twelve-months-print.pdf');annual='\n'.join(p.get_text() for p in printed)
            check('native annual PDF retains all 24 line descriptions', annual.count('Advisory & Management Fee')==12 and annual.count('Local Advertising Contribution')==12, annual)
            check('native annual PDF retains total, bank and payment terms',all(v in annual for v in ['450.12','PUSBKR2P','Net 18 days']),annual)
            check('every annual print page has invoice content',all(len(pg.get_text().strip())>25 for pg in printed))
            for i,pg in enumerate(printed):pg.get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(out/f'invoice-twelve-months-print-{i+1}.png')
            printed.close()
            page.evaluate("window.__invoiceTest.mode='normal'");select('invStartSelector','9');select('invEndSelector','11');generate(False)
            check('missing monthly records are clearly flagged',page.locator('#invoiceCoverageNote').is_visible() and '9, 11' in page.inner_text('#invoiceCoverageNote'))
            check('partial records block all output until reviewed', all(page.is_disabled('#'+i) for i in ['btnExportPDF','btnDownloadPdf','btnPrintInvoice']))
            check('monthly audit includes missing months and source status',page.locator('#invoiceAuditRows tr').count()==3 and page.locator('#invoiceAuditRows tr[data-state="missing"]').count()==2)
            page.check('#invoiceReviewAck')
            check('explicit review enables scoped output without removing its note',not page.is_disabled('#btnExportPDF') and '9, 11' in page.inner_text('#docScopeNote'))
            page.uncheck('#invoiceReviewAck')
            check('withdrawing review locks output again',page.is_disabled('#btnExportPDF'))
            page.check('#invoiceReviewAck')
            page.evaluate("window.changeLanguage('ko')")
            check('language switch preserves scoped ready-state and dates',not page.is_disabled('#btnExportPDF') and page.inner_text('#invoiceStateBadge')=='주의사항 포함')
            page.evaluate("window.changeLanguage('en')")
            select('invStartSelector','10');select('invEndSelector','10');generate()
            check('editing conditions resets previous review acknowledgement',not page.is_checked('#invoiceReviewAck'))
            # Note input is plain text, appears in output, and invalidates previous output.
            page.fill('#invNote', 'Payment reference: INV-SAMPLE\nPlease confirm receipt.')
            check('note editing invalidates the previous output',page.is_disabled('#btnExportPDF'))
            generate()
            check('note is rendered on the document as plain text','Please confirm receipt.' in page.inner_text('#docMemo'))
            page.fill('#invNote','<img src=x onerror="window.__unexpectedNote=true">');generate()
            check('invoice note markup is text, never executable DOM',page.locator('#docMemo img').count()==0 and page.evaluate('window.__unexpectedNote===undefined'))
            page.fill('#invNote','one\ntwo\nthree\nfour\nfive')
            calls=page.evaluate('window.__invoiceTest.calls.length');page.click('#btnGenerateInvoice')
            check('a note exceeding four lines is rejected before any API request',page.evaluate('window.__invoiceTest.calls.length')==calls and page.locator('#invoiceTextValidation').is_visible())
            page.fill('#invNote','Payment reference: INV-SAMPLE\nPlease confirm receipt.')
            select('invAdvisoryRate','0.023');generate()
            check('0.1 percentage-point fee settings work end to end','42.01' in page.inner_text('#valGrandTotal'))
            page.locator('.invoice-draft-tools summary').click();page.click('#btnSaveInvoiceSettings')
            check('settings draft saves in this tab without sales data',page.evaluate("!sessionStorage.getItem('y2c_invoice_settings_v1').includes('totalSales')") and not page.is_disabled('#btnRestoreInvoiceSettings'))
            page.fill('#invDueDate','2026-12-20');page.fill('#invNote','Changed note');page.click('#btnRestoreInvoiceSettings')
            check('restoring settings restores dates and note but never enables previous output',page.input_value('#invDueDate')=='2026-11-20' and 'Please confirm receipt.' in page.input_value('#invNote') and page.is_disabled('#btnExportPDF'))
            generate();page.click('#btnClearInvoiceSettings')
            check('clearing a saved draft leaves the current invoice intact',not page.is_disabled('#btnExportPDF') and page.evaluate("sessionStorage.getItem('y2c_invoice_settings_v1')===null"))
            # A read cannot keep the workspace locked indefinitely.
            page.evaluate("window.__invoiceTest.mode='slow'");page.click('#btnGenerateInvoice');page.wait_for_function('window.__invoiceTest.pending.length===2')
            page.clock.fast_forward(46000)
            check('45-second preview deadline restores retry and keeps export disabled',not page.is_disabled('#btnGenerateInvoice') and page.is_disabled('#btnExportPDF'))
            page.evaluate("() => {window.__invoiceTest.mode='normal';window.__invoiceTest.pending.splice(0).forEach(fn=>fn());}")
            page.wait_for_timeout(50)
            check('a response arriving after preview timeout cannot publish a document',page.is_disabled('#btnExportPDF'))
            generate()
            # Explicit zero records remain valid; missing and unregistered data do not become zero invoices.
            page.evaluate("() => {window.__invoiceTest.recordsOverride=[{month:10,pos:0,delivery:0,total:0}];}")
            generate()
            check('explicit zero monthly records can produce a zero invoice without a warning acknowledgement', '$0.00' in page.inner_text('#valGrandTotal') and not page.locator('#invoiceReviewAckGroup').is_visible())
            page.evaluate("() => {window.__invoiceTest.recordsOverride=[{month:10,exists:false}];window.__invoiceTest.invoiceOverride={posSales:0,deliverySales:0,totalSales:0};}")
            generate(False)
            check('all-unregistered sales cannot create a misleading zero invoice',page.inner_text('#invoiceStateBadge')=='Review required' and page.locator('#invoiceErrorDetail').is_visible())
            page.evaluate("() => {window.__invoiceTest.recordsOverride=[{month:10,pos:1000.25,delivery:500.15,total:0}];window.__invoiceTest.invoiceOverride={posSales:1000.25,deliverySales:500.15,totalSales:1500.40};}")
            generate(False)
            check('legacy zero total is preserved only with visible inferred-data review',page.locator('#invoiceAuditRows tr[data-state="inferred"]').count()==1 and page.is_disabled('#btnExportPDF'))
            page.check('#invoiceReviewAck')
            check('reviewed inferred data keeps its permanent printed scope note','Component-derived totals' in page.inner_text('#docScopeNote'))
            page.pdf(path=str(out/'invoice-scoped-note-print.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
            printed=fitz.open(out/'invoice-scoped-note-print.pdf');scope_text='\n'.join(p.get_text() for p in printed)
            check('native printed invoice contains source scope and optional note','Component-derived totals' in scope_text and 'Please confirm receipt.' in scope_text)
            check('one-month source note and two-line memo do not orphan payment terms on another page',len(printed)==1 and 'Net 18 days' in scope_text,len(printed))
            for i,pg in enumerate(printed):pg.get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(out/f'invoice-scoped-note-print-{i+1}.png')
            printed.close()
            page.evaluate("() => {delete window.__invoiceTest.recordsOverride;delete window.__invoiceTest.invoiceOverride;}")
            generate()
            # A setting draft is scoped to the stable account identity, not a page-local race key.
            page.click('#btnSaveInvoiceSettings');page.evaluate("window.__invoiceTest.account='OTHER_TEST_ACCOUNT'")
            page.click('#btnRestoreInvoiceSettings')
            check('another account cannot restore saved invoice settings',page.is_disabled('#btnRestoreInvoiceSettings') and page.evaluate("sessionStorage.getItem('y2c_invoice_settings_v1')===null"))
            page.evaluate("delete window.__invoiceTest.account")
            # Capture current additions expanded in the delivered QA screenshot.
            page.locator('#invoiceAuditPanel').evaluate('(element)=>element.open=true')
            page.evaluate("() => {window.scrollTo(0,0);document.getElementById('invoiceControls').scrollTop=0;}")
            page.screenshot(path=str(out/'invoice-v32-review-desktop.png'),full_page=True)
            # Reset fee/memo for deterministic source-print examples.
            select('invAdvisoryRate','0.020');page.fill('#invNote','');generate()
            page.evaluate("window.changeLanguage('ko')")
            for width in [1440,1280,1100,1024,768,390,360]:
                page.set_viewport_size({'width':width,'height':900 if width>767 else 844})
                dim=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                check('invoice page has no horizontal overflow at '+str(width)+'px',dim['scroll']<=dim['width']+1,dim)
                if width==390:
                    page.evaluate('window.scrollTo(0,0)')
                    page.screenshot(path=str(out/'invoice-mobile.png'),full_page=True)
            check('invoice source execution has no uncaught JavaScript errors',not errors,errors)
            check('invoice uses only synthetic read actions',all(c['action'].startswith('get_') for c in page.evaluate('window.__invoiceTest.calls')))
            context.close()
            # Other key screens, rendered at both desktop and phone widths.
            for name in ['index','dashboard','admin','items','recipes']:
                for width in [1440,390]:
                    context=browser.new_context(viewport={'width':width,'height':900 if width>767 else 844},locale='en-CA',timezone_id='America/Toronto',service_workers='block',reduced_motion='reduce')
                    context.route('**/*',lambda route:route.abort('blockedbyclient'))
                    page=context.new_page();page.set_default_timeout(6000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    page.evaluate(STORAGE,{'name':name,'role':'PARTNER' if name=='items' else 'MASTER'})
                    page.set_content(document(name),wait_until='load');page.wait_for_timeout(250)
                    dim=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                    check(f'{name} has no page overflow at {width}px',dim['scroll']<=dim['width']+1,dim)
                    check(f'{name} has no uncaught errors at {width}px',not errors,errors)
                    check(f'{name} performs no business writes at {width}px',page.evaluate('window.__uiFixture.writes.length')==0)
                    page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
                    if name=='admin':
                        for tab in ['tab-sales','tab-excel','tab-procurement']:
                            page.locator('#adminSubNav [data-target="'+tab+'"]').click();check('admin opens '+tab+' at '+str(width),page.locator('#'+tab).is_visible())
                    if name=='recipes':
                        page.locator('[data-recipe-id]').first.click();check('recipe detail opens at '+str(width),page.locator('#recipeModalPanel').is_visible());page.keyboard.press('Escape');page.wait_for_function("document.querySelector('#recipeModal').classList.contains('hidden')")
                    context.close()
        finally:browser.close()
    (out/'source-browser-results.json').write_text(json.dumps({'passed':len(results),'results':results,'mode':'in-memory source rendering','nativePrintPdfRendered':True,'html2pdfRendererTested':False,'hostedRoutingTested':False,'liveBusinessApiTested':False},ensure_ascii=False,indent=2))
    print(json.dumps({'passed':len(results),'output':str(out)}))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--browser',default='/usr/bin/chromium');parser.add_argument('--output',required=True)
    run(parser.parse_args())
