## [2026-10-17 15:10] | Task: Chart detail, full volume bars and reported market cap

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Center return arrows, fill missing market cap, show OHLC/time in a dark
> crosshair tooltip and investigate flatter/sparser charts versus the reference.

### Changes Overview

- Normalize/persist source-reported company market cap and quote observation time.
- Reprocess older idle public-page snapshots once through background jobs; reuse
  staged source responses and keep failed-job backoff and source/pause controls.
- Prefer the newest reported valuation independently of a price-only snapshot.

### Design Intent

A company-wide vendor valuation is different from multiplying one share class's
outstanding shares. Keep valuation date and price observation explicit. Normal
reads remain SQLite-only and do not fetch a provider.

### Validation

- Yahoo quote fixtures include reported cap; store regressions verify versioned
  snapshot retention and upgrade/backoff handling. Go race tests/vet passed.
- Actual AAPL local read persisted 5,012,516,765,696 USD from an Oct 16 quote.

### Files Modified

- `apps/cli/internal/market/types.go` and `yahoo_outlook.go`
- `apps/cli/internal/market/yahoo_company.go`
- `apps/cli/internal/research/engine.go`
- `apps/cli/internal/store/research.go`
- `packages/core/src/stock-research.ts`
- `docs/design-docs/research-ingestion.md`
