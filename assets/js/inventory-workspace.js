/* Stock tools share the existing authenticated mutation queue and server ledger. */
(function(root){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csvCell=s=>{let v=String(s==null?'':s);if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
function csv(items){
 const out=[['품목코드','상품명','박스수량','유통기한']];
 for(const x of items){
  const parts=String(x.exp||'').split('|').map(s=>s.trim()).filter(s=>/^\d{4}-\d{2}-\d{2}:\d+$/.test(s));
  if(parts.length&&parts.reduce((n,p)=>n+Number(p.split(':')[1]),0)===x.stock)for(const p of parts){const [date,qty]=p.split(':');out.push([x.code,x.name,qty,date]);}
  else out.push([x.code,x.name,x.stock,x.exp&&x.exp!=='-'?x.exp:'']);
 }
 return '\uFEFF'+out.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function changes(snapshot,updates,mode){
 const before=new Map(snapshot.items.map(x=>[x.code,x]));
 return updates.map(u=>{const old=before.get(u.code);if(!old)throw Error('선택한 품목이 바뀌었습니다. 다시 확인해 주세요.');const qty=u.stockBreakdown[snapshot.region];
  if(!Number.isSafeInteger(qty)||qty<0)throw Error('수량은 0 이상의 정수로 입력하세요.');
  if(mode==='RESET'&&qty!==0)throw Error('재고 정리는 0으로만 저장할 수 있습니다.');
  if(qty<old.reserved)throw Error(old.name+': 예약 '+old.reserved+'박스보다 적게 바꿀 수 없습니다.');
  return {...old,after:qty,afterExp:u.expBreakdown?.[snapshot.region]||'-',delta:qty-old.stock};});
}
function download(items,region,suffix){const url=URL.createObjectURL(new Blob([csv(items)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='Sinjeon_Stock_'+region+'_'+suffix+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function mount(cfg){
 const d=document,by=id=>d.getElementById(id),auth=root.Y2C_AuthEngine;
 if(!by('stockTools'))return;
 let mode='ADD',replaceAll=false,busy=false,epoch=0,loaded=null,loadedSession=null,selected=new Set(),filter='';
 const context=()=>({session:auth.cacheSessionKey(),hub:cfg.getHub()});
 const current=c=>c.session===auth.cacheSessionKey()&&c.hub===cfg.getHub();
 const notice=(m,k='warning')=>auth.showToast(m,k);
 const editable=()=>!busy&&cfg.canEdit();
 const lock=v=>{busy=v;cfg.setBusy(v);by('stockTools').setAttribute('aria-busy',String(v));by('stockRefresh').disabled=v;by('stockReset').disabled=v||!selected.size;by('stockExport').disabled=v||!loaded;by('stockReplaceAll').disabled=v;};
 function draw(){
  const q=filter.trim().toLowerCase(),items=(loaded?.items||[]).filter(x=>(x.code+' '+x.name).toLowerCase().includes(q));
  by('stockSelectionCount').textContent=selected.size+'개 선택';
  by('stockReset').disabled=busy||!selected.size;
  by('stockSummary').textContent=loaded?loaded.region+' · '+loaded.items.length+'개 품목 · 실물 '+loaded.items.reduce((n,x)=>n+x.stock,0)+'박스 · 예약 '+loaded.items.reduce((n,x)=>n+x.reserved,0)+'박스':'지역을 선택한 뒤 현재 재고를 불러오세요.';
  by('stockRows').innerHTML=items.map(x=>'<tr><td><input type="checkbox" aria-label="'+esc(x.name)+' 선택" data-stock-code="'+esc(x.code)+'" '+(selected.has(x.code)?'checked':'')+(busy?' disabled':'')+'></td><td><strong>'+esc(x.name)+'</strong><small>'+esc(x.code)+'</small></td><td>'+x.stock+'</td><td>'+x.reserved+'</td><td>'+esc(x.exp||'—')+(x.issue?'<small class="stock-warning">'+esc(x.issue)+'</small>':'')+'</td></tr>').join('');
  by('stockEmpty').hidden=items.length>0;
 }
 async function read(codes){
  if(navigator.onLine===false)throw Error('인터넷에 연결한 뒤 최신 재고를 확인해 주세요.');
  const c=context();if(!c.hub)throw Error('지역을 먼저 선택하세요.');
  const r=await auth.request('get_inventory_snapshot',{clientState:c.hub,...(codes?{codes}:{} )});
  if(!current(c))throw Error('계정이나 지역이 바뀌었습니다. 다시 불러와 주세요.');
  if(r.success!==true||r.inventoryVersion!=='INVENTORY_REVIEW_V1'||!r.reviewToken)throw Error(r.message||'서버 업데이트가 필요합니다. 재고 기능이 포함된 Code.gs를 먼저 배포해 주세요.');
  return {r,c};
 }
 async function refresh(){
  if(!editable())return;lock(true);const ticket=++epoch;
  by('stockSummary').textContent='최신 재고를 불러오는 중…';
  try{const {r,c}=await read();if(ticket!==epoch)return;loaded=r;loadedSession=c;selected.clear();draw();}
  catch(e){loaded=null;loadedSession=null;selected.clear();draw();notice(e.message,'error');}
  finally{lock(false);draw();}
 }
 function confirmReview(snapshot,updates,kind){
  const diff=changes(snapshot,updates,kind),prior=d.activeElement,dialog=d.createElement('dialog');dialog.className='portal-dialog stock-review';dialog.setAttribute('aria-labelledby','stockReviewTitle');dialog.setAttribute('aria-describedby','stockReviewHelp');
  dialog.innerHTML='<header class="portal-dialog-head"><span class="portal-eyebrow">'+esc(snapshot.region)+' · 재고 변경</span><h2 id="stockReviewTitle">'+(kind==='RESET'?'선택 재고를 0으로 정리할까요?':'이 수량으로 바꿀까요?')+'</h2><button type="button" class="portal-dialog-close" data-close aria-label="닫기">×</button></header><div class="portal-dialog-body"><p id="stockReviewHelp">'+(kind==='RESET'?'선택한 품목의 재고와 유통기한 수량을 0으로 바꿉니다.':(snapshot.scopeAll?'이 지역의 담당 재고를 파일 수량으로 교체합니다. 파일에 없는 담당 품목은 0이 됩니다. 가격은 유지됩니다.':'목록에 있는 품목만 바뀝니다. 빠진 품목과 가격은 그대로입니다.'))+'</p><div class="stock-review-table" tabindex="0" role="region" aria-label="변경 전후 수량"><table><thead><tr><th>품목</th><th>현재</th><th>변경 후</th><th>차이</th></tr></thead><tbody>'+diff.map(x=>'<tr><td><strong>'+esc(x.name)+'</strong><small>'+esc(x.code)+' · 예약 '+x.reserved+'박스</small><small class="stock-lots">현재 유통기한<br>'+esc(x.exp||'—').split(' | ').join('<br>')+'<br>변경 후<br>'+esc(x.afterExp).split(' | ').join('<br>')+'</small></td><td>'+x.stock+'</td><td><strong>'+x.after+'</strong></td><td>'+(x.delta>0?'+':'')+x.delta+'</td></tr>').join('')+'</tbody></table></div><button type="button" class="stock-text-button" data-backup>변경 전 재고 내려받기</button><label for="stockReason">변경 사유</label><textarea id="stockReason" required minlength="2" maxlength="300" placeholder="예: 월말 실사 수량 반영"></textarea><p class="stock-note">수정자와 변경 전후 수량·유통기한이 기록됩니다.</p><p data-error role="status" class="stock-warning"></p></div><footer class="portal-dialog-actions"><button type="button" class="portal-dialog-cancel" data-close>돌아가기</button><button type="button" class="portal-dialog-confirm" data-confirm disabled>'+(kind==='RESET'?'0으로 정리':'이 수량으로 저장')+'</button></footer>';
  return new Promise((resolve,reject)=>{
   const input=dialog.querySelector('textarea'),confirm=dialog.querySelector('[data-confirm]');let done=false;
   const finish=value=>{if(done)return;done=true;if(dialog.open)dialog.close();dialog.remove();if(prior?.isConnected)prior.focus();resolve(value);};
   dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>finish(null)));
   dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.addEventListener('close',()=>finish(null));
   input.addEventListener('input',()=>confirm.disabled=input.value.trim().length<2);
   confirm.addEventListener('click',()=>{if(!input.reportValidity()||input.value.trim().length<2)return;finish(input.value.trim());});
   dialog.querySelector('[data-backup]').addEventListener('click',()=>download(snapshot.items,snapshot.region,'before-change'));
   d.body.append(dialog);try{dialog.showModal();dialog.querySelector('[data-close]').focus();}catch(e){dialog.remove();reject(e);}
  });
 }
 async function review(rawUpdates,kind){
  if(!editable())return;const c=context(),updates=JSON.parse(JSON.stringify(rawUpdates));
  if(!updates.length)return notice('바꿀 품목을 먼저 선택하세요.');
  // Replacement is quantity-only: importing a price column must not change pricing.
  updates.forEach(u=>delete u.newPrice);
  lock(true);
  try{
   const full=kind==='REPLACE'&&replaceAll;
   const {r}=await read(full?undefined:updates.map(u=>u.code));
   if(full){const seen=new Set(updates.map(u=>u.code));for(const x of r.items)if(!seen.has(x.code))updates.push({code:x.code,stockBreakdown:{[c.hub]:0},expBreakdown:{[c.hub]:'-'}});}
   const reason=await confirmReview(r,updates,kind);if(!reason)return;
   if(!current(c))throw Error('계정이나 지역이 바뀌었습니다. 변경 내용을 다시 확인하세요.');
   const signature=JSON.stringify({session:c.session,hub:c.hub,rows:cfg.getRows(),mode});
   const payload={mode:kind,clientState:c.hub,stockUpdates:updates,reason,reviewToken:r.reviewToken};
   const result=await root.Y2C_MutationUI.submit('update_stock',payload,{
    read:()=>({session:auth.cacheSessionKey(),hub:cfg.getHub(),rows:cfg.getRows(),mode}),
    onMatch:()=>{if(JSON.stringify({session:auth.cacheSessionKey(),hub:cfg.getHub(),rows:cfg.getRows(),mode})===signature){if(kind==='REPLACE')cfg.clearDraft();selected.clear();loaded=null;loadedSession=null;draw();}},
    refresh:()=>cfg.refresh()
   });
   if(result.offlineQueued||result.inFlight)notice('저장 결과를 확인하고 있어요. 같은 재고를 다시 올리지 마세요.');
  }catch(e){notice(e.message,'error');}
  finally{lock(false);draw();}
 }
 by('stockReplaceAll').addEventListener('change',e=>{if(!editable()){e.target.checked=replaceAll;return;}replaceAll=e.target.checked;cfg.onModeChange();});
 by('stockRefresh').addEventListener('click',refresh);
 by('stockSearch').addEventListener('input',e=>{filter=e.target.value;draw();});
 by('stockRows').addEventListener('change',e=>{if(!editable()||!e.target.dataset.stockCode)return;if(e.target.checked)selected.add(e.target.dataset.stockCode);else selected.delete(e.target.dataset.stockCode);draw();});
 by('stockSelectVisible').addEventListener('click',()=>{if(!editable()||!loaded)return;const q=filter.toLowerCase();for(const x of loaded.items)if((x.code+' '+x.name).toLowerCase().includes(q))selected.add(x.code);draw();});
 by('stockClearSelection').addEventListener('click',()=>{if(editable()){selected.clear();draw();}});
 by('stockExport').addEventListener('click',()=>{if(loaded&&loadedSession&&current(loadedSession))download(loaded.items,loaded.region,'snapshot');else notice('현재 지역의 재고를 다시 불러와 주세요.');});
 by('stockReset').addEventListener('click',()=>{if(!loadedSession||!current(loadedSession))return notice('현재 지역의 재고를 다시 불러와 주세요.');const hub=cfg.getHub();review(Array.from(selected).sort().map(code=>({code,stockBreakdown:{[hub]:0},expBreakdown:{[hub]:'-'}})),'RESET');});
 d.querySelectorAll('[data-stock-mode]').forEach(b=>b.addEventListener('click',()=>{if(!editable())return;mode=b.dataset.stockMode;by('stockReplaceOption').hidden=mode!=='REPLACE';d.querySelectorAll('[data-stock-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.stockMode===mode)));by('stockModeHelp').textContent=mode==='ADD'?'이번에 들어온 수량만 올려 주세요. 현재 재고에 더해집니다.':'실사한 총수량을 올려 주세요. 파일에 있는 품목만 교체하며 가격은 유지됩니다.';cfg.onModeChange();}));
 by('inboundRegionSelector').addEventListener('change',()=>{epoch++;loaded=null;loadedSession=null;selected.clear();draw();});
 root.addEventListener('y2c:mutation-completed',e=>{if(e.detail?.response?.success){loaded=null;loadedSession=null;selected.clear();draw();}});
 draw();
 return {mode:()=>mode,review,refresh,busy:()=>busy};
}
root.Y2C_StockWorkspace={mount,csv,changes};
})(typeof window!=='undefined'?window:globalThis);
