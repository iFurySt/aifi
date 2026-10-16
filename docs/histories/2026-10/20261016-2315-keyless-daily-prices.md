## [2026-10-16 23:15] | Task: Keyless daily stock prices

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Stocks still has no data; can it use an API without a key?

### Changes Overview

- Added a Go Yahoo chart adapter requiring no key or browser cookies; default
  daily prices now use it, while Massive remains selectable in Sync settings.
- All directory candidates receive durable jobs. Shared configurable minute/day
  budgets, retries, public-endpoint cooldowns, pause and manual sync still apply.
- Persist source evidence and split-adjusted OHLCV in SQLite before local reads.
  Replace historical windows atomically on new splits; never mix raw/adjusted
  provider series or adjust Yahoo prices twice. Skip unfinished sessions.
- Removed the global Demo badge from sourced Stocks/Watchlist pages.
- Documented unsupported symbols, unofficial endpoint/data-use limits and the
  remaining separate setup gates for non-price datasets.

### Design Intent

A local install should show useful real price data without an account setup
step. Public Yahoo access is a pragmatic personal-research default; it has no
service guarantee. SEC is also keyless but requires identifying contact.
No fixture prices or page-triggered provider requests were introduced.

### Validation

- Live Go service persisted 501 closed bars each for AAPL, MSFT and NVDA;
  latest session 2026-10-15. Chrome displayed AAPL using local reads.
- Keyless end-to-end regression uses a non-demo class-share symbol, exercises
  replacement on refresh, offline reopening and pause without provider calls.
- Parser regressions cover identity, array shape, null sessions and unfinished
  sessions; domain regression prevents double split adjustment.
- TypeScript checks, 82 tests, Go race suite, builds, full repository CI and
  Electron interaction smoke passed.
- Live ingestion revealed a coverage SQL scaling bug: per-session directory
  joins blocked status reads. Aggregate symbols first; 20,000-bar regression
  covers the fix. Actual local status returned in 190 ms with 83 priced
  candidates at that checkpoint; collection continues in the background.

### Files Modified

- `apps/cli/internal/market/yahoo.go` and tests
- `apps/cli/internal/research/engine.go` and tests
- `apps/cli/internal/store/research.go`
- `packages/core/src/stock-research.ts` and tests
- `packages/ui/src/pages/ResearchSyncSettings.tsx`
- `packages/ui/src/components/Shell.tsx`
- Architecture, security, reliability, research ingestion and release documents
