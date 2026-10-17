## 2026-10-18 00:20 | Task: Stock data audit and bounded backfill

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Investigate ADBE discrepancies, compare representative stocks with Rallies,
> and identify and repair missing collection across the local stock directory.

### Changes Overview

- Audited eight public Rallies pages, ten Yahoo chart samples, local heads/jobs
  and current-directory source coverage. Recorded dated findings/source conflicts.
- Added `research sync --symbols` for up to 50 directory symbols and mapped SEC
  issuers, respecting selected/enabled providers, blocked jobs and active leases.
- Manual jobs lead automatic collection; protected index members and shared SEC
  issuer jobs lead alphabetical backlog without a duplicate constituent list.
- Added a standard-library, read-only SQLite coverage/error audit script.
- Fixed line and cursor colors to follow the selected chart range direction.
- Queued ten-symbol repair, restarted App and confirmed all ten symbols have
  October 16 prices and profiles; ADBE's latest price, description and cap render.

### Design Intent

Preserve collect → persist → local read, rate limits and provenance. Do not
reinterpret queue entries as collected data, force vendor agreement, invent
missing values or label a sampled repair as complete universe coverage.

### Validation And Limits

Scoped Go race tests (store/market/research/command), TypeScript and responsive
Stocks smoke pass. Production builds and native ADBE review completed. Shared
working-tree checks encountered unrelated in-progress Congress changes; scoped
verification excludes them. Full-directory initial collection remains incomplete;
BABA SEC facts and several institutional samples still have gaps. The dated audit
records exact snapshot counts and continuing background work.

### Files Modified

- `apps/cli/internal/store/research.go`, bounded repair helper/tests and CLI command
- `packages/ui/src/components/StockChart.tsx`
- `scripts/audit-stock-coverage.py`
- CLI/research page docs, dated coverage audit and completed execution plan
