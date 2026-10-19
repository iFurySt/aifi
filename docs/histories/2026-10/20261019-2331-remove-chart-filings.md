## [2026-10-19 23:31] | Task: Remove Recent filings below Digest

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Remove the Recent filings section below Digest on the stock overview.

### Changes Overview

- Removed Chart’s filings block and its unused imports; Financials retains filings.
- Matched the loading placeholder to Digest and removed obsolete responsive grid areas.
- Updated the existing responsive order check and stock page documentation.

### Design Intent

Keep Chart focused on the company overview, price chart and Digest. Dedicated
filing research remains available in Financials without a duplicate overview block.

### Verification

- TypeScript, existing stock responsive checks (390–1440px and all tabs), and production renderer build passed.
- Refreshed the native App and confirmed Digest remains without Recent filings.

### Files Modified

- `packages/ui/src/pages/Stocks.tsx`
- `packages/ui/src/components/StockLoading.tsx`
- `packages/ui/src/styles.css`
- `scripts/check-stocks-responsive.mjs`
- `docs/design-docs/stock-research-page.md`
