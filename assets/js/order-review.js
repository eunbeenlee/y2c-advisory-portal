/* Order review only. Closing never writes or clears a cart. */
(function(root){
 'use strict';const t=(ko,en)=>window.Y2C_UX?Y2C_UX.t(ko,en):ko;let active=null;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const money=x=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(x);
 root.Y2C_OrderReview={open(quote){
  if(active)return Promise.resolve(false);
  return new Promise(resolve=>{
   const focus=document.activeElement,dialog=node('dialog',undefined,'y2c-order-review');active=dialog;
   dialog.id='orderReviewDialog';dialog.setAttribute('aria-labelledby','orderReviewTitle');
   const head=node('header',undefined,'order-review-head'),badge=node('span','ORDER REVIEW · '+quote.region,'order-review-eyebrow'),title=node('h2',t('발주 내용 확인','Review order')),close=node('button','×','order-review-close');
   title.id='orderReviewTitle';close.type='button';close.setAttribute('aria-label',t('닫기','Close'));head.append(badge,title,node('p',t('품목과 예상 금액을 확인한 후 발주를 확정하세요.','Review items and estimated charges before confirming.')),close);
   const body=node('div',undefined,'order-review-body'),list=node('div',undefined,'order-review-lines');
   for(const line of quote.lines){
    const card=node('article',undefined,'order-review-item');card.append(node('span',line.code,'order-review-code'),node('h3',line.name),node('p',line.qty+t('박스 × ',' boxes × ')+money(line.price)));
    const values=node('dl',undefined,'order-review-item-totals');
    for(const [label,value] of [[t('상품 금액','Subtotal'),line.subtotal],[t('세금 (','Tax (')+Number((line.rate*100).toFixed(3))+'%)',line.tax]]){values.append(node('dt',label),node('dd',money(value)));}
    card.append(values);list.append(card);
   }
   const totals=node('dl',undefined,'order-review-totals');
   for(const [label,value,id] of [[t('상품 금액','Subtotal'),quote.subtotal,'orderReviewSubtotal'],[t('예상 세금','Estimated tax'),quote.tax,'orderReviewTax'],[t('예상 총액 (CAD)','Estimated total (CAD)'),quote.total,'orderReviewTotal']]){const dt=node('dt',label),dd=node('dd',money(value));dd.id=id;if(id==='orderReviewTotal'){dt.className=dd.className='order-review-grand';}totals.append(dt,dd);}
   body.append(list,totals,node('p',t('표시 금액은 예상값입니다. 저장 시 최신 단가와 세금 설정으로 재계산합니다.','These are estimates. Current prices and tax settings are recalculated when saving.'),'order-review-note'),node('p',t('주문 시 수량을 예약하고, 벤더 출고 시 실물 재고를 차감합니다. 수령 후 발주 내역에서 수령 확인을 눌러주세요.','Quantities are reserved at order and physical stock is deducted at shipment. Confirm receipt in order history after delivery.'),'order-review-note'));
   const footer=node('footer',undefined,'order-review-actions'),cancel=node('button',t('돌아가기','Go back'),'order-review-secondary'),confirm=node('button',t('발주 확정','Confirm order'),'order-review-primary');cancel.type=confirm.type='button';cancel.id='orderReviewCancel';confirm.id='orderReviewConfirm';footer.append(cancel,confirm);
   let settled=false;const finish=accepted=>{if(settled)return;settled=true;dialog.close();dialog.remove();active=null;if(focus&&focus.isConnected)focus.focus();resolve(accepted);};
   close.addEventListener('click',()=>finish(false));cancel.addEventListener('click',()=>finish(false));confirm.addEventListener('click',()=>finish(true));dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});dialog.addEventListener('close',()=>finish(false));
   dialog.append(head,body,footer);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
 }};
})(window);
