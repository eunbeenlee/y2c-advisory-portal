(function(w){
'use strict';let active=null;
function abort(){const job=active;if(!job)return;active=null;job.cancelled=true;job.reject?.(Error('이미지 인식이 취소되었습니다.'));if(job.worker)Promise.resolve(job.worker.terminate()).catch(()=>{});}
async function recognize(file,progress,isCurrent){
 abort();const job={cancelled:false,worker:null};active=job;let timer;
 const current=()=>active===job&&!job.cancelled&&isCurrent();
 const work=async()=>{
  await w.Y2C_Performance.load('ocr');if(!current())throw Error('취소됨');
  const worker=await w.Tesseract.createWorker('eng+kor',1,{
   workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
   corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
   // v6 downloads its smaller LSTM language data only on demand.
   errorHandler:err=>job.reject?.(Error('이미지 인식 연결 실패: '+String(err))),
   logger:m=>{if(current())progress(m.status==='recognizing text'?'글자 인식 '+Math.round(m.progress*100)+'%':'이미지 인식 엔진 준비 중…');}
  });job.worker=worker;
  if(!current()){await worker.terminate();throw Error('취소됨');}
  const result=await worker.recognize(file);if(!current())throw Error('취소됨');return String(result.data.text||'');
 };
 try{return await Promise.race([work(),new Promise((_,reject)=>{job.reject=reject;timer=setTimeout(()=>{job.cancelled=true;if(job.worker)Promise.resolve(job.worker.terminate()).catch(()=>{});reject(Error('이미지 인식 시간이 초과되었습니다. 더 선명한 사진이나 엑셀을 사용해 주세요.'));},120000);})]);}
 catch(err){throw err instanceof Error?err:Error(String(err));}
 finally{clearTimeout(timer);if(job.worker)Promise.resolve(job.worker.terminate()).catch(()=>{});if(active===job)active=null;}
}
w.Y2C_InventoryOCR={recognize,abort};w.addEventListener('pagehide',abort);
})(window);
