/* MASTER-only read model. Display scope is not an authorization rule. No writes. */
(function(){
 'use strict';let busy=false,last=null,lastOwner=null;const $=id=>document.getElementById(id),u=()=>window.Y2C_UX,t=(ko,en)=>u().t(ko,en),el=(tag,text,cls)=>u().el(tag,text,cls);
 const activeRegions=['ON']; // Current business rollout only. Retain and expose all other regions below.
 function table(parent,title,headers,rows,emptyLabel){
  const details=el('details'),summary=el('summary',title+' ('+rows.length+')');details.append(summary);
  if(!rows.length){u().empty(details,emptyLabel||t('표시할 기록이 없습니다','No records to display'),t('새 기록이 생성되면 새로고침하여 확인할 수 있습니다.','Refresh after new records are created.'));parent.append(details);return;}
  const scroll=el('div',undefined,'ux-table-scroll ux-mobile-cards');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',title);
  const table=el('table',undefined,'ux-data-table'),thead=el('thead'),head=el('tr'),tbody=el('tbody');headers.forEach(x=>{const th=el('th',x);th.scope='col';head.append(th);});thead.append(head);table.append(thead);
  rows.forEach(values=>{const row=el('tr');values.forEach((v,i)=>{const cell=el('td');cell.dataset.label=headers[i];const value=String(v??'');if(value.length>180){const detail=el('details',undefined,'ux-log-detail');detail.append(el('summary',value.slice(0,90)+'…'),el('div',value));cell.append(detail);}else cell.append(el('div',value));row.append(cell);});tbody.append(row);});table.append(tbody);scroll.append(table);details.append(scroll);parent.append(details);
 }
 function render(r){
  const area=$('operationsContent');area.replaceChildren();
  $('operationsTitle').textContent=t('운영 모니터링','Operations overview');$('operationsRefresh').textContent=t('운영 현황 새로고침','Refresh operations');
  $('operationsMessage').textContent=t('미완료 거래 '+r.pendingCount+'건 · 주문 담당 매핑 확인 '+r.mappingIssueCount+'건 · 금액 형식 확인 '+(r.amountDataErrors||0)+'행',r.pendingCount+' pending transactions · '+r.mappingIssueCount+' order mapping issues · '+(r.amountDataErrors||0)+' amount format issues');
  const grid=el('div',undefined,'ux-stats'),currency=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(r.activeOrderAmount),shipment=r.shipmentReadiness;
  grid.append(u().stat(t('취소 제외 주문액','Active order amount'),currency,t('세금 포함 · 전체 조회 범위','Includes tax · all queried regions')),u().stat(t('미완료 거래','Pending transactions'),r.pendingCount,t('거래 기록 기준','From transaction records'),r.pendingCount?'attention':'ok'),u().stat(t('예약 재고','Reserved stock'),shipment?shipment.reservedBoxes:'—',t('박스 · 실물 차감 전','Boxes · before shipment')),u().stat(t('주문 담당 확인','Order mapping issues'),r.mappingIssueCount,t('주문 품목·지역 기준','Per order item and region'),r.mappingIssueCount?'attention':'ok'));area.append(grid);
  const chips=el('div',undefined,'ux-chips');Object.entries(r.statusLineCounts||{}).forEach(([status,count])=>{const badge=el('span',status+' '+count,'ux-status');badge.dataset.status=status;chips.append(badge);});area.append(el('p',t('품목 행 기준 처리 현황','Status by order item line'),'ux-muted'),chips);
  const readiness=r.vendorReadiness;if(readiness){
   const all=readiness.issues||[],operating=all.filter(i=>activeRegions.includes(i.region)||!['BC','AB','SK','MB','QC'].includes(i.region)),future=all.filter(i=>['BC','AB','SK','MB','QC'].includes(i.region));
   area.append(el('h3',t('담당 매핑 · 현재 운영 ON','Vendor mapping · ON is currently operating'),'ux-section-title'));
   area.append(el('p',t('아래 분류는 화면 표시 기준입니다. 계정 권한과 실제 담당 지역은 서버에서 확인합니다.','This grouping is for presentation. Account access and vendor assignments remain server-controlled.'),'ux-muted'));
   table(area,t('ON·공통 확인 사항','ON and shared issues'),[t('코드','Code'),t('지역','Region'),t('사유','Reason')],operating.map(i=>[i.code,i.region,i.reason]),t('조회된 ON·공통 매핑에 문제 없음','No ON or shared issues in the returned records'));
   table(area,t('미운영 지역 · 배정 준비','Inactive regions · assignment backlog'),[t('코드','Code'),t('지역','Region'),t('사유','Reason')],future.map(i=>[i.code,i.region,i.reason]));
   if((readiness.issueCount||0)>all.length)area.append(el('p',t('최대 '+all.length+'건만 조회되었습니다. 전체 '+readiness.issueCount+'건이며 표시되지 않은 지역 이슈가 있을 수 있습니다.','Showing '+all.length+' of '+readiness.issueCount+' issues. Additional regional issues may exist.'),'ux-muted'));
   table(area,t('벤더 계정 범위','Vendor account scope'),[t('계정','Account'),t('회사','Company'),t('허용 지역','Allowed regions'),t('유효 품목·지역 수','Assignments'),t('상태','State')],(readiness.accounts||[]).map(a=>[a.id,a.company,a.allowedStates,a.assignments,a.active?'ACTIVE':'INACTIVE']));
  }
  if(shipment){area.append(el('p',t('예약·실물 대조: '+(shipment.ready?'정상':'확인 필요')+' · 신규 모델 '+(shipment.reservationLines||0)+'행 · 기존 선차감 '+(shipment.legacyLines||0)+'행','Stock reconciliation: '+(shipment.ready?'ready':'review required')+' · reservation model '+(shipment.reservationLines||0)+' lines · legacy deductions '+(shipment.legacyLines||0)+' lines'),'ux-muted'));table(area,t('예약·실물 재고 확인','Stock reconciliation issues'),[t('코드','Code'),t('지역','Region'),t('예약','Reserved'),t('유효 실물','Valid physical'),t('내용','Details')],(shipment.issues||[]).map(i=>[i.code,i.region,i.reserved,i.validPhysical,i.reason]));}
  area.append(el('h3',t('처리 이력','Activity records'),'ux-section-title'),el('p',t('로그는 최근 기록입니다. 과거 오류 기록 수가 현재 오류 수를 뜻하지는 않습니다.','Logs show recent records. Historical error counts do not indicate current failures.'),'ux-muted'));
  table(area,t('최근 가격 변경 50건','Latest 50 price changes'),[t('일시','Date'),t('계정 / 회사','Account / company'),t('품목','Item'),t('지역','Region'),t('변경 전','Before'),t('변경 후','After'),t('사유','Reason')],(r.priceChanges||[]).map(e=>[e.date,e.change.actor+' / '+e.change.company,e.change.code,e.change.region,e.change.before,e.change.after,e.change.reason]));
  table(area,t('주문 담당 확인 (최대 100건)','Order mapping issues (up to 100)'),[t('발주','Order'), 'SKU',t('지역','Region'),t('사유','Reason')],(r.mappingIssues||[]).map(i=>[i.orderId,i.code,i.region,i.reason]));
  table(area,t('최근 거래 50건','Latest 50 transactions'),[t('일시','Date'),t('계정','Account'),t('작업','Action'),t('발주 / SKU','Order / SKU'),t('처리','Transition'),t('상태','State'),t('거래 참조','Reference')],(r.events||[]).map(e=>[e.date,e.actor,e.action,e.orderId+' / '+e.itemCode,e.from+' → '+e.to,e.state,e.refId]));
  table(area,t('최근 감사 로그 50건','Latest 50 audit records'),[t('일시','Date'),t('처리자','Actor'),t('작업','Action'),t('대상','Target'),t('내용','Details')],r.audit||[]);
  table(area,t('최근 오류 로그 50건','Latest 50 error records'),[t('일시','Date'),t('작업','Action'),t('처리자','Actor'),t('내용','Message'),t('상세','Details')],r.errors||[]);
 }
 async function load(){
  if(busy||!$('operationsMonitor'))return;busy=true;const owner=Y2C_AuthEngine.getAccountId();$('operationsRefresh').disabled=true;u().busy($('operationsRefresh'),true);
  try{
   const session=await Y2C_AuthEngine.request('get_session_context',{});if(owner!==Y2C_AuthEngine.getAccountId()||session.role!=='MASTER')return;
   $('operationsMonitor').hidden=false;$('operationsMessage').textContent=t('전체 운영 기록 조회 중…','Loading operations…');u().busy($('operationsContent'),true);if(!last)u().skeleton($('operationsContent'));
   const r=await Y2C_AuthEngine.request('get_ops_monitor',{limit:50,clientState:'ALL'});if(owner!==Y2C_AuthEngine.getAccountId())return;
   if(r.success!==true||r.readOnly!==true)throw Error(r.message||t('운영 현황 조회 실패','Unable to load operations'));
   const previous=last;last=r;lastOwner=owner;render(r);
   if(previous){const values=$('operationsContent').querySelectorAll('.ux-stat-value');[previous.activeOrderAmount!==r.activeOrderAmount,previous.pendingCount!==r.pendingCount,previous.shipmentReadiness?.reservedBoxes!==r.shipmentReadiness?.reservedBoxes,previous.mappingIssueCount!==r.mappingIssueCount].forEach((changed,i)=>{if(changed)u().pulse(values[i]);});}
  }catch(e){if(owner===Y2C_AuthEngine.getAccountId()){last=null;u().error($('operationsContent'),e.message,load);$('operationsMessage').textContent=t('조회 실패 · 다시 조회할 수 있습니다','Load failed · retry available');}}
  finally{busy=false;$('operationsRefresh').disabled=false;u().busy($('operationsRefresh'),false);u().busy($('operationsContent'),false);}
 }
 document.addEventListener('DOMContentLoaded',()=>{if(!$('operationsRefresh'))return;const monitorRefresh=document.getElementById('operationsRefresh');monitorRefresh.addEventListener('click',load);load();});
 document.addEventListener('y2c-operations-updated',load);
 document.addEventListener('y2c-language-changed',()=>{if(last&&lastOwner===Y2C_AuthEngine.getAccountId())render(last);});
})();
