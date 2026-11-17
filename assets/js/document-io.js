/* V88_33_0: immutable export snapshots, bounded work, cancellable pre-save stage.
 * Financial data and server state are never written here. A late renderer cannot
 * start a download after cancellation/timeout: saving is a separate guarded step.
 */
(function (global) {
    'use strict';
    let active = null;
    const text = (ko, en) => {
        try { return localStorage.getItem('y2c_lang') === 'ko' ? ko : en; } catch (_) { return en; }
    };
    function failure(code, ko, en) { const error = new Error(text(ko, en)); error.code = code; return error; }
    function cancellation() { return failure('EXPORT_CANCELLED', 'PDF 생성을 취소했습니다. 입력 내용은 유지됩니다.', 'PDF export cancelled. Your inputs are retained.'); }
    async function resources(element, wait) {
        if (document.fonts) await wait(document.fonts.ready);
        await Promise.all(Array.from(element.querySelectorAll('img')).map(async image => {
            // Existing logo fallback text is printable when its failed image is hidden.
            if (image.hidden || (global.getComputedStyle && global.getComputedStyle(image).display === 'none')) return;
            let cleanup = () => {};
            try {
                if (!image.complete) await wait(new Promise((resolve, reject) => {
                    const loaded = () => resolve();
                    const failed = () => reject(failure('EXPORT_IMAGE', '문서 이미지를 불러오지 못했습니다.', 'Unable to load a document image.'));
                    cleanup = () => { image.removeEventListener('load', loaded); image.removeEventListener('error', failed); };
                    image.addEventListener('load', loaded, { once: true });
                    image.addEventListener('error', failed, { once: true });
                    // Cached loads can complete between the first check and handler registration.
                    if (image.complete) loaded();
                }));
                if (!image.naturalWidth) throw failure('EXPORT_IMAGE', '문서 이미지가 준비되지 않았습니다.', 'A document image is not ready.');
                if (image.decode) await wait(image.decode());
            } finally { cleanup(); }
        }));
    }
    async function exportPDF(element, controls, filename, options = {}) {
        if (active) return false;
        if (!element || !element.isConnected) throw failure('EXPORT_DOCUMENT', '출력할 문서를 확인해 주세요.', 'The document is no longer available.');
        const renderer = options.renderer || global.Y2C_InvoicePDF?.render;
        if (typeof renderer !== 'function') throw failure('EXPORT_ENGINE', 'PDF 엔진을 불러오지 못했습니다. 새로고침하거나 인쇄를 사용해 주세요.', 'The PDF engine is unavailable. Reload the page or use Print.');
        const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? Math.min(options.timeoutMs, 120000) : 60000;
        const guard = typeof options.isCurrent === 'function' ? options.isCurrent : () => true;
        const token = { cancelled: false, saving: false, deadline: Date.now() + timeoutMs, reject: null };
        const cancelled = new Promise((_, reject) => { token.reject = reject; });
        cancelled.catch(() => {});
        active = token;
        const uniqueControls = Array.from(new Set(Array.from(controls || []).filter(Boolean)));
        const states = uniqueControls.map(button => ({ button, disabled: button.disabled }));
        let host;
        function progress(stage) {
            try { if (typeof options.onProgress === 'function') options.onProgress(stage); } catch (_) {}
        }
        function current() {
            if (token.cancelled || active !== token) throw cancellation();
            if (!guard()) throw failure('EXPORT_STALE', '출력 중 데이터 또는 로그인 상태가 변경되었습니다. 인보이스를 다시 생성해 주세요.', 'The source data or sign-in state changed during export. Generate the invoice again.');
        }
        async function wait(work) {
            current();
            let timer;
            const expiry = new Promise((_, reject) => {
                timer = setTimeout(() => reject(failure('EXPORT_TIMEOUT', 'PDF 준비 시간이 초과되었습니다. 다시 시도하거나 인쇄를 사용해 주세요.', 'PDF preparation timed out. Try again or use Print.')), Math.max(0, token.deadline - Date.now()));
            });
            try { const result = await Promise.race([work, expiry, cancelled]); current(); return result; }
            finally { clearTimeout(timer); }
        }
        states.forEach(({ button }) => { button.disabled = true; });
        try {
            current();
            // Snapshot before the first await. Later UI changes cannot leak into this PDF.
            const clone = element.cloneNode(true);
            clone.classList.add('pdf-export-mode');
            for (const [key, value] of Object.entries({ width: '794px', height: 'auto', 'max-height': 'none', 'min-height': '1122px', overflow: 'visible', transform: 'none', margin: '0', opacity: '1' })) clone.style.setProperty(key, value, 'important');
            host = document.createElement('div');
            host.className = 'document-export-host no-print';
            host.setAttribute('aria-hidden', 'true'); host.inert = true;
            host.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;pointer-events:none;background:white;';
            host.appendChild(clone); document.body.appendChild(host);
            progress('resources');
            await resources(clone, wait);
            current();
            progress('rendering');
            // The dedicated renderer produces a PDF object without starting a download.
            // Cancellation/deadline guards are also checked inside each render page/row.
            const pdf = await wait(Promise.resolve(renderer(clone, {check: () => {
                current();
                if (Date.now() >= token.deadline) throw failure('EXPORT_TIMEOUT', 'PDF 준비 시간이 초과되었습니다. 인쇄를 사용해 주세요.', 'PDF preparation timed out. Use Print.');
            }})));
            if (!pdf || typeof pdf.save !== 'function') throw failure('EXPORT_ENGINE', 'PDF 출력 객체를 확인할 수 없습니다.', 'The PDF engine returned an invalid document.');
            current();
            // No download is initiated by a cancelled or stale renderer.
            progress('saving');
            token.saving = true;
            await wait(Promise.resolve(pdf.save(filename)));
            return true;
        } finally {
            if (host) host.remove();
            states.forEach(({ button, disabled }) => { button.disabled = disabled; });
            if (active === token) active = null;
        }
    }
    global.Y2C_DocumentIO = Object.freeze({
        isBusy: () => !!active,
        exportPDF,
        cancelExport: () => { if (!active || active.saving) return false; active.cancelled = true; active.reject(cancellation()); return true; }
    });
})(window);
