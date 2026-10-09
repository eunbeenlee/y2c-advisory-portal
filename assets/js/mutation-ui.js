/* Completion handling for administrator forms. No transaction is sent here. */
(function(global) {
    'use strict';
    const pending=new Map(), early=new Map(), consuming=new Set(), handled=new Set();
    const snapshot=value=>JSON.stringify(value);
    const owner=()=>global.Y2C_AuthEngine.getAccountId();
    const trimMap=map=>{while(map.size>64)map.delete(map.keys().next().value);};
    async function finish(key,record,response) {
        if(consuming.has(key)||handled.has(key)||!response||response.success!==true)return;
        if(!record.owner||record.owner!==owner())return;
        consuming.add(key);
        try {
            const unchanged=snapshot(record.spec.read())===record.snapshot;
            // Apply all form changes synchronously, before any refresh await.
            if(unchanged) record.spec.onMatch(response);
            global.Y2C_AuthEngine.showToast(unchanged?'서버 저장 완료. 화면에 반영했습니다.':'서버 저장 완료. 이후 수정한 입력은 유지했습니다.','success');
            handled.add(key);pending.delete(key);trimMap(handled);
            try { if(record.spec.refresh)await record.spec.refresh(response); }
            catch(_) {global.Y2C_AuthEngine.showToast('저장은 완료됐습니다. 최신 목록은 다시 조회해 주십시오.','warning');}
            // Successful server result is consumed even if refreshing a read failed.
            if(record.owner===owner()) {
                try {await global.Y2C_AuthEngine.acknowledgeCommitted(key);}
                catch(_) {global.Y2C_AuthEngine.showToast('저장 완료 확인 기록을 기기에 보존했습니다.','warning');}
            }
        } finally {consuming.delete(key);}
    }
    global.Y2C_MutationUI={
        pendingCount:()=>Array.from(pending.values()).filter(r=>r.owner===owner()).length,
        submit:async function(action,payload,spec) {
            const record={owner:owner(),snapshot:snapshot(spec.read()),spec,action};
            const immutable=JSON.parse(JSON.stringify(payload));
            const response=await global.Y2C_AuthEngine.request(action,immutable);
            if(record.owner!==owner())throw new Error('계정이 변경되었습니다. 화면을 다시 여십시오.');
            const key=response.requestKey;
            if(response.offlineQueued||response.inFlight) {
                if(!key)throw new Error('저장 확인 식별자가 없습니다. 입력은 유지됩니다.');
                pending.set(key,record);
                const completion=early.get(key);
                if(completion){early.delete(key);await finish(key,record,completion.response);}
                else global.Y2C_AuthEngine.showToast(response.message||'기기에 보관했습니다. 서버 저장 대기 중입니다.','warning');
            } else if(response.success===true) {
                await finish(key,record,response);
            } else throw new Error(response.message||'서버 저장이 확인되지 않았습니다.');
            return response;
        }
    };
    global.addEventListener('y2c:mutation-completed',event=>{
        const detail=event.detail;
        if(!detail||!detail.owner||detail.owner!==owner()||!detail.key||!detail.response||detail.response.success!==true)return;
        if(handled.has(detail.key)||consuming.has(detail.key))return;
        const record=pending.get(detail.key);
        if(record)finish(detail.key,record,detail.response).catch(()=>{
            global.Y2C_AuthEngine.showToast('서버 저장은 완료됐습니다. 화면 확인 기록과 입력을 유지했습니다.','warning');
        });
        else {early.set(detail.key,detail);trimMap(early);}
    });
})(window);
