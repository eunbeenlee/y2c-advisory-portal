/* Regional price edits retain durable request identities and optimistic concurrency. */
(function(global){
 'use strict';let dialog=null,returnFocus=null,busy=false;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 global.Y2C_PriceEditor={open(item,region,refresh){
  if(dialog||!item.canChangePrice)return;
  const owner=Y2C_AuthEngine.getAccountId();returnFocus=document.activeElement;
  dialog=node('dialog');dialog.setAttribute('aria-label','지역별 가격 변경');dialog.style.cssText='width:min(440px,calc(100vw - 32px));max-height:90dvh;overflow:auto;padding:24px;border:1px solid #ddd;border-radius:18px';
  const form=node('form'),title=node('h2','가격 변경 · '+region),desc=node('p',item.code+' · '+item.name+' / 박스당 CAD'),price=node('input'),reason=node('input'),save=node('button','변경 저장'),cancel=node('button','닫기'),message=node('p');
  title.style.fontWeight='800';price.type='number';price.min='0';price.step='0.01';price.required=true;price.value=item.priceAvailable===false?'':String(item.price);price.id='regionalPriceValue';price.inputMode='decimal';
  reason.id='regionalPriceReason';reason.required=true;reason.minLength=3;reason.maxLength=300;save.type='submit';cancel.type='button';message.setAttribute('role','status');
  for(const [input,text] of [[price,'새 가격 (CAD / 박스)'],[reason,'변경 사유']]){const label=node('label',text);label.htmlFor=input.id;label.style.cssText='display:block;margin-top:16px';input.style.cssText='display:block;width:100%;min-height:44px;padding:8px;border:1px solid #aaa;border-radius:8px';form.append(label,input);}
  for(const b of [save,cancel])b.style.cssText='min-height:44px;padding:10px 16px;margin:16px 8px 0 0;border:1px solid #aaa;border-radius:10px';
  const close=()=>{if(busy)return;dialog.close();dialog.remove();dialog=null;returnFocus?.focus();};cancel.addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  form.append(message,save,cancel);dialog.append(title,desc,node('p','기존 주문 금액은 유지됩니다. 변경 전후 값과 회사 계정이 기록됩니다.'),form);document.body.append(dialog);dialog.showModal();price.focus();
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy||!form.reportValidity())return;if(!navigator.onLine){message.textContent='온라인 연결 후 저장해 주세요.';return;}
   busy=true;save.disabled=cancel.disabled=true;price.disabled=reason.disabled=true;message.textContent='저장 결과 확인 중…';
   try{const r=await Y2C_AuthEngine.request('update_price',{code:item.code,clientState:region,price:Number(price.value),expectedPrice:item.priceAvailable===false?null:Number(item.price),reason:reason.value.trim()});if(owner!==Y2C_AuthEngine.getAccountId())throw Error('계정이 변경되었습니다. 다시 로그인하세요.');
    if(r.offlineQueued||r.inFlight){document.dispatchEvent(new Event('y2c-price-pending'));message.textContent=r.message||'기기에 보존했습니다. 서버 확인 대기 중입니다. 같은 내용으로 다시 확인하세요.';return;}
    if(!r.success)throw Error(r.message||'저장 결과를 확인할 수 없습니다.');await Y2C_AuthEngine.acknowledgeCommitted(r.requestKey);busy=false;close();document.dispatchEvent(new Event('y2c-operations-updated'));await refresh();
   }catch(error){if(dialog)message.textContent=error.message;else Y2C_AuthEngine.showToast('가격 저장 후 목록 조회 실패. 새로고침하세요.','warning');}
   finally{busy=false;save.disabled=cancel.disabled=price.disabled=reason.disabled=false;}
  });
 }};
})(window);
