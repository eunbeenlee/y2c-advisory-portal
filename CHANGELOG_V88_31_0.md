# V88_31_0 — 2026-11-17

Base: Sinjeon_V88_30_0_BuildFix_FULL.zip

- FIX: native print animation opacity caused blank PDF pages.
- FIX: stale source/account/selection cannot be printed or downloaded as current.
- FIX: cancelled read results cannot overwrite or unlock a replacement request.
- FIX: bounded immutable PDF preparation, guarded final save, overlay cleanup.
- FIX: fail-closed malformed API envelopes and inconsistent monthly records.
- UI: reconciled invoice summary, missing-month/date advisories, period shortcuts.
- UI: responsive workbench and contained A4 preview; explicit page metadata.
- QA: 49 functional regressions, 42 deployment regressions, 80 Chromium assertions.
- CI: validation-only push/PR workflow; existing manual Pages deployment preserved.
- PRESERVED: existing dates/numbering, endpoints, tax rules, bank details, native APKs, dynamic file-count BuildFix.
- SCOPE: frontend only; see QA_REPORT_KO.md for untested live/backend/external-renderer behavior.
