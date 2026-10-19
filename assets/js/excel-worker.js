/* Shared import model runs off the main thread. No network or writes. */
'use strict';
importScripts('excel-model.js','inventory-import.js');
self.addEventListener('message',function(e){
 const {action,payload,jobId}=e.data;
 if(action!=='PROCESS_EXCEL')return;
 try{const {jsonArray,catalogItems,mappings,currentHub}=payload;
  const displayRows=Y2C_InventoryImport.process(jsonArray,catalogItems,mappings,currentHub);
  self.postMessage({status:'SUCCESS',displayRows,tempUpdates:{},jobId,currentHub});
 }catch(err){self.postMessage({status:'ERROR',message:err.message,jobId});}
});
