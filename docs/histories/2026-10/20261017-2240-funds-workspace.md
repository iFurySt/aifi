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
- Build the linked holder chart/table, institutional aggregates, separate manager/
  fund scopes, local search and position filters with exact report-date columns.
- Add bounded dark chart inspection, zero/gap handling and container-based layouts.

### Verification

- Parser regressions cover units/dates/history/identity/empty/invalid responses.
- Reopened SQLite reads retain histories without a collector and isolate sources.
- TypeScript check and 148 unit tests passed in the shared workspace.
- Full Go vet/race/build, 148 unit tests, TypeScript, desktop/continuity and the
  isolated Funds interaction suite passed; narrow table overflow is contained.
- Actual native AAPL displays stored 66.35% institutional ownership, 7,695
  institutions and ten institutional holders; AAPL/MSFT/NVDA each have 20 stored
  normalized records. Chrome 390px keeps the table scroll inside a 390px page.
- Real public AAPL page inspected: 10 institutions, 10 funds and aggregate ownership.

### Files Modified

- `apps/cli/internal/market/yahoo_funds.go`, client/page guards and tests
- `apps/cli/internal/store/funds.go`, research settings/reads and tests
- Research scheduler, shared domain definitions and Sync settings
- Funds source references, execution plan and this history
- `packages/core/src/funds.ts`, domain normalization and tests
- `packages/ui/src/pages/Funds.tsx`, `funds.css`, `FundHistoryChart.tsx`
- `scripts/check-funds.mjs` and isolated synthetic ownership fixture
- Design/frontend/quality/release documentation


## Follow-up: historical reports, ring and manager logos

The user requested the reference-style ring, true quarterly backfill and shared
public Fund Logo catalog. Added keyless 13f.info collection for 16 verified CIKs,
exact symbol/CUSIP resolution, bounded 4–20-quarter jobs (default 14), shared
staging, source budgets, filing-based absence proof and options exclusion. Data
continues through collect → SQLite → local reads. Scoped Funds sync preserves
other collection jobs. Existing Yahoo/FMP choices remain available.

The Funds view now uses an interactive ownership ring, reporting-period control,
colored positions and a multi-quarter share table. Positions compare adjacent
reports; unknown reports stay unknown and deltas are not trading flows. Fund
logos are maintained in the public company-logo-catalog repository and loaded
through a narrow CIK host port with reviewed PNG hash/dimension checks and local
cache reuse. Reference artwork/data was not copied.

Validation includes parser/source identity and absence tests, scoped-sync/store
checks, adjacent-quarter domain tests, logo identity/cache/offline tests and an
isolated desktop/mobile ring/table interaction gate. See the completed execution
plan and source coverage notes for observed backfill and remaining limits.
