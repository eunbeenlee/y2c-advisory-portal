/* Account label only. Permissions remain enforced by the API. */
(function(){
 'use strict';
 async function initialize(){
  const label=document.getElementById('userNameDisplay');if(!label)return;
  const owner=Y2C_AuthEngine.getAccountId();
  let name='';
  try{
   const store=sessionStorage.getItem('y2c_token')?sessionStorage:localStorage;
   name=String(store.getItem('y2c_client') || owner || '').trim();
  }catch(e){name=owner || '';}
  label.textContent=name || 'Session / 계정 확인';
  label.title=name ? name+' · Session verification pending / 세션 확인 중' : 'Session verification pending / 세션 확인 중';
  try{
   const context=await Y2C_AuthEngine.request('get_session_context');
   if(owner!==Y2C_AuthEngine.getAccountId())return;
   if(!context || context.success!==true || context.id!==owner || !context.clientName)throw Error('Invalid session context');
   const verified=String(context.clientName).trim();
   if(!verified)throw Error('Empty account name');
   label.textContent=verified;label.title=verified+' · '+String(context.role || '')+' · Verified / 확인됨';
  }catch(e){
   if(owner!==Y2C_AuthEngine.getAccountId())return;
   label.title=(name || 'Session')+' · Verification unavailable / 세션 확인 불가';
   if(!name)label.textContent='Session unavailable / 계정 확인 불가';
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
