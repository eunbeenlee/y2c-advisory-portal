/* Shared confirmation UI. Business writes remain with their original handlers. */
(function(root){
 'use strict';let active=null;const t=(ko,en)=>window.Y2C_UX?Y2C_UX.t(ko,en):ko;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 root.Y2C_Dialog={ask(options){
  if(active)return Promise.resolve({confirmed:false,value:''});
  return new Promise((resolve,reject)=>{
   const prior=document.activeElement,d=node('dialog',undefined,'portal-dialog'),head=node('header',undefined,'portal-dialog-head'),title=node('h2',options.title||t('내용 확인','Review details')),close=node('button','×','portal-dialog-close');
   d.id='portalConfirmDialog';title.id='portalConfirmTitle';d.setAttribute('aria-labelledby',title.id);d.setAttribute('aria-describedby','portalConfirmMessage');close.type='button';close.setAttribute('aria-label',t('닫기','Close'));
   head.append(node('span','SINJEON CANADA · PARTNER PORTAL','portal-eyebrow'),title,close);
   const body=node('div',undefined,'portal-dialog-body'),message=node('p',options.message||'','portal-dialog-message');message.id='portalConfirmMessage';body.append(message);
   let input=null;const error=node('p','','portal-dialog-error');error.id='portalConfirmError';error.setAttribute('role','status');
   const actions=node('footer',undefined,'portal-dialog-actions'),cancel=node('button',t('돌아가기','Go back'),'portal-dialog-cancel'),confirm=node('button',options.confirmLabel||t('확인 후 진행','Confirm'),'portal-dialog-confirm');cancel.type=confirm.type='button';cancel.id='portalConfirmCancel';confirm.id='portalConfirmAccept';
   if(options.reason){input=node('textarea');input.id='portalConfirmReason';input.minLength=options.reason.minLength||1;input.maxLength=options.reason.maxLength||300;input.required=true;const label=node('label',options.reason.label||t('처리 사유','Reason'));label.htmlFor=input.id;input.setAttribute('aria-describedby',error.id);body.append(label,input,error);confirm.disabled=true;input.addEventListener('input',()=>{confirm.disabled=input.value.trim().length<input.minLength;error.textContent=confirm.disabled?t('사유를 '+input.minLength+'자 이상 입력하세요.','Enter at least '+input.minLength+' characters.'):'';});}
   let settled=false;function finish(confirmed){if(settled)return;if(confirmed&&input&&!input.reportValidity())return;settled=true;const value=input?input.value.trim():'';if(d.open)d.close();d.remove();active=null;if(prior&&prior.isConnected)prior.focus();resolve({confirmed,value});}
   close.addEventListener('click',()=>finish(false));cancel.addEventListener('click',()=>finish(false));confirm.addEventListener('click',()=>finish(true));d.addEventListener('cancel',e=>{e.preventDefault();finish(false)});d.addEventListener('close',()=>finish(false));
   actions.append(cancel,confirm);d.append(head,body,actions);active=d;document.body.append(d);
   try{d.showModal();cancel.focus();}catch(e){d.remove();active=null;reject(e);}
  });
 }};
})(window);
