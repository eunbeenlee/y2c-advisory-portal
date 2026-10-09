/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Web Worker Engine (Excel Parser)
 * Version: V80.00 (Dedicated Background Thread)
 * ============================================================================
 * [MULTI-THREADING] Offloads massive Excel JSON parsing from the main UI thread.
 * [AI AUTO-MAPPER] Numeric/Keyword heuristic mapping isolated in background.
 * [PHANTOM BLOCK] Validates `hqCode` against `catalogItems` before returning to UI.
 * ============================================================================
 */

"use strict";
importScripts("excel-model.js");

const AdvancedAutoMapper = {
    normalize: function(str) { 
        return String(str).toLowerCase().replace(/[\s\(\)\[\]\-_]/g, '').replace(/신전떡볶이|신전|냉동/g, ''); 
    },
    
    findBestMatch: function(vendorCode, vendorName, catalog) {
        if (!catalog || catalog.length === 0) return null;
        
        // 🚨 [CRITICAL FIX] 숫자 기반 매핑 알고리즘: 벤더 품번에서 숫자만 추출하여 100% 매칭
        const numericVCode = String(vendorCode).replace(/[^0-9]/g, '');
        if (numericVCode.length >= 4) {
            let codeMatch = catalog.find(c => {
                const numericCCode = String(c.code).replace(/[^0-9]/g, '');
                return numericCCode === numericVCode;
            });
            if (codeMatch) return codeMatch.code;
        }

        const vNameNorm = this.normalize(vendorName);
        const vKeywords = [];
        if (vNameNorm.includes('순한')) vKeywords.push('순한');
        if (vNameNorm.includes('매운')) vKeywords.push('매운');
        if (vNameNorm.includes('로제')) vKeywords.push('로제');
        if (vNameNorm.includes('밀떡')) vKeywords.push('밀떡');
        if (vNameNorm.includes('김말이')) vKeywords.push('김말이');
        if (vNameNorm.includes('잡채말이')) vKeywords.push('잡채말이');
        if (vNameNorm.includes('어묵')) vKeywords.push('어묵');
        if (vNameNorm.includes('납작')) vKeywords.push('납작');
        if (vNameNorm.includes('만두') && !vNameNorm.includes('납작')) vKeywords.push('만두');
        if (vNameNorm.includes('통살')) vKeywords.push('통살');
        if (vNameNorm.includes('오징어') && !vNameNorm.includes('통살')) vKeywords.push('오징어'); 
        if (vNameNorm.includes('치즈핫도그') && !vNameNorm.includes('감자')) vKeywords.push('치즈핫도그');
        if (vNameNorm.includes('올모짜') && !vNameNorm.includes('감자')) vKeywords.push('올모짜');
        if (vNameNorm.includes('감자') && vNameNorm.includes('치즈')) vKeywords.push('감자치즈');
        if (vNameNorm.includes('감자') && vNameNorm.includes('올모짜')) vKeywords.push('감자올모짜');
        if (vNameNorm.includes('멘보샤')) vKeywords.push('멘보샤');
        if (vNameNorm.includes('꽈배기')) vKeywords.push('꽈배기');

        let bestMatchCode = null; let highestScore = 0;

        for (let i = 0; i < catalog.length; i++) {
            const hqItem = catalog[i];
            const hqNameNorm = this.normalize(hqItem.name);
            let score = 0;

            const hqKeywords = [];
            if (hqNameNorm.includes('순한')) hqKeywords.push('순한');
            if (hqNameNorm.includes('매운')) hqKeywords.push('매운');
            if (hqNameNorm.includes('로제')) hqKeywords.push('로제');

            for (let kw of vKeywords) { if (hqKeywords.includes(kw) || hqNameNorm.includes(kw)) score += 50; }
            if (hqNameNorm.includes(vNameNorm) || vNameNorm.includes(hqNameNorm)) score += 30;

            // 오답 회피 로직
            if (vKeywords.includes('통살') && !hqNameNorm.includes('통살')) score -= 100;
            if (!vKeywords.includes('통살') && hqNameNorm.includes('통살')) score -= 100;
            if (vKeywords.includes('납작') && !hqNameNorm.includes('납작')) score -= 100;
            if (!vKeywords.includes('납작') && hqNameNorm.includes('납작')) score -= 100;
            if (vKeywords.includes('순한') && hqNameNorm.includes('매운')) score -= 100;
            if (vKeywords.includes('매운') && hqNameNorm.includes('순한')) score -= 100;

            if (score > highestScore && score >= 50) { highestScore = score; bestMatchCode = hqItem.code; }
        }
        return bestMatchCode;
    }
};

function findBestKey(row, keywords) {
    return Y2C_ExcelModel.findKey(row,keywords);
}

