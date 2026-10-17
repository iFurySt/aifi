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
- UI implementation continues in the linked active execution plan.

### Verification

- TypeScript and 115 unit tests passed after financial math changes.
- Provider/store/research tests cover expanded concepts, unit/sign/provenance,
  version upgrades, retained good values and failure backoff.
- Actual AAPL source bytes normalize to 1,981 SEC facts across 63 metrics and
  405 Yahoo observations across 45 metrics; public data remains ignored locally.

### Files Modified

- `apps/cli/internal/market/financial_concepts.go`, SEC/Yahoo adapters and tests
- `apps/cli/internal/store/research.go`, research engine and upgrade test
- `packages/core/src/financial-definitions.ts`, `financial-analysis.ts` and tests
- `packages/core/src/stock-research.ts`
- Financial source references, ingestion design and execution plan
