## 2026-10-17 16:00 | Task: Enrich Financials data and presentation

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Compare Rallies Financials with AIFi and enrich the data available on our page.

### Changes Overview

- Phase 1: Expand SEC/Yahoo financial allowlists to 64 concepts and 46 vendor
  fields, retaining units/signs/provenance and bounded normalized payloads.
- Wake old fact snapshots through ordinary background jobs, preserving last-good
  data, selection, budgets and failed backoff. Page reads remain SQLite-only.
- Add financial metric definitions, safe derived quarters, ratios, YoY and
  actual-period column selection. Never subtract weighted averages or EPS.
- Compare reference coverage and record measured public AAPL parser results and
  remaining custom KPI/valuation/non-USD gaps.
- Phase 2: Add the 13-row overview, six expandable statement/KPI/derived groups,
  20-quarter/annual table and selectable same-unit comparison trend. Preserve
  Corporate actions/Filings and existing exports while extracting shared helpers.
- Add bounded keyboard/hover graph details, persistent horizontal scroll, source
  inspection, and placeholders for unsupported custom KPIs/historical valuations.

### Verification

- TypeScript and 122 unit tests passed in the final workspace; financial math has dedicated regressions.
- Provider/store/research tests cover expanded concepts, unit/sign/provenance,
  version upgrades, retained good values and failure backoff.
- Actual AAPL source bytes normalize to 1,981 SEC facts across 63 metrics and
  405 Yahoo observations across 45 metrics; public data remains ignored locally.
- Actual SQLite snapshots now read AAPL 1,981/63, MSFT 1,718/51, NVDA 1,747/55
  records/metrics. Offline reopened-store tests preserve expanded facts and units.
- Financial interaction and desktop/continuity smokes passed. Chrome desktop,
  390px layout, issuer switching, annual dates and native AAPL were reviewed.

### Files Modified

- `apps/cli/internal/market/financial_concepts.go`, SEC/Yahoo adapters and tests
- `apps/cli/internal/store/research.go`, research engine and upgrade test
- `packages/core/src/financial-definitions.ts`, `financial-analysis.ts` and tests
- `packages/core/src/stock-research.ts`
- Financial source references, ingestion design and execution plan
- `packages/ui/src/pages/Financials.tsx`, shared panel helpers and trend/format components
- `scripts/check-financials.mjs` and isolated financial UI fixture
- `DESIGN.md`, frontend guidance, release notes and package scripts
