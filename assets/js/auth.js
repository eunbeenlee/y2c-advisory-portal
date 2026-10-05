/**
 * ============================================================================
 * Y2C Holdings Premium Partner Portal - Global Authentication & Network Engine
 * Version: V64.00 GRAND FINALE (Zero-Duplication & SSOT Architecture)
 * ============================================================================
 * [CRITICAL FIX] SSOT (Single Source of Truth): Eradicated inline fallback configs. Now strictly depends on `config.js`.
 * [PHASE 2 ACCELERATOR] Embedded native `LZ-String` decompression logic to instantaneously decode Base64 payloads from the GAS Backend (V85.00+).
 * [CRITICAL FIX] AbortError Eradicated: 45s timeout allows massive Catalog/Recipe GAS Cold Starts.
 * [CRITICAL FIX] Payload Bottleneck Removed: `keepalive` purged. `Content-Type: text/plain` bypasses CORS OPTIONS.
 * [RESTORED] Offline IndexedDB Mutation Queue & Background Auto-Sync Daemon 100% Intact.
 * [ENTERPRISE UPGRADE] Premium B2B SaaS Toast UI and Deep Purge Logout included.
 * ============================================================================
 */

(function(global) {
    "use strict";

    // 🚨 [방어 1] 시스템 설정(config.js) 선행 로드 여부 강력 검증
    // auth.js 내부에 존재하던 중복 설정을 파괴하고, 오직 config.js의 메인 설정만 신뢰합니다.
    if (typeof global.SYSTEM_CONFIG === 'undefined' || !global.SYSTEM_CONFIG.API) {
        const errMsg = "CRITICAL FATAL ERROR: config.js가 누락되었습니다. auth.js는 단독으로 실행될 수 없습니다.";
        console.error(errMsg);
        alert(errMsg);
        return; // 엔진 가동 즉시 중단
    }

    const CFG = global.SYSTEM_CONFIG;
    const OFFLINE_DB_NAME = 'Y2C_Enterprise_Offline_DB_V64';
    const QUEUE_STORE = 'mutation_request_queue';

    // ============================================================================
    // 🗜️ [MODULE 0] LZ-String Decompression Engine (Phase 2 Accel)
    // ============================================================================
    const LZString = (function() {
        const _f = String.fromCharCode;
        const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        const baseReverseDic = {};
        for (let i = 0; i < keyStrBase64.length; i++) {
            baseReverseDic[keyStrBase64.charAt(i)] = i;
        }

        return {
            decompressFromBase64: function(input) {
                if (input == null) return "";
                if (input === "") return null;
                return this._decompress(input.length, 32, function(index) {
                    return baseReverseDic[input.charAt(index)];
                });
            },
            _decompress: function(length, resetValue, getNextValue) {
                let dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, bits, resb, maxpower, power, c;
                let data = { val: getNextValue(0), position: resetValue, index: 1 };
                for (i = 0; i < 3; i += 1) { dictionary[i] = i; }
                bits = 0; maxpower = Math.pow(2, 2); power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
                    bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
                }
                switch (next = bits) {
                    case 0:
                        bits = 0; maxpower = Math.pow(2, 8); power = 1;
                        while (power !== maxpower) {
                            resb = data.val & data.position; data.position >>= 1;
                            if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
                            bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
                        }
                        c = _f(bits); break;
                    case 1:
                        bits = 0; maxpower = Math.pow(2, 16); power = 1;
                        while (power !== maxpower) {
                            resb = data.val & data.position; data.position >>= 1;
                            if (data.position === 0) { data.position = resetValue; data.val = get
