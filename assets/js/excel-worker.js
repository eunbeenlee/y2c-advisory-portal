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
    const keys = Object.keys(row);
    for (let k of keys) {
        let cleanK = k.replace(/[^a-zA-Z0-9가-힣]/g, '').toUpperCase();
        for (let kw of keywords) { if (cleanK.includes(kw)) return k; }
    }
    return null;
}

function normalizeExcelDate(value) {
    if (value === undefined || value === null || value === "" || value === "-") return "-";
    if (typeof value === 'number' && value > 20000) {
        const date = new Date((value - 25569) * 86400 * 1000);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const strVal = String(value).trim();
    const match = strVal.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    return strVal;
}

// 메인 스레드로부터 데이터를 받아 백그라운드 연산 시작
self.addEventListener('message', function(e) {
    const { action, payload } = e.data;
    
    if (action === 'PROCESS_EXCEL') {
        const { jsonArray, catalogItems, mappings, currentHub } = payload;
        let aggregatedData = {}; 
        
        // 1. 데이터 파싱 및 QTY 통합
        jsonArray.forEach(row => {
            const codeKey = findBestKey(row, ['ITEM', 'CODE', '품번', 'SKU', 'BARCODE']);
            const qtyKey = findBestKey(row, ['QTY', 'QUANTITY', '수량', 'STOCK']);
            const expKey = findBestKey(row, ['EXP', '유통기한', 'DATE']);
            const nameKey = findBestKey(row, ['PRODUCT', 'NAME', '품명', '제품']);
            const priceKey = findBestKey(row, ['PRICE', 'UNITPRICE', '단가', '가격', 'COST']);

            let rawCode = codeKey ? String(row[codeKey]).trim().toUpperCase() : "";
            let qtyStr = qtyKey ? String(row[qtyKey]).replace(/[^0-9]/g, '') : "0";
            let qty = parseInt(qtyStr, 10);
            let rawExp = expKey ? row[expKey] : "-";
            let exp = normalizeExcelDate(rawExp);
            let rawName = nameKey ? String(row[nameKey]).trim() : "";
            let rawPrice = priceKey ? parseFloat(String(row[priceKey]).replace(/[^0-9.]/g, '')) : null;

            if (rawCode && !isNaN(qty) && qty > 0) {
                let aggKey = rawCode + '|' + exp;
                if (!aggregatedData[aggKey]) {
                    aggregatedData[aggKey] = { rawCode: rawCode, rawName: rawName, exp: exp, qty: 0, price: rawPrice };
                }
                aggregatedData[aggKey].qty += qty;
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
            
            let mapObj = mappings.find(m => String(m.vendorCode).toUpperCase() === item.rawCode);
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
                hqCode: hqCode, status: hqCode ? (isAiMapped ? "AI_MAPPED" : "OK") : "ERROR", ignored: false
            });

            // 3. 재고/단가 업데이트 객체 생성
            if (hqCode) {
                const masterItem = catalogItems.find(c => c.code === hqCode);
                if (!tempUpdates[hqCode]) {
                    tempUpdates[hqCode] = { code: hqCode, stockBreakdown: {}, expBreakdown: {} };
                    tempUpdates[hqCode].stockBreakdown[currentHub] = 0;
                    if (item.price !== null && !isNaN(item.price) && item.price > 0) {
                         if(masterItem && Math.abs(item.price - masterItem.price) > 0.01) {
                             tempUpdates[hqCode].newPrice = item.price;
                         }
                    }
                }
                tempUpdates[hqCode].stockBreakdown[currentHub] += item.qty;
                if (item.exp !== "-") {
                    let existingExp = tempUpdates[hqCode].expBreakdown[currentHub];
                    if (existingExp) tempUpdates[hqCode].expBreakdown[currentHub] += ` | ${item.exp}:${item.qty}`;
                    else tempUpdates[hqCode].expBreakdown[currentHub] = `${item.exp}:${item.qty}`;
                }
            }
        });

        // 4. 메인 스레드로 연산 결과 반환
        self.postMessage({
            status: 'SUCCESS',
            displayRows: displayRows,
            tempUpdates: tempUpdates
        });
    }
});
