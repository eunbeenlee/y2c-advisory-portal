/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Enterprise Backend API (V14.1 Ultimate)
 * Features: Expanded CRA Zero-Rated Keywords (Seasoning/Sauce), Atomic ADD,
 *           Zero-Missing Routing, Dynamic B2B Routing, Auto-Heal, Health Scan
 * ============================================================================
 */

var SYSTEM_CONFIG = {
  SECRET_KEY: "Y2C_PREMIUM_SECURE_KEY_2026",
  SPREADSHEET_ID: "1nmi4iLeaIsI5IBHxkZxOAt0GwRCOKc0eEQ1CxqG4kF4",
  TIMEOUT_MS: 12000, 
  SHEETS: { 
    USERS: "Users", 
    SALES: "Sales_Database", 
    ITEMS: "Item_List", 
    ORDERS: "Orders", 
    MASTER: "Master_Data", 
    HQ: "HQ_Info", 
    RECIPES: "Recipes", 
    LOGS: "System_Logs", 
    AUDIT: "Audit_Logs",
    VENDOR_MAP: "Vendor_Mapping", 
    HQ_ORDERS: "Vendor_HQ_Orders", 
    B2B_VENDORS: "B2B_Vendors" 
  },
  TAX_RATES: {
    "ON": { name: "HST (13%)", rate: 0.13 }, "BC": { name: "GST 5% + PST 7%", rate: 0.12 }, 
    "AB": { name: "GST (5%)", rate: 0.05 }, "SK": { name: "GST 5% + PST 6%", rate: 0.11 }, 
    "MB": { name: "GST 5% + RST 7%", rate: 0.12 }, "QC": { name: "GST 5% + QST 9.975%", rate: 0.14975 },
    "DEFAULT": { name: "Standard Tax (13%)", rate: 0.13 }
  },
  B2B_EMAIL_NOTIFY: { ENABLED: true, CC: ["admin@sinjeoncanada.com"] },
  ADMIN_ALERT_EMAIL: "admin@sinjeoncanada.com"
};

function parseExpString(str) {
  if (!str || str === "-") return {};
  var batches = {};
  var parts = String(str).split('|');
  for (var i = 0; i < parts.length; i++) {
    if(parts[i].indexOf(':') > -1) {
      var pair = parts[i].split(':');
      var d = String(pair[0]).trim();
      var q = parseInt(pair[1]);
      if (d && !isNaN(q) && q > 0) batches[d] = q;
    } else if (parts[i].trim() !== "") {
      batches[parts[i].trim()] = 99999; 
    }
  }
  return batches;
}

function buildExpString(batches) {
  var dates = Object.keys(batches).sort();
  var arr = [];
  for (var i = 0; i < dates.length; i++) {
    var q = parseInt(batches[dates[i]]);
    if (!isNaN(q) && q > 0 && q !== 99999) { arr.push(dates[i] + ":" + q); } 
    else if (q === 99999) { arr.push(dates[i]); }
  }
  return arr.join(' | ') || "-";
}

function getFastData(sheet) {
  var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
  if (lr < 1 || lc < 1) return [];
  return sheet.getRange(1, 1, lr, lc).getValues();
}

function generateToken(payload) {
  var header = Utilities.base64EncodeWebSafe(JSON.stringify({alg: "HS256", typ: "JWT"}));
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  var signature = Utilities.computeHmacSha256Signature(header + "." + body, SYSTEM_CONFIG.SECRET_KEY);
  return header + "." + body + "." + Utilities.base64EncodeWebSafe(signature);
}

function verifyToken(token) {
  try {
    if (!token) return null;
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    var signature = Utilities.computeHmacSha256Signature(parts[0] + "." + parts[1], SYSTEM_CONFIG.SECRET_KEY);
    if (Utilities.base64EncodeWebSafe(signature) === parts[2]) {
      return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
    }
  } catch(e) {} 
  return null;
}

function getSheetSafe(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("DB 시스템 오류: [" + sheetName + "] 시트가 존재하지 않습니다.");
  return sheet;
}

function logSystemError(action, user, errorMessage) {
  try {
    var ss = SpreadsheetApp.openById(SYSTEM_CONFIG.SPREADSHEET_ID);
    var logSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.LOGS);
    if (!logSheet) { logSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.LOGS); logSheet.appendRow(["Timestamp", "Action", "User", "Error Message"]); }
    logSheet.appendRow([new Date(), action || "UNKNOWN", user || "GUEST", errorMessage]);
  } catch (e) {}
}

function recordAuditLog(user, actionType, target, details) {
  try {
    var ss = SpreadsheetApp.openById(SYSTEM_CONFIG.SPREADSHEET_ID);
    var auditSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.AUDIT);
    if (!auditSheet) { auditSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.AUDIT); auditSheet.appendRow(["Timestamp", "User", "Action Type", "Target Module", "Action Details"]); }
    auditSheet.appendRow([new Date(), user, actionType, target, details]);
  } catch (e) {}
}

function updateInventoryTimestamp() { try { PropertiesService.getScriptProperties().setProperty("LAST_INVENTORY_UPDATE", new Date().toISOString()); } catch(e) {} }
function getInventoryTimestamp() { try { return PropertiesService.getScriptProperties().getProperty("LAST_INVENTORY_UPDATE") || null; } catch(e) { return null; } }

// 🌟 [핵심 개선] 양념류, 소스류, 떡 등 한영혼용 면세 키워드 완벽 추가
function isZeroRatedCategory(categoryStr) {
  var cat = String(categoryStr || "").toUpperCase().trim();
  var zeroRatedCategories = [
    'FOOD', 'FROZEN', 'SAUCE', 'POWDER', 'GRAIN', 'RICE', 'INGREDIENTS', 
    'GROCERY', 'DISH', 'SEASONING', 'SPICE', 'MEAT', 'NOODLE',
    '양념', '소스', '시즈닝', '떡', '면', '식품', '냉동', '원물'
  ];
  return zeroRatedCategories.some(function(z){ return cat.indexOf(z) !== -1; });
}

