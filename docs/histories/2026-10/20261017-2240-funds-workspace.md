## 2026-10-17 22:40 | Task: Enrich Funds collection and workspace

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Handle Rallies AAPL Funds using the same approach as Financials.

### Changes Overview

- Add a no-key public Yahoo holders adapter with issuer identity validation,
  institutional ownership aggregates and separate institutional/mutual-fund samples.
- Preserve true reporting dates and percentage units; retain bounded same-source
  observed history in SQLite payloads. Missing sample membership is never an exit.
- Add source selection/weekly scheduling for the full directory, preserving old
  user pauses and configured FMP access. Keep reads independent of collection.
- Record source probes, limits and the future full SEC 13F backfill boundaries.

### Verification

- Parser regressions cover units/dates/history/identity/empty/invalid responses.
- Reopened SQLite reads retain histories without a collector and isolate sources.
- TypeScript check and 148 unit tests passed in the shared workspace.
- Real public AAPL page inspected: 10 institutions, 10 funds and aggregate ownership.

### Files Modified

- `apps/cli/internal/market/yahoo_funds.go`, client/page guards and tests
- `apps/cli/internal/store/funds.go`, research settings/reads and tests
- Research scheduler, shared domain definitions and Sync settings
- Funds source references, execution plan and this history