function normalizeExcelDate(value) {
    if (value === undefined || value === null || value === "" || value === "-") return "-";
    const strVal=String(value).trim();
    const serial=typeof value==='number'?value:(/^\d{5}(\.\d+)?$/.test(strVal)?Number(strVal):NaN);
    if(Number.isFinite(serial)&&serial>20000&&serial<100000){
        return new Date((Math.floor(serial)-25569)*86400000).toISOString().slice(0,10);
    }
    const match=strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if(match){const date=match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0');return Y2C_ExcelModel.validDate(date)?date:strVal;}
    return strVal;
}

// 메인 스레드로부터 데이터를 받아 백그라운드 연산 시작
self.addEventListener('message', function(e) {
    const { action, payload, jobId } = e.data;
    try {
    
    if (action === 'PROCESS_EXCEL') {
        const { jsonArray, catalogItems, mappings, currentHub } = payload;
        let aggregatedData = Object.create(null);let sourceRowIndex=0; 
        
        // 1. 데이터 파싱 및 QTY 통합
        jsonArray.forEach(row => {
            const codeKey = findBestKey(row, ['ITEM', 'CODE', '품번', 'SKU', 'BARCODE']);
            const qtyKey = findBestKey(row, ['QTY', 'QUANTITY', '수량', 'STOCK']);
            const expKey = findBestKey(row, ['EXP', '유통기한', 'DATE']);
            const nameKey = findBestKey(row, ['PRODUCT', 'NAME', '품명', '제품']);
            const priceKey = findBestKey(row, ['PRICE', 'UNITPRICE', '단가', '가격', 'COST']);

            let rawCode = codeKey ? String(row[codeKey]).trim().toUpperCase() : "";
            let qtyStr=qtyKey?String(row[qtyKey]).trim():'';
            if(/^\d{1,3}(,\d{3})+$/.test(qtyStr))qtyStr=qtyStr.replace(/,/g,'');
            let qty=/^\d+$/.test(qtyStr)?Number(qtyStr):NaN;
            let rawExp = expKey ? row[expKey] : "-";
            let exp = normalizeExcelDate(rawExp);
            let rawName = nameKey ? String(row[nameKey]).trim() : "";
            let priceText=priceKey?String(row[priceKey]).trim().replace(/^\$\s*/, ''):'';
            if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(priceText))priceText=priceText.replace(/,/g,'');
            let rawPrice=priceText===''?null:(/^\d+(\.\d{1,2})?$/.test(priceText)?Number(priceText):NaN);

            if (true) {
                let aggKey = String(sourceRowIndex++);
                if (!aggregatedData[aggKey]) {
                    aggregatedData[aggKey] = { rawCode: rawCode, rawName: rawName, exp: exp, qty: qty, price: rawPrice, inputError: !rawCode || !Number.isSafeInteger(qty) || qty<=0 || (exp!=="-"&&!Y2C_ExcelModel.validDate(exp)) || (rawPrice!==null&&!Number.isFinite(rawPrice)) };
                }

                if(rawPrice !== null && !isNaN(rawPrice)) aggregatedData[aggKey].price = rawPrice;
            }
        });

        let displayRows = [];
        let tempUpdates = {};
        const aggValues = Object.values(aggregatedData);
        
        // 2. AI 맵핑 및 2차 실존 교차 검증 (Phantom Code Block)
        aggValues.forEach((item) => {
            let hqCode = null;
            let isAiMapped = false;
            
            const matches=mappings.filter(m=>String(m.vendorCode).toUpperCase()===item.rawCode);
            let mapObj=new Set(matches.map(m=>m.hqCode)).size===1?matches[0]:null;
            if (mapObj) {
                hqCode = mapObj.hqCode;
                // 🚨 과거 캐시된 코드가 현재 마스터 DB에 없으면 유령 코드로 간주하고 폐기
                const isExist = catalogItems.some(c => c.code === hqCode);
                if (!isExist) hqCode = null; 
            }
            
            if (!hqCode) {
                let directMatch = catalogItems.find(c => String(c.code).toUpperCase() === item.rawCode);
                if (directMatch) hqCode = directMatch.code;
            }

            if (!hqCode && item.rawName) {
                hqCode = AdvancedAutoMapper.findBestMatch(item.rawCode, item.rawName, catalogItems);
                if (hqCode) isAiMapped = true;
            }

            if (hqCode) {
                const isExistFinal = catalogItems.some(c => c.code === hqCode);
                if (!isExistFinal) { hqCode = null; isAiMapped = false; }
            }

            displayRows.push({
                rawCode: item.rawCode, rawName: item.rawName, exp: item.exp, qty: item.qty, price: item.price,
                hqCode: hqCode, inputError:item.inputError, status: hqCode && !isAiMapped && !item.inputError ? "OK" : "ERROR", ignored: false
            });


        });

        // 4. 메인 스레드로 연산 결과 반환
        self.postMessage({
            status: 'SUCCESS',
            displayRows: displayRows,
            tempUpdates: {}, jobId, currentHub
        });
    }
    } catch(err){self.postMessage({status:"ERROR",message:err.message,jobId});}
});
