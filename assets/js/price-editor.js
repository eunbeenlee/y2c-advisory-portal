/* Regional price edits retain durable request identities and optimistic concurrency. */
(function(global){
 'use strict';const t=(ko,en)=>window.Y2C_UX?Y2C_UX.t(ko,en):ko;let dialog=null,returnFocus=null,busy=false;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 global.Y2C_PriceEditor={open(item,region,refresh){
  if(dialog||!item.canChangePrice)return;
  const owner=Y2C_AuthEngine.getAccountId();returnFocus=document.activeElement;
  dialog=node('dialog');dialog.className='y2c-price-review';dialog.setAttribute('aria-label',t('지역별 가격 변경','Regional price change'));dialog.style.cssText='width:min(440px,calc(100vw - 32px));max-height:90dvh;overflow:auto;padding:24px;border:1px solid #ddd;border-radius:18px';
  const form=node('form'),title=node('h2',t('가격 변경 · ','Price change · ')+region),desc=node('p',item.code+' · '+item.name+t(' / 박스당 CAD',' / CAD per box')),price=node('input'),reason=node('input'),save=node('button',t('변경 저장','Save change')),cancel=node('button',t('닫기','Close')),message=node('p');
  save.className='order-review-primary';cancel.className='order-review-secondary';title.style.fontWeight='800';price.type='number';price.min='0';price.step='0.01';price.required=true;price.value=item.priceAvailable===false?'':String(item.price);price.id='regionalPriceValue';price.inputMode='decimal';
  reason.id='regionalPriceReason';reason.required=true;reason.minLength=3;reason.maxLength=300;save.type='submit';cancel.type='button';message.setAttribute('role','status');
  for(const [input,text] of [[price,t('새 가격 (CAD / 박스)','New price (CAD / box)')],[reason,t('변경 사유','Reason for change')]]){const label=node('label',text);label.htmlFor=input.id;label.style.cssText='display:block;margin-top:16px';input.style.cssText='display:block;width:100%;min-height:44px;padding:8px;border:1px solid #aaa;border-radius:8px';form.append(label,input);}
  for(const b of [save,cancel])b.style.cssText='min-height:44px;padding:10px 16px;margin:16px 8px 0 0;border:1px solid #aaa;border-radius:10px';
  const close=()=>{if(busy)return;dialog.close();dialog.remove();dialog=null;returnFocus?.focus();};cancel.addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  form.append(message,save,cancel);dialog.append(title,desc,node('p',t('기존 주문 금액은 유지됩니다. 변경 전후 값과 회사 계정이 기록됩니다.','Existing order amounts are retained. Before and after prices and the company account are recorded.')),form);document.body.append(dialog);dialog.showModal();price.focus();
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy||!form.reportValidity())return;if(!navigator.onLine){message.textContent=t('온라인 연결 후 저장해 주세요.','Connect to the internet before saving.');return;}
   busy=true;window.Y2C_UX?.busy(save,true);save.disabled=cancel.disabled=true;price.disabled=reason.disabled=true;message.textContent=t('저장 결과 확인 중…','Checking save result…');
   try{const r=await Y2C_AuthEngine.request('update_price',{code:item.code,clientState:region,price:Number(price.value),expectedPrice:item.priceAvailable===false?null:Number(item.price),reason:reason.value.trim()});if(owner!==Y2C_AuthEngine.getAccountId())throw Error(t('계정이 변경되었습니다. 다시 로그인하세요.','The account has changed. Sign in again.'));
    if(r.offlineQueued||r.inFlight){document.dispatchEvent(new Event('y2c-price-pending'));message.textContent=r.message||'기기에 보존했습니다. 서버 확인 대기 중입니다. 같은 내용으로 다시 확인하세요.';return;}
    if(!r.success)throw Error(r.message||t('저장 결과를 확인할 수 없습니다.','Unable to confirm the save result.'));await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);busy=false;close();document.dispatchEvent(new Event('y2c-operations-updated'));await refresh();
   }catch(error){if(dialog)message.textContent=error.message;else Y2C_AuthEngine.showToast(t('가격 저장 후 목록 조회 실패. 새로고침하세요.','Price saved, but the list could not refresh. Refresh the list.'),'warning');}
   finally{busy=false;window.Y2C_UX?.busy(save,false);save.disabled=cancel.disabled=price.disabled=reason.disabled=false;}
  });
 }};
})(window);