function doPost(e) {
  var response = { success: false, message: "초기화 실패" };
  var needLock = false;
  var lock = null;
  var sessionUser = "GUEST";
  var action = "UNKNOWN";

  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "요청 데이터가 손상되었거나 없습니다." })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var params;
    try { params = JSON.parse(e.postData.contents); } catch (parseErr) { throw new Error("전송된 JSON 데이터 형식이 잘못되었습니다."); }
    action = params.action;
    if (!action) throw new Error("API 명령어가 누락되었습니다.");

    var lockActions = ["save_order", "update_master_data", "update_stock", "save_sales_records", "upsert_hq_order", "check_system_alerts"];
    if (lockActions.indexOf(action) !== -1) {
      needLock = true;
      try {
        lock = LockService.getScriptLock();
        if (lock) {
          var gotLock = false;
          for (var retryLock = 0; retryLock < 3; retryLock++) {
            gotLock = lock.tryLock(SYSTEM_CONFIG.TIMEOUT_MS);
            if (gotLock) break; 
            Utilities.sleep(1000 + Math.floor(Math.random() * 1000));
          }
          if (!gotLock) throw new Error("서버 병목현상(트래픽 초과): 다중 접속으로 인해 대기 중입니다. 자동 우회합니다.");
        }
      } catch(lockErr) {}
    }

    var ss = SpreadsheetApp.openById(SYSTEM_CONFIG.SPREADSHEET_ID);

    if (action === "login") {
      var id = String(params.id || "").trim(), pw = String(params.pw || "").trim();
      sessionUser = id;
      var data = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.USERS));
      var isAuthenticated = false;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === id && String(data[i][1]).trim() === pw) {
          var role = String(data[i][2]).trim().toUpperCase(), clientName = String(data[i][3]).trim();
          var state = "DEFAULT", allowedStates = "ALL";
          
          if (role === "PARTNER") {
            var mData = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.MASTER));
            for (var m = 17; m < mData.length; m++) {
              if (String(mData[m][1]).trim() === clientName) { state = String(mData[m][2]).trim().toUpperCase() || "DEFAULT"; break; }
            }
          } else if (role === "VENDOR") { allowedStates = String(data[i][4] || "ALL").trim().toUpperCase(); }
          
          var jwtToken = generateToken({ role: role, clientName: clientName, allowedStates: allowedStates, exp: new Date().getTime() + (24*60*60*1000) });
          response = { success: true, role: role, clientName: clientName, clientState: state, allowedStates: allowedStates, token: jwtToken, message: "Auth Success" };
          recordAuditLog(clientName, "LOGIN", "Access", "Role: " + role);
          isAuthenticated = true; break;
        }
      }
      if (!isAuthenticated) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
    } 
    else {
      var session = verifyToken(params.token);
      if (!session || session.exp < new Date().getTime()) throw new Error("보안 세션이 만료되었습니다. 다시 로그인해 주세요.");
      
      sessionUser = session.clientName;
      var userRole = String(session.role).toUpperCase();

      switch (action) {
        
        case "get_master_data":
          if (userRole !== "MASTER") throw new Error("접근 권한이 없습니다.");
          var mSheetRead = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.MASTER);
          var mDataRead = getFastData(mSheetRead);
          var clients = [];
          for (var mIdx = 17; mIdx < mDataRead.length; mIdx++) {
            if (mDataRead[mIdx][1]) { 
              clients.push({
                rowIdx: mIdx + 1, name: String(mDataRead[mIdx][1]).trim(), state: String(mDataRead[mIdx][2] || "").trim(),
                city: String(mDataRead[mIdx][3] || "").trim(), address: String(mDataRead[mIdx][4] || "").trim(),
                attn: String(mDataRead[mIdx][5] || "").trim(), email: String(mDataRead[mIdx][6] || "").trim(),
                bizId: String(mDataRead[mIdx][7] || "").trim()
              });
            }
          }
          response = { success: true, clients: clients };
          break;

        case "update_master_data":
          if (userRole !== "MASTER") throw new Error("접근 권한이 없습니다.");
          var mReq = params.client;
          if (!mReq || !mReq.rowIdx) throw new Error("데이터 구조 오류입니다.");
          var mSheetUp = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.MASTER);
          mSheetUp.getRange(mReq.rowIdx, 3, 1, 6).setValues([[ mReq.state, mReq.city, mReq.address, mReq.attn, mReq.email, mReq.bizId ]]);
          recordAuditLog(sessionUser, "MASTER_DATA_UPDATE", "Master DB", "Row: " + mReq.rowIdx);
          response = { success: true, message: "마스터 데이터베이스 저장 완료." };
          break;

        case "get_sales_records":
          if (userRole !== "MASTER") throw new Error("접근 권한이 없습니다.");
          var sYear = String(params.year).trim(), sClient = String(params.clientName).trim();
          var sSheetRead = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.SALES);
          var sDataRead = getFastData(sSheetRead);
          var recordsMap = {};
          for (var j = 5; j < sDataRead.length; j++) {
            if (String(sDataRead[j][1]).trim() === sYear && String(sDataRead[j][3]).trim() === sClient) {
              var m = parseInt(sDataRead[j][2]);
              recordsMap[m] = { month: m, pos: Number(sDataRead[j][4]) || 0, delivery: Number(sDataRead[j][5]) || 0, total: Number(sDataRead[j][6]) || 0, exists: true, rowIdx: j + 1 };
            }
          }
          var records = [];
          for (var mth = 1; mth <= 12; mth++) { records.push(recordsMap[mth] ? recordsMap[mth] : { month: mth, pos: 0, delivery: 0, total: 0, exists: false, rowIdx: -1 }); }
          response = { success: true, records: records };
          break;

        case "save_sales_records":
          if (userRole !== "MASTER") throw new Error("접근 권한이 없습니다.");
          var targetYear = String(params.year).trim(), targetClient = String(params.clientName).trim();
          var recordsToSave = params.records;
          if (!recordsToSave || !Array.isArray(recordsToSave)) throw new Error("데이터 배열 오류입니다.");
          var sSheetUp = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.SALES);
          var sDataUp = getFastData(sSheetUp);
          var rowMap = {};
          for (var jj = 5; jj < sDataUp.length; jj++) {
             if (String(sDataUp[jj][1]).trim() === targetYear && String(sDataUp[jj][3]).trim() === targetClient) { rowMap[parseInt(sDataUp[jj][2])] = jj + 1; }
          }
          for (var r = 0; r < recordsToSave.length; r++) {
             var rec = recordsToSave[r];
             var sMonth = parseInt(rec.month);
             var pos = Math.max(0, Number(rec.pos) || 0), del = Math.max(0, Number(rec.delivery) || 0);
             var tot = Number((pos + del).toFixed(2));
             if (pos > 0 || del > 0) {
               if (rowMap[sMonth]) { sSheetUp.getRange(rowMap[sMonth], 5, 1, 3).setValues([[pos, del, tot]]); } 
               else { sSheetUp.appendRow([new Date(), targetYear, sMonth, targetClient, pos, del, tot]); }
             }
          }
          recordAuditLog(sessionUser, "SALES_DATA_UPDATE", "Sales DB", "Client: " + targetClient);
          response = { success: true, message: "매출 동기화 완료." };
          break;

        case "check_system_alerts":
          if (userRole !== "MASTER") throw new Error("마스터 권한이 필요합니다.");
          var itmSheetHealth = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.ITEMS);
          var dataHealth = getFastData(itmSheetHealth);
          if (dataHealth.length <= 1) throw new Error("등록된 품목이 없습니다.");
          var hHeaders = dataHealth[0], hStockCols = {}, hExpCols = {}; 
          for (var hh = 4; hh < hHeaders.length; hh++) {
            var hhName = String(hHeaders[hh]).trim().toUpperCase();
            if (hhName.indexOf("STOCK_") === 0) hStockCols[hhName.replace("STOCK_", "")] = hh;
            if (hhName.indexOf("EXP_DATE_") === 0) hExpCols[hhName.replace("EXP_DATE_", "")] = hh;
          }
          var alerts = { lowStock: [], expiring: [] };
          var today = new Date(); today.setHours(0,0,0,0);
          for (var hIdx = 1; hIdx < dataHealth.length; hIdx++) {
            if (!dataHealth[hIdx][0]) continue;
            var hCode = String(dataHealth[hIdx][0]).trim(), hName = String(dataHealth[hIdx][2]).trim();
            for (var hRegion in hStockCols) {
              var hStockVal = parseInt(dataHealth[hIdx][hStockCols[hRegion]]) || 0;
              if (hStockVal > 0 && hStockVal <= 10) { alerts.lowStock.push({ region: hRegion, code: hCode, name: hName, stock: hStockVal }); }
              if (hStockVal <= 0) { alerts.lowStock.push({ region: hRegion, code: hCode, name: hName, stock: "품절(Sold Out)" }); }
              if (hExpCols[hRegion] !== undefined) {
                var hExpStr = String(dataHealth[hIdx][hExpCols[hRegion]] || "").trim();
                var hBatches = parseExpString(hExpStr);
                var hDates = Object.keys(hBatches);
                for(var b=0; b<hDates.length; b++) {
                  var dMatch = hDates[b].match(/\d{4}-\d{2}-\d{2}/);
                  if (dMatch && hBatches[hDates[b]] !== 99999 && hBatches[hDates[b]] > 0) {
                    var expD = new Date(dMatch[0] + "T00:00:00");
                    var diffDays = Math.ceil((expD - today) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 30) { alerts.expiring.push({ region: hRegion, code: hCode, name: hName, date: dMatch[0], daysLeft: diffDays, qty: hBatches[hDates[b]] }); }
                  }
                }
              }
            }
          }
          if (needLock) { try { if (lock) lock.releaseLock(); needLock = false; } catch(e){} }
          if (alerts.lowStock.length > 0 || alerts.expiring.length > 0) {
            try {
              var emailSubject = "⚠️ [시스템 경고] 신전 캐나다 재고 부족 및 유통기한 임박 리포트";
              var htmlBody = "<div style='font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'><div style='background-color: #E3000F; color: white; padding: 25px; text-align: center;'><h2 style='margin: 0; font-size: 22px; letter-spacing: 1px;'>SYSTEM HEALTH REPORT</h2><p style='margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;'>Automated Alert Scan Results</p></div><div style='padding: 30px; background-color: #ffffff;'>";
              if (alerts.lowStock.length > 0) {
                htmlBody += "<h3 style='color: #9A0007; border-bottom: 2px solid #fee2e2; padding-bottom: 8px;'>🚨 Low Stock / Sold Out (" + alerts.lowStock.length + "건)</h3><table style='width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px;'><tr style='background-color: #f8fafc;'><th style='padding: 10px; text-align: left;'>Hub</th><th style='padding: 10px; text-align: left;'>Product Name</th><th style='padding: 10px; text-align: center;'>Status</th></tr>";
                for (var s = 0; s < alerts.lowStock.length; s++) { var st = alerts.lowStock[s]; htmlBody += "<tr style='border-bottom: 1px solid #e2e8f0;'><td style='padding: 10px; font-weight: bold; color: #475569;'>" + st.region + "</td><td style='padding: 10px; color: #1e293b;'>" + st.name + " <span style='color:#94a3b8; font-size:11px;'>[" + st.code + "]</span></td><td style='padding: 10px; text-align: center; font-weight: bold; color: #E3000F;'>" + st.stock + "</td></tr>"; }
                htmlBody += "</table>";
              }
              if (alerts.expiring.length > 0) {
                htmlBody += "<h3 style='color: #d97706; border-bottom: 2px solid #fef3c7; padding-bottom: 8px;'>⏳ Expiration Alert (" + alerts.expiring.length + "건)</h3><table style='width: 100%; border-collapse: collapse; font-size: 13px;'><tr style='background-color: #f8fafc;'><th style='padding: 10px; text-align: left;'>Hub</th><th style='padding: 10px; text-align: left;'>Product Name</th><th style='padding: 10px; text-align: center;'>Exp. Date</th><th style='padding: 10px; text-align: center;'>Qty</th></tr>";
                for (var eExp = 0; eExp < alerts.expiring.length; eExp++) { var ex = alerts.expiring[eExp]; var dayBadge = ex.daysLeft < 0 ? "(기한 초과)" : "(D-" + ex.daysLeft + ")"; var textCol = ex.daysLeft < 0 ? "#E3000F" : "#d97706"; htmlBody += "<tr style='border-bottom: 1px solid #e2e8f0;'><td style='padding: 10px; font-weight: bold; color: #475569;'>" + ex.region + "</td><td style='padding: 10px; color: #1e293b;'>" + ex.name + "</td><td style='padding: 10px; text-align: center; font-weight: bold; color: " + textCol + ";'>" + ex.date + " <br><span style='font-size:11px;'>" + dayBadge + "</span></td><td style='padding: 10px; text-align: center; font-weight: bold;'>" + ex.qty + "</td></tr>"; }
                htmlBody += "</table>";
              }
              htmlBody += "<div style='margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;'>해당 리포트는 Y2C Holdings 포털에서 자동 생성되었습니다.</div></div></div>";
              MailApp.sendEmail({ to: SYSTEM_CONFIG.ADMIN_ALERT_EMAIL, subject: emailSubject, htmlBody: htmlBody });
            } catch(emailErr) { logSystemError("ALERT_EMAIL_FAIL", sessionUser, emailErr.message); }
          }
          recordAuditLog(sessionUser, "SYSTEM_HEALTH_SCAN", "Items DB", "Low: " + alerts.lowStock.length + ", Expiring: " + alerts.expiring.length);
          response = { success: true, alerts: alerts, message: "시스템 스캔 및 이메일 보고가 발송되었습니다." };
          break;

        case "get_dashboard":
          if (userRole === "VENDOR") throw new Error("접근이 거부되었습니다.");
          var targetYearD = String(params.year || new Date().getFullYear()).trim();
          var dataD = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.SALES));
          var monthlySales = [0,0,0,0,0,0,0,0,0,0,0,0], ytdTotal = 0, ytdPos = 0, ytdDelivery = 0;
          for(var id = 5; id < dataD.length; id++) {
            if (String(dataD[id][1]).trim() === targetYearD && (userRole === "MASTER" || String(session.clientName).trim() === String(dataD[id][3]).trim())) {
               var mId = parseInt(dataD[id][2]) - 1; 
               if(mId >= 0 && mId <= 11) { var rowTot = Number(dataD[id][6]) || 0; monthlySales[mId] += rowTot; ytdTotal += rowTot; ytdPos += (Number(dataD[id][4]) || 0); ytdDelivery += (Number(dataD[id][5]) || 0); }
            }
          }
          response = { success: true, monthlySales: monthlySales, ytdTotal: ytdTotal, ytdPos: ytdPos, ytdDelivery: ytdDelivery };
          break;

        case "get_items":
          var clientState = String(params.clientState || "").toUpperCase();
          if (!clientState || clientState === "NULL" || clientState === "") { clientState = "DEFAULT"; }
          if (userRole !== "MASTER" && userRole !== "VENDOR" && clientState === "DEFAULT") {
            var mData = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.MASTER));
            for (var mIdx = 17; mIdx < mData.length; mIdx++) {
              if (String(mData[mIdx][1]).trim() === session.clientName) { clientState = String(mData[mIdx][2]).trim().toUpperCase() || "DEFAULT"; break; }
            }
          }
          var itemSheet = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.ITEMS);
          var data = getFastData(itemSheet);
          if (data.length <= 1) throw new Error("등록된 품목 없음.");
          
          var headers = data[0], priceColIdx = 4, stockCols = {}, expCols = {}; 
          for (var h = 4; h < headers.length; h++) {
            var hName = String(headers[h]).trim().toUpperCase();
            if (hName === clientState) priceColIdx = h;
            if (hName.indexOf("STOCK_") === 0) stockCols[hName.replace("STOCK_", "")] = h;
            if (hName.indexOf("EXP_DATE_") === 0) expCols[hName.replace("EXP_DATE_", "")] = h;
          }
          var vendorStates = session.allowedStates ? session.allowedStates.split(',').map(function(s){return s.trim();}) : ["ALL"];
          var items = [];
          for (var i = 1; i < data.length; i++) {
            if (data[i][0]) {
              var itemCode = String(data[i][0]).trim();
              var regionalPrice = (data[i][priceColIdx] !== undefined && data[i][priceColIdx] !== "") ? data[i][priceColIdx] : data[i][4];
              var stockBreakdown = {}, expBreakdown = {}, totalStock = 0, regionalStock = 0;
              for (var region in stockCols) {
                if (userRole === "VENDOR" && vendorStates.indexOf("ALL") === -1 && vendorStates.indexOf(region) === -1) continue; 
                var sVal = parseInt(data[i][stockCols[region]]) || 0;
                stockBreakdown[region] = sVal; totalStock += sVal;
                if (expCols[region] !== undefined) expBreakdown[region] = String(data[i][expCols[region]] || "").trim();
                if (region === clientState) regionalStock = sVal;
              }
              if (stockCols[clientState] === undefined && Object.keys(stockCols).length > 0) regionalStock = totalStock;
              if (Object.keys(stockCols).length === 0) { regionalStock = 999; totalStock = 999; } 
              items.push({ code: itemCode, image: String(data[i][1]).trim(), name: String(data[i][2]).trim(), category: String(data[i][3]).trim(), price: Number(regionalPrice) || 0, regionalStock: regionalStock, totalStock: totalStock, stockBreakdown: stockBreakdown, expBreakdown: expBreakdown });
            }
          }
          response = { success: true, items: items, appliedState: clientState, lastUpdated: getInventoryTimestamp() };
          break;

        case "update_stock":
          if (userRole !== "MASTER" && userRole !== "VENDOR") throw new Error("권한이 없습니다.");
          if (!params.stockUpdates || !Array.isArray(params.stockUpdates)) throw new Error("데이터 구조 오류입니다.");
          
          var syncMode = params.mode || "SET"; 

          var iSheet = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.ITEMS);
          var lr2 = iSheet.getLastRow(), lc2 = iSheet.getLastColumn();
          var iRange2 = iSheet.getRange(1, 1, lr2, lc2);
          var iData2 = iRange2.getValues(); 
          var iHeaders2 = iData2[0];
          var stockColMap2 = {}, expColMap2 = {}; 
          for (var th2 = 0; th2 < iHeaders2.length; th2++) { 
            var thName2 = String(iHeaders2[th2]).trim().toUpperCase();
            if (thName2.indexOf("STOCK_") === 0) stockColMap2[thName2.replace("STOCK_", "")] = th2; 
            if (thName2.indexOf("EXP_DATE_") === 0) expColMap2[thName2.replace("EXP_DATE_", "")] = th2; 
          }
          var updateRowMap2 = {}; 
          for(var u2 = 1; u2 < iData2.length; u2++) { if(iData2[u2][0]) updateRowMap2[String(iData2[u2][0]).trim()] = u2; }
          var auditSummary2 = []; 
          var vendorStatesAuth = session.allowedStates ? session.allowedStates.split(',').map(function(s){return s.trim();}) : ["ALL"];
          
          for(var v2 = 0; v2 < params.stockUpdates.length; v2++){
            var req = params.stockUpdates[v2];
            if (!req || !req.code) continue;
            var uRowIdx = updateRowMap2[String(req.code).trim()];
            if (uRowIdx !== undefined) {
              for (var region in req.stockBreakdown) {
                if (userRole === "VENDOR" && vendorStatesAuth.indexOf("ALL") === -1 && vendorStatesAuth.indexOf(region) === -1) { throw new Error("보안 오류: " + region + " 허브 권한 없음."); }
                
                if (stockColMap2[region] !== undefined) {
                  var currentLiveStock = parseInt(iData2[uRowIdx][stockColMap2[region]]) || 0;
                  var requestedVal = parseInt(req.stockBreakdown[region]) || 0;
                  var newStock = 0;

                  if (syncMode === "ADD") {
                    newStock = Math.max(0, currentLiveStock + requestedVal); 
                  } else {
                    newStock = Math.max(0, requestedVal); 
                  }
                  iData2[uRowIdx][stockColMap2[region]] = newStock;
                  
                  var currentLiveExp = String(iData2[uRowIdx][expColMap2[region]] || "").trim();
                  if (syncMode === "ADD") {
                    var liveBatches = parseExpString(currentLiveExp);
                    var addBatches = parseExpString(req.expBreakdown && req.expBreakdown[region] ? req.expBreakdown[region] : "");
                    for (var d in addBatches) { liveBatches[d] = (liveBatches[d] || 0) + addBatches[d]; }
                    iData2[uRowIdx][expColMap2[region]] = buildExpString(liveBatches);
                  } else {
                    var expDateStr = req.expBreakdown && req.expBreakdown[region] ? req.expBreakdown[region] : "";
                    if (expColMap2[region] !== undefined && expDateStr !== undefined) { iData2[uRowIdx][expColMap2[region]] = expDateStr; }
                  }
                  auditSummary2.push(req.code + " [" + region + " " + syncMode + "->" + newStock + "]");
                }
              }
            }
          }
          if (auditSummary2.length > 0) {
            iRange2.setValues(iData2); SpreadsheetApp.flush(); updateInventoryTimestamp(); 
            recordAuditLog(sessionUser, "B2B_STOCK_UPDATE", "Inventory", "Mode: " + syncMode + ", Updated: " + auditSummary2.length);
          }
          response = { success: true, message: "재고 동기화 완료 (" + syncMode + " 모드)." };
          break;

        case "save_order":
          if (userRole === "VENDOR") throw new Error("물류 업체는 발주 불가.");
          var reqState = String(params.clientState || "DEFAULT").trim().toUpperCase();
          var itmSheet = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.ITEMS);
          var lr = itmSheet.getLastRow(), lc = itmSheet.getLastColumn();
          var iRange = itmSheet.getRange(1, 1, lr, lc);
          var itmData = iRange.getValues();
          var itmHeaders = itmData[0];
          var targetStockCol = -1, targetExpCol = -1;
          for (var sh = 0; sh < itmHeaders.length; sh++) { 
            var hTrim = String(itmHeaders[sh]).trim().toUpperCase();
            if (hTrim === "STOCK_" + reqState) targetStockCol = sh; 
            if (hTrim === "EXP_DATE_" + reqState) targetExpCol = sh; 
          }
          
          var orderSubtotal = 0, foodSubtotal = 0, taxableSubtotal = 0;

          if (targetStockCol !== -1) {
            var codeRowMap = {};
            for(var c = 1; c < itmData.length; c++) { if(itmData[c][0]) codeRowMap[String(itmData[c][0]).trim()] = c; }
            for(var p = 0; p < params.items.length; p++) {
              var rIdx = codeRowMap[String(params.items[p].code).trim()]; 
              if (rIdx !== undefined) {
                var currentStock = parseInt(itmData[rIdx][targetStockCol]) || 0;
                var orderQty = Math.max(0, parseInt(params.items[p].qty) || 0); 
                if (currentStock < orderQty) throw new Error("[" + params.items[p].name + "] 품목 재고가 부족합니다.");
                
                itmData[rIdx][targetStockCol] = currentStock - orderQty;
                
                if (targetExpCol !== -1) {
                  var expStr = String(itmData[rIdx][targetExpCol] || "");
                  var batches = parseExpString(expStr);
                  var remainingToDeduct = orderQty;
                  var dates = Object.keys(batches).sort(); 
                  for (var d = 0; d < dates.length; d++) {
                    if (remainingToDeduct <= 0) break;
                    var dateKey = dates[d];
                    if (batches[dateKey] <= remainingToDeduct) { remainingToDeduct -= batches[dateKey]; batches[dateKey] = 0; } 
                    else { batches[dateKey] -= remainingToDeduct; remainingToDeduct = 0; }
                  }
                  itmData[rIdx][targetExpCol] = buildExpString(batches); 
                }
              }
            }
          }
          
          var ordersSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.ORDERS);
          if(!ordersSheet) { ordersSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.ORDERS); ordersSheet.appendRow(["Timestamp", "Client", "Item Code", "Item Name", "Qty", "Price", "Total", "Status", "Region", "TaxType"]); }
          var batchId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
          var rowsToInsert = [], timestamp = new Date();
          
          for (var k = 0; k < params.items.length; k++) {
            var itemObj = params.items[k];
            var qty = Math.max(0, parseInt(itemObj.qty) || 0), price = Number(itemObj.price) || 0;
            if (qty > 0) { 
              var lineTotal = qty * price;
              orderSubtotal += lineTotal;
              var isZeroRated = itemObj.isZeroRated !== undefined ? itemObj.isZeroRated : isZeroRatedCategory(itemObj.category);
              if (isZeroRated) { foodSubtotal += lineTotal; } else { taxableSubtotal += lineTotal; }
              rowsToInsert.push([timestamp, session.clientName, itemObj.code, itemObj.name, qty, price, lineTotal, "PENDING", reqState, isZeroRated ? "ZERO_RATED" : "TAXABLE"]); 
            }
          }
          
          if (rowsToInsert.length > 0) { ordersSheet.getRange(ordersSheet.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert); }
          if (targetStockCol !== -1) { iRange.setValues(itmData); SpreadsheetApp.flush(); updateInventoryTimestamp(); }
          recordAuditLog(sessionUser, "SUBMIT_ORDER", "Order", "ID: " + batchId);

          if (needLock) { try { if (lock) lock.releaseLock(); needLock = false; } catch(e){} }

          var provTaxRate = SYSTEM_CONFIG.TAX_RATES[reqState] ? SYSTEM_CONFIG.TAX_RATES[reqState].rate : SYSTEM_CONFIG.TAX_RATES["DEFAULT"].rate;
          var provTaxName = SYSTEM_CONFIG.TAX_RATES[reqState] ? SYSTEM_CONFIG.TAX_RATES[reqState].name : SYSTEM_CONFIG.TAX_RATES["DEFAULT"].name;
          var calcTaxAmount = Number((taxableSubtotal * provTaxRate).toFixed(2));
          var calcGrandTotal = Number((orderSubtotal + calcTaxAmount).toFixed(2));

          if (SYSTEM_CONFIG.B2B_EMAIL_NOTIFY.ENABLED) {
            var targetB2BEmail = "", targetVendorName = "B2B Logistics Partner";
            try {
              var vendorSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.B2B_VENDORS);
              if (!vendorSheet) {
                vendorSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.B2B_VENDORS);
                vendorSheet.appendRow(["State (e.g., ON, BC)", "Vendor Email", "Vendor Name"]);
                vendorSheet.appendRow(["ON", "on_vendor@example.com", "Ontario Logistics"]);
                vendorSheet.appendRow(["DEFAULT", "default_b2b@example.com", "Global Logistics"]);
              }
              var vendorData = getFastData(vendorSheet);
              var defaultEmail = "", defaultName = "Global Logistics";
              for (var vRow = 1; vRow < vendorData.length; vRow++) {
                var vState = String(vendorData[vRow][0]).trim().toUpperCase(), vEmail = String(vendorData[vRow][1]).trim(), vName = String(vendorData[vRow][2]).trim();
                if (vState === "DEFAULT" && vEmail) { defaultEmail = vEmail; defaultName = vName; }
                if (vState === reqState && vEmail) { targetB2BEmail = vEmail; targetVendorName = vName; break; }
              }
              if (!targetB2BEmail) { targetB2BEmail = defaultEmail; targetVendorName = defaultName; }
            } catch(mappingErr) { logSystemError("B2B_EMAIL_MAPPING_ERR", sessionUser, mappingErr.message); }

            if (targetB2BEmail) {
              try {
                var emailSubject = "[B2B Order] SINJEON CANADA 발주 요청서 - " + session.clientName + " (" + batchId + ")";
                var htmlBody = "<div style='font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>" +
                               "<div style='background-color: #E3000F; color: white; padding: 25px; text-align: center;'><h2 style='margin: 0; font-size: 24px; letter-spacing: 2px; font-weight: 800;'>SINJEON CANADA</h2><p style='margin: 8px 0 0 0; font-size: 13px; opacity: 0.85; letter-spacing: 1px;'>OFFICIAL B2B ORDER INVOICE</p></div>" +
                               "<div style='padding: 30px; background-color: #ffffff;'><table style='width: 100%; border-collapse: collapse; margin-bottom: 25px;'>" +
                               "<tr><td style='padding: 8px 0; color: #6b7280; font-size: 14px;'>Franchise:</td><td style='padding: 8px 0; font-weight: bold; font-size: 16px; color: #111827;'>" + session.clientName + "</td></tr>" +
                               "<tr><td style='padding: 8px 0; color: #6b7280; font-size: 14px;'>Hub Region:</td><td style='padding: 8px 0; font-weight: bold; font-size: 16px; color: #E3000F;'>" + reqState + " (" + targetVendorName + ")</td></tr>" +
                               "<tr><td style='padding: 8px 0; color: #6b7280; font-size: 14px;'>Order ID:</td><td style='padding: 8px 0; font-weight: bold; font-size: 16px; color: #111827;'>" + batchId + "</td></tr>" +
                               "<tr><td style='padding: 8px 0; color: #6b7280; font-size: 14px;'>Date:</td><td style='padding: 8px 0; font-size: 15px; color: #374151;'>" + timestamp.toLocaleString('en-CA', {timeZone: 'America/Toronto'}) + " (EST)</td></tr></table>" +
                               "<table style='width: 100%; border-collapse: collapse; font-size: 13px;'>" +
                               "<thead><tr style='background-color: #f8fafc; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;'><th style='padding: 10px; text-align: left;'>Code</th><th style='padding: 10px; text-align: left;'>Item Description</th><th style='padding: 10px; text-center;'>Tax Status</th><th style='padding: 10px; text-align: center;'>Qty</th><th style='padding: 10px; text-align: right;'>Amount</th></tr></thead><tbody>";

                for (var n = 0; n < params.items.length; n++) {
                  var itm = params.items[n];
                  if (itm.qty > 0) {
                    var isZ = itm.isZeroRated !== undefined ? itm.isZeroRated : isZeroRatedCategory(itm.category);
                    var taxBadge = isZ ? "<span style='color: #059669; font-weight: bold;'>0% (Food)</span>" : "<span style='color: #2563eb; font-weight: bold;'>Taxable</span>";
                    htmlBody += "<tr style='border-bottom: 1px solid #e2e8f0;'><td style='padding: 10px; color: #64748b; font-family: monospace;'>" + itm.code + "</td><td style='padding: 10px; font-weight: 600; color: #1e293b;'>" + itm.name + "</td><td style='padding: 10px; text-align: center; font-size: 11px;'>" + taxBadge + "</td><td style='padding: 10px; text-align: center; font-weight: 800; color: #E3000F;'>" + itm.qty + "</td><td style='padding: 10px; text-align: right; font-family: monospace;'>$" + (itm.qty * Number(itm.price)).toFixed(2) + "</td></tr>";
                  }
                }
                
                htmlBody += "<tr style='background-color: #f8fafc;'><td colspan='4' style='padding: 8px 10px; text-align: right; font-weight: bold;'>Food & Groceries (0% Zero-Rated):</td><td style='padding: 8px 10px; text-align: right; font-family: monospace;'>$" + foodSubtotal.toFixed(2) + "</td></tr>";
                htmlBody += "<tr style='background-color: #f8fafc;'><td colspan='4' style='padding: 8px 10px; text-align: right; font-weight: bold;'>Taxable Supplies / Goods:</td><td style='padding: 8px 10px; text-align: right; font-family: monospace;'>$" + taxableSubtotal.toFixed(2) + "</td></tr>";
                htmlBody += "<tr style='background-color: #f8fafc;'><td colspan='4' style='padding: 8px 10px; text-align: right; font-weight: bold;'>Estimated Tax - " + provTaxName + ":</td><td style='padding: 8px 10px; text-align: right; font-family: monospace;'>$" + calcTaxAmount.toFixed(2) + "</td></tr>";
                htmlBody += "<tr style='border-top: 2px solid #cbd5e1; background-color: #fff1f2;'><td colspan='4' style='padding: 12px 10px; text-align: right; font-weight: 900; color: #9A0007; font-size: 15px;'>TOTAL ORDER AMOUNT:</td><td style='padding: 12px 10px; text-align: right; font-weight: 900; color: #E3000F; font-size: 18px; font-family: monospace;'>$" + calcGrandTotal.toFixed(2) + "</td></tr>";
                htmlBody += "</tbody></table><div style='margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; text-align: center; color: #94a3b8; font-size: 12px;'><p style='margin: 0;'>This is an automated dispatch from Y2C Holdings Premium Portal.</p></div></div></div>";

                MailApp.sendEmail({ to: targetB2BEmail, cc: SYSTEM_CONFIG.B2B_EMAIL_NOTIFY.CC.join(","), subject: emailSubject, htmlBody: htmlBody });
              } catch(emailErr) { logSystemError("EMAIL_SEND_FAIL", sessionUser, emailErr.message); }
            }
          }
          response = { success: true, message: "발주 및 이메일 전송 완료", batchId: batchId };
          break;

        case "get_invoice":
          if (userRole !== "MASTER") throw new Error("접근 권한이 없습니다.");
          var reqClientStr = String(params.clientName).replace(/\s*\([^)]*\)$/, '').trim().toLowerCase();
          var mData2 = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.MASTER));
          var clientInfo = { name: String(params.clientName || "Unknown").trim(), state: "DEFAULT", city: "-", address: "-", attn: "-", email: "-", bizId: "-" };
          for (var i2 = 17; i2 < mData2.length; i2++) { 
            if(mData2[i2][1] && String(mData2[i2][1]).trim().toLowerCase() === reqClientStr) { 
              clientInfo = { name: String(mData2[i2][1]).trim(), state: String(mData2[i2][2]).trim() || "DEFAULT", city: String(mData2[i2][3]).trim(), address: String(mData2[i2][4]).trim(), attn: String(mData2[i2][5]).trim(), email: String(mData2[i2][6]).trim(), bizId: String(mData2[i2][7]).trim() }; break; 
            }
          }
          var sData = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.SALES));
          var calculatedBase = 0, sMonth = parseInt(params.startMonth) || 1, eMonth = parseInt(params.endMonth) || 12;
          for (var j = 5; j < sData.length; j++) { 
            if(sData[j][3] && String(sData[j][3]).trim().toLowerCase() === reqClientStr && String(sData[j][1]).trim() === String(params.year).trim()) { 
              var m = parseInt(sData[j][2]) || 0; if (m >= sMonth && m <= eMonth) { calculatedBase += (Number(sData[j][6]) || 0); } 
            }
          }
          var hqInfo = { name: "-", address: "-", contact: "-", regNo: "-", rep: "-", bank: "-", bankAddress: "-", account: "-", swift: "-" };
          try {
            var hqDataRaw = getFastData(getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.HQ));
            for (var k = 0; k < hqDataRaw.length; k++) {
              if (hqDataRaw[k][0] != null && hqDataRaw[k][0] !== "") {
                var key = String(hqDataRaw[k][0]).trim().toUpperCase(), val = (hqDataRaw[k][1] != null) ? String(hqDataRaw[k][1]).trim() : "-";
                if (key === "COMPANY NAME") hqInfo.name = val; else if (key === "ADDRESS" || key === "HQ ADDRESS") hqInfo.address = val; else if (key === "CONTACT") hqInfo.contact = val; else if (key === "REG NO" || key === "REGISTRATION NO" || key === "BUSINESS NO") hqInfo.regNo = val; else if (key === "REPRESENTATIVE" || key === "REP") hqInfo.rep = val; else if (key === "BANK NAME" || key === "BANK") hqInfo.bank = val; else if (key === "BANK ADDRESS") hqInfo.bankAddress = val; else if (key === "ACCOUNT NO" || key === "ACCOUNT NUMBER" || key === "ACCOUNT") hqInfo.account = val; else if (key === "SWIFT CODE" || key === "SWIFT") hqInfo.swift = val;
              }
            }
          } catch(e) {} 
          response = { success: true, clientInfo: clientInfo, calculatedBase: calculatedBase, hqInfo: hqInfo };
          break;

        case "get_procurement_data":
          var mapSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.VENDOR_MAP);
          if(!mapSheet) { mapSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.VENDOR_MAP); mapSheet.appendRow(["Vendor Name", "Vendor Item Code", "HQ Master Code", "Product Name"]); }
          var mapData = getFastData(mapSheet);
          var mappings = [];
          for(var m2 = 1; m2 < mapData.length; m2++) {
            if(mapData[m2][0]) mappings.push({ vendor: String(mapData[m2][0]).trim(), vendorCode: String(mapData[m2][1]).trim(), hqCode: String(mapData[m2][2]).trim(), itemName: String(mapData[m2][3]).trim() });
          }
          var hqSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.HQ_ORDERS);
          if(!hqSheet) { hqSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.HQ_ORDERS); hqSheet.appendRow(["Order ID", "Date", "Vendor Name", "Region", "Items Summary", "Status", "ETA"]); }
          var hqDataList = getFastData(hqSheet);
          var hqOrders = [];
          for(var j2 = 1; j2 < hqDataList.length; j2++) {
            if(hqDataList[j2][0]) hqOrders.push({ id: String(hqDataList[j2][0]).trim(), date: String(hqDataList[j2][1]).trim(), vendor: String(hqDataList[j2][2]).trim(), region: String(hqDataList[j2][3]).trim(), items: String(hqDataList[j2][4]).trim(), status: String(hqDataList[j2][5]).trim(), eta: String(hqDataList[j2][6]).trim() });
          }
          var orderMetrics = { totalQty: 0, totalAmount: 0 };
          var fOrdersSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.ORDERS);
          if (fOrdersSheet) {
            var fData = getFastData(fOrdersSheet);
            for (var f = 1; f < fData.length; f++) {
              orderMetrics.totalQty += (Number(fData[f][4]) || 0); 
              orderMetrics.totalAmount += (Number(fData[f][6]) || 0); 
            }
          }
          response = { success: true, mappings: mappings, hqOrders: hqOrders, orderMetrics: orderMetrics };
          break;

        case "get_recipe":
        case "get_recipes":
        case "load_recipes":
        case "fetch_recipes":
        case "recipe_list":
          if (userRole === "VENDOR") throw new Error("레시피 접근 권한이 없습니다.");
          var rSheet = getSheetSafe(ss, SYSTEM_CONFIG.SHEETS.RECIPES);
          var rData = getFastData(rSheet);
          var recipes = [];
          for (var r1 = 1; r1 < rData.length; r1++) { 
             if (rData[r1][0]) {
               recipes.push({ id: String(rData[r1][0]).trim(), title: String(rData[r1][1]).trim(), category: String(rData[r1][2]).trim(), ingredients: String(rData[r1][3]).trim(), instructions: String(rData[r1][4]).trim(), tips: String(rData[r1][5]).trim() }); 
             }
          }
          response = { success: true, recipes: recipes };
          break;

        case "upsert_hq_order":
          if (userRole !== "MASTER") throw new Error("접근 권한이 거부되었습니다.");
          var reqOrder = params.order;
          if(!reqOrder) throw new Error("발주 데이터가 없습니다.");
          var hqSheet2 = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.HQ_ORDERS);
          if(!hqSheet2) { hqSheet2 = ss.insertSheet(SYSTEM_CONFIG.SHEETS.HQ_ORDERS); hqSheet2.appendRow(["Order ID", "Date", "Vendor Name", "Region", "Items Summary", "Status", "ETA"]); }
          var hqDataRaw2 = getFastData(hqSheet2);
          var foundRow = -1;
          for(var r3=1; r3<hqDataRaw2.length; r3++) {
            if(String(hqDataRaw2[r3][0]).trim() === String(reqOrder.id).trim()) { foundRow = r3 + 1; break; }
          }
          if(foundRow !== -1) {
            hqSheet2.getRange(foundRow, 1, 1, 7).setValues([[reqOrder.id, reqOrder.date, reqOrder.vendor, reqOrder.region, reqOrder.items, reqOrder.status, reqOrder.eta]]);
            recordAuditLog(sessionUser, "HQ_ORDER_UPDATE", "Procurement", "Order ID: " + reqOrder.id + " updated to " + reqOrder.status);
          } else {
            var newId = "HQ-" + Math.floor(100000 + Math.random() * 900000);
            var todayStr = new Date().toISOString().split('T')[0];
            hqSheet2.appendRow([newId, todayStr, reqOrder.vendor, reqOrder.region, reqOrder.items, "HQ_PENDING", "-"]);
            recordAuditLog(sessionUser, "HQ_ORDER_CREATE", "Procurement", "New Order: " + newId);
          }
          response = { success: true, message: "본사 조달 데이터가 성공적으로 동기화되었습니다." };
          break;

        default: throw new Error("시스템에 정의되지 않은 API 명령어입니다. (요청: " + action + ")");
      }
    }
  } catch (error) { 
    response = { success: false, message: error.message }; 
    try { logSystemError(action, sessionUser, error.message); } catch(e){}
  } finally { 
    if (needLock) { try { if (lock) lock.releaseLock(); } catch(e2){} }
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function forceEmailAuth() {
  MailApp.sendEmail(SYSTEM_CONFIG.ADMIN_ALERT_EMAIL, "SINJEON CANADA 이메일 권한 승인 완료", "대표님, 시스템의 이메일 발송 권한이 정상적으로 승인되었습니다.");
}
