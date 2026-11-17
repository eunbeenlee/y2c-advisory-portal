#!/usr/bin/env python3
"""Real Canvas -> JPEG -> PDF -> browser download QA, entirely in memory.
No hosted routing, production account, business API, or third-party PDF mock.
Run python tests/native-pdf-browser.py --output /tmp/native-pdf-qa
Requires playwright, beautifulsoup4, PyMuPDF, Pillow and installed Chromium.
"""
import argparse,importlib.util,json,sys
from pathlib import Path
import fitz
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('source_qa',ROOT/'tests/source-browser.py');source=importlib.util.module_from_spec(spec);spec.loader.exec_module(source)

def run(args):
 out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True);checks=[];results=[]
 def check(name,cond,detail=None):
  if not cond:raise AssertionError(name+': '+str(detail))
  checks.append({'name':name,'passed':True});print('PASS',name,flush=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   context=browser.new_context(viewport={'width':1440,'height':1000},locale='en-CA',timezone_id='America/Toronto',service_workers='block',accept_downloads=True,reduced_motion='reduce')
   context.route('**/*',lambda r:r.abort('blockedbyclient'))
   page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.evaluate(source.STORAGE,{'name':'invoice','role':'MASTER'});page.set_content(source.document('invoice'),wait_until='load')
   # Replace only the pre-existing control-flow suite's renderer mock with the actual shipped module.
   page.add_script_tag(content=(ROOT/'assets/js/invoice-pdf.js').read_text())
   page.wait_for_function("document.querySelector('#invClientSelector').options.length>1")
   for id,value in [('invClientSelector','Test Toronto'),('invYearSelector','2026'),('invStartSelector','10'),('invEndSelector','10'),('invAdFeeRate','0.005')]:page.select_option('#'+id,value)
   page.fill('#invIssueDate','2026-11-01');page.select_option('#invPaymentTerms','7')
   def generate():
    page.click('#btnGenerateInvoice');page.wait_for_function("!document.querySelector('#btnGenerateInvoice').disabled")
    if page.locator('#invoiceReviewAckGroup').is_visible():page.check('#invoiceReviewAck')
    check('generation enables output',not page.is_disabled('#btnExportPDF'),page.inner_text('#invoiceResultStatus'))
   def download(label,expected=None):
    # Capture the structured input passed to the actual renderer without substituting its implementation.
    page.evaluate("""()=>{const real=Y2C_InvoicePDF;window.Y2C_InvoicePDF={...real,render:async(el,opt)=>{window.__pdfInput=real.snapshot(el);const pdf=await real.render(el,opt);window.__realPdfMeta={pageCount:pdf.pageCount,byteLength:pdf.byteLength};return pdf;}};}""")
    with page.expect_download() as item:page.click('#btnExportPDF')
    download=item.value;file=out/(label+'.pdf');download.save_as(file)
    page.wait_for_function('!Y2C_DocumentIO.isBusy()')
    check(label+' is a real browser PDF download',download.failure() is None and file.read_bytes().startswith(b'%PDF-1.4'),download.failure())
    check(label+' restores inputs',not page.is_disabled('#invDueDate') and not page.is_disabled('#btnGenerateInvoice'))
    check(label+' removes temporary snapshot',page.locator('.document-export-host').count()==0)
    data=page.evaluate('window.__pdfInput');meta=page.evaluate('window.__realPdfMeta');doc=fitz.open(file)
    check(label+' parses with the declared page count',len(doc)==meta['pageCount'] and len(doc)>0)
    if expected is not None:check(label+' has expected pagination',len(doc)==expected,len(doc))
    for i,pg in enumerate(doc):
     pix=pg.get_pixmap(matrix=fitz.Matrix(1.0,1.0));png=out/(label+'-'+str(i+1)+'.png');pix.save(png)
     im=Image.open(png).convert('RGB');diff=ImageChops.difference(im,Image.new('RGB',im.size,'white'))
     check(label+' page '+str(i+1)+' is not blank',sum(ImageStat.Stat(diff).mean)>3)
     check(label+' page '+str(i+1)+' is A4',abs(pg.rect.width-595.276)<0.1 and abs(pg.rect.height-841.89)<0.1)
     check(label+' page '+str(i+1)+' keeps content inside margins',ImageStat.Stat(diff.crop((0,0,im.width,20))).mean==[0,0,0])
    doc.close();results.append({'label':label,'pages':meta['pageCount'],'bytes':file.stat().st_size,'name':download.suggested_filename,'input':data})
    return data
   generate();data=download('invoice-single-month',1)
   check('download uses selected issue and due dates',data['docIssueDate']=='2026-11-01' and data['docDueDate']=='2026-11-08')
   check('download retains cent-rounded fee amounts',data['valGrandTotal']=='$37.51' and len(data['rows'])==2,data['valGrandTotal'])
   page.evaluate("window.__invoiceTest.mode='year'");page.click('#btnInvoiceFullYear');generate();data=download('invoice-twelve-months',2)
   check('annual PDF input retains all 24 lines and $450.12',len(data['rows'])==24 and data['valGrandTotal']=='$450.12')
   page.evaluate("window.__invoiceTest.mode='normal'");page.select_option('#invStartSelector','10');page.select_option('#invEndSelector','10')
   page.fill('#invNote','입금 시 인보이스 번호를 기재해 주세요.\nPayment reference: 서울 – Toronto • 월별 정산\n감사합니다.');generate();data=download('invoice-korean-note',1)
   check('Korean memo is preserved in render input','서울' in data['memo'] and '감사합니다.' in data['memo'])
   # Very long, unspaced values and long memo must wrap, not be silently clipped.
   page.fill('#invInvoiceReference','INV-'+'A'*55);page.fill('#invNote','가나다라마바사아자차카타파하'*20);generate();data=download('invoice-long-note')
   check('long note not truncated',len(data['memo'])==280,len(data['memo']))
   page.fill('#invNote','');page.fill('#invInvoiceReference','');page.evaluate("window.__invoiceTest.recordsOverride=[{month:10,pos:0,delivery:0,total:0}]");generate();data=download('invoice-zero-sales',1)
   check('zero-sales PDF preserves explicit zero','$0.00'==data['valGrandTotal'] and len(data['rows'])==1)
   # Render guard tests use the real renderer; no PDF mock or artificial slow engine.
   page.evaluate("delete window.__invoiceTest.recordsOverride;window.__invoiceTest.mode='year'");page.click('#btnInvoiceFullYear');generate()
   outcome=page.evaluate("""async()=>{const original=document.querySelector('#invoiceDocument');let n=0;try{await Y2C_InvoicePDF.render(original,{check(){if(++n>=8)throw Object.assign(new Error('cancel test'),{code:'EXPORT_CANCELLED'});}});return 'unexpected';}catch(e){return e.code;}}""")
   check('actual renderer cooperatively stops between rows',outcome=='EXPORT_CANCELLED',outcome)
   before=len(page.evaluate('window.__pdfHarness.saves'))
   # Double dispatch plus immediate cancel exercises DocumentIO using the actual renderer.
   downloads=[];page.on('download',lambda d:downloads.append(d.suggested_filename))
   page.evaluate("()=>{document.querySelector('#btnExportPDF').click();document.querySelector('#btnExportPDF').click();Y2C_DocumentIO.cancelExport();}")
   page.wait_for_function('!Y2C_DocumentIO.isBusy()');page.wait_for_timeout(150)
   check('actual cancelled export emits no browser download',len(downloads)==0,downloads)
   check('cancelled export restores controls and removes clone',not page.is_disabled('#invDueDate') and page.locator('.document-export-host').count()==0)
   check('persistent cancellation message is visible',page.locator('#invoiceExportStatus').is_visible() and page.locator('#invoiceExportStatus').get_attribute('data-state')=='cancelled')
   page.set_viewport_size({'width':390,'height':844});generate();data=download('invoice-mobile-annual',2)
   check('mobile actual download has no full-page horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   page.screenshot(path=str(out/'invoice-mobile.png'),full_page=True)
   page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(out/'invoice-desktop.png'),full_page=True)
   check('no uncaught JS exceptions',not errors,errors)
   check('no live business calls or mutations',all(v['action'].startswith('get_') for v in page.evaluate('window.__invoiceTest.calls')))
   context.close()
  finally:browser.close()
 report={'result':'PASS','checksPassed':len(checks),'checks':checks,'downloads':results,'renderer':'actual shipped Canvas/JPEG/PDF module','businessApi':'synthetic','hostedRoutingTested':False,'serviceWorkerInstalled':False}
 (out/'native-pdf-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':len(checks),'downloads':len(results)}))
if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--browser',default='/usr/bin/chromium');ap.add_argument('--output',required=True);run(ap.parse_args())
