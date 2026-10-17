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
- Replaced stride sampling (roughly 64 volume/candle bars) with full session
  rendering; calendar windows replace guessed 22/65/252/504-row ranges.
- Added a dark pointer/keyboard crosshair tooltip with session date, OHLC and
  volume, edge clamping and a static footer. Line scale uses closes; candles
  use intraday extrema. Return arrows align by flex center rather than an offset.

### Design Intent

A company-wide vendor valuation is different from multiplying one share class's
outstanding shares. Keep valuation date and price observation explicit. Normal
reads remain SQLite-only and do not fetch a provider.

### Validation

- Yahoo quote fixtures include reported cap; store regressions verify versioned
  snapshot retention and upgrade/backoff handling. Go race tests/vet passed.
- Actual AAPL local read persisted 5,012,516,765,696 USD from an Oct 16 quote.
- Typecheck, working-tree TypeScript suite (107 tests), production builds,
  Electron smoke and interaction regressions passed. Calendar month-end/sparse
  windows and a formerly skipped volume peak have dedicated regressions.
- Chrome verified 252 volume bars in AAPL 1Y, OHLC/volume overlay content and
  centered arrow layout. The reference chart does not expose a comparable data
  count through its visible DOM; no exact feed-equivalence claim is made.

### Files Modified

- `apps/cli/internal/market/types.go` and `yahoo_outlook.go`
- `apps/cli/internal/market/yahoo_company.go`
- `apps/cli/internal/research/engine.go`
- `apps/cli/internal/store/research.go`
- `packages/core/src/stock-research.ts`
- `packages/ui/src/components/StockChart.tsx` and its regression test
- `packages/core/src/stocks.ts`
- `packages/ui/src/pages/Stocks.tsx` and `styles.css`
- `docs/design-docs/research-ingestion.md`
