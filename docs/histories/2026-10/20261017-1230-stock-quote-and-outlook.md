## [2026-10-17 12:30] | Task: Correct stock quotes and add analyst/earnings data

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Remove the snapshot date and security-type title suffix, align the quote block
> with the research reference, correct stale prices, and source Analyst/Earnings.

### Changes Overview

- Fixed exclusion of a completed same-day Yahoo session; require observed close
  plus ten minutes, preserve failed backoffs and poll after weekday close.
- Kept regular quote, prior session close, source timestamp and post-market quote
  distinct. Existing last-good snapshots remain readable.
- Added keyless Yahoo analysis collection for consensus, recommendations, grades,
  GAAP actual/estimated EPS and report calendar, with independent configurable
  jobs, shared evidence staging and SQLite-only reads.
- Removed the sidebar snapshot date; company headings/list labels shorten explicit
  security suffixes while preserving raw directory names.
- Added the reference-style quote/ticker/status block, analyst score/target range
  and recommendation counts, plus actual/estimate EPS bars and report calendar.
- Preserved existing FMP selections and paused flags; fresh configurations use
  Yahoo for analyst data. All current directory candidates receive jobs.

### Design Intent

Use explicit source observations rather than copying a reference site's price or
clock. Do not conflate consensus and rating coverage or GAAP/non-GAAP earnings.
A weekday polling schedule does not claim exchange holiday-calendar accuracy.

### Validation

- Full `make ci`: typecheck, TypeScript tests, production builds, Go race tests
  and vet passed. Post-close wake/backoff and offline outlook restart regressions
  cover the new collection paths. Final TypeScript suite: 87 tests.
- Real AAPL local reads: Oct 16 close 343.46, previous 342.00, post-market 342.62;
  analyst consensus and four recent GAAP actual/estimate quarters persisted.
- Desktop smoke and isolated interaction checks passed; Chrome visually verified
  actual AAPL quotes, company title, analyst card and earnings chart.

### Files Modified

- `apps/cli/internal/market/`: session boundaries, quote payload, analysis parser.
- `apps/cli/internal/research/engine.go`: fair scheduling and refresh policy.
- `apps/cli/internal/store/research.go`: settings defaults and settled-job wake.
- `packages/core/src/stock-research.ts`: quote presentation and dataset contract.
- `packages/ui/src/pages/Stocks.tsx` and `stock-research-panels.tsx`: sourced UI.
- `docs/design-docs/research-ingestion.md`: semantics, scheduling and limitations.
