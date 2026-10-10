/* MASTER-only read model. Never emits a mutation request. */
(function(){
 'use strict';let busy=false;const $=id=>document.getElementById(id);
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function table(parent,title,headers,rows){const details=el('details');details.append(el('summary',title+' ('+rows.length+')'));details.style.margin='12px 0';details.firstChild.style.minHeight='44px';const scroll=el('div');scroll.style.overflowX='auto';scroll.tabIndex=0;const t=el('table');t.style.cssText='width:100%;min-width:600px;text-align:left';const h=el('tr');headers.forEach(x=>h.append(el('th',x)));t.append(h);rows.forEach(values=>{const r=el('tr');values.forEach(value=>{const c=el('td',String(value??''));c.style.cssText='padding:10px;vertical-align:top;border-bottom:1px solid #eee';r.append(c);});t.append(r);});scroll.append(t);details.append(scroll);parent.append(details);}
 async function load(){
  if(busy||!$('operationsMonitor'))return;busy=true;const owner=Y2C_AuthEngine.getAccountId();$('operationsRefresh').disabled=true;
  try{
   const session=await Y2C_AuthEngine.request('get_session_context',{});if(owner!==Y2C_AuthEngine.getAccountId()||session.role!=='MASTER')return;
   $('operationsMonitor').hidden=false;$('operationsMessage').textContent='전체 운영 기록 조회 중…';
   const r=await Y2C_AuthEngine.request('get_ops_monitor',{limit:50,clientState:'ALL'});if(owner!==Y2C_AuthEngine.getAccountId())return;
   if(r.success!==true||r.readOnly!==true)throw Error(r.message||'운영 현황 조회 실패');
   const area=$('operationsContent');area.replaceChildren();
   $('operationsMessage').textContent='미완료 거래 '+r.pendingCount+'건 · 주문 담당 매핑 확인 '+r.mappingIssueCount+'건 · 금액 형식 확인 '+(r.amountDataErrors||0)+'행';
   area.append(el('p','취소 제외 주문액 (세금 포함): '+new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(r.activeOrderAmount)));
   area.append(el('p','품목 행 기준 상태: '+Object.entries(r.statusLineCounts||{}).map(([k,v])=>k+' '+v).join(' · ')));
   const readiness=r.vendorReadiness;if(readiness){area.append(el('p','전체 카탈로그 지역 담당: 미배정 '+readiness.unassignedCount+' / 충돌 '+readiness.conflictCount+' / 담당 계정 확인 '+readiness.unregisteredCount+' / 존재하지 않는 코드 '+readiness.unknownCodeCount+' / 활성 지역 담당 없음 '+(readiness.ineligibleCount||0)+' (품목·지역 조합 기준)'));
    table(area,'벤더 계정 범위',['계정','회사','허용 지역','유효 품목·지역 수','상태'],readiness.accounts.map(a=>[a.id,a.company,a.allowedStates,a.assignments,a.active?'ACTIVE':'INACTIVE']));
    table(area,'카탈로그 매핑 확인 (최대 100건)',['코드','지역','사유'],readiness.issues.map(i=>[i.code,i.region,i.reason]));}
   const shipment=r.shipmentReadiness;if(shipment){area.append(el('p','재고 예약: '+(shipment.reservedBoxes||0)+' 박스 · 신규 모델 '+(shipment.reservationLines||0)+'행 · 기존 선차감 '+(shipment.legacyLines||0)+'행 · 대조 '+(shipment.ready?'정상':'확인 필요')));table(area,'예약·실물 재고 확인',['코드','지역','예약','유효 실물','내용'],(shipment.issues||[]).map(i=>[i.code,i.region,i.reserved,i.validPhysical,i.reason]));}
   table(area,'최근 가격 변경 50건',['일시','계정 / 회사','품목','지역','변경 전','변경 후','사유'],(r.priceChanges||[]).map(e=>[e.date,e.change.actor+' / '+e.change.company,e.change.code,e.change.region,e.change.before,e.change.after,e.change.reason]));
   table(area,'주문 담당 확인 (최대 100건)',['발주','SKU','지역','사유'],r.mappingIssues.map(i=>[i.orderId,i.code,i.region,i.reason]));
   table(area,'최근 거래 50건',['일시','계정','작업','발주 / SKU','처리','상태','거래 참조'],r.events.map(e=>[e.date,e.actor,e.action,e.orderId+' / '+e.itemCode,e.from+' → '+e.to,e.state,e.refId]));
   table(area,'최근 감사 로그 50건',['일시','처리자','작업','대상','내용'],r.audit);table(area,'최근 오류 로그 50건',['일시','작업','처리자','내용','상세'],r.errors);
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId()){$('operationsContent').replaceChildren();$('operationsMessage').textContent='조회 실패: '+e.message;}}
  finally{busy=false;$('operationsRefresh').disabled=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{const monitorRefresh=document.getElementById('operationsRefresh');if(!monitorRefresh)return;monitorRefresh.addEventListener('click',load);load();});
 document.addEventListener('y2c-operations-updated',load);
})();
