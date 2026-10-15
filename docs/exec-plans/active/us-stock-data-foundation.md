# US Stock Data Foundation

Status: directory collection, app-owned scheduling, settings/status transport and
credential configuration, research collectors and cached stock UI reads implemented; live provider validation remains pending. Created 2026-10-13.

## Goal

Collect traceable daily US stock data locally, starting with AAPL/MSFT/NVDA and
expanding to exchange-listed common stocks/ADRs. Persist jobs and evidence so
sleep, failures, provider limits, and historical corrections are recoverable.
Present cached data in a shared Web/Electron company page.

## Scope

In scope: directory/identity, EOD bars, basic filing/fact metadata, durable local
Go jobs, SQLite/raw provenance, bounded read API, and cached stock-detail data. The six-tab shared UI already
exists with fixtures/empty panels; live collection coverage remains narrower.

Out of scope: cloud hosting, trading, broker OAuth, live ticks, paid analyst or
politician data, complete normalized global statements, and AI report generation.
The approved first latency is daily/closing, not real-time.

## Context

- [Pipeline and contracts](../../design-docs/us-stock-data-pipeline.md).
- [Provider review and actual probes](../../references/us-stock-data-providers.md).
- [Page design](../../design-docs/stock-research-page.md).
- [Visual prototype](../../prototypes/stock-research/preview.html).
- Directory/research reads are local and sourced; preserve saved user data.
- Whole-directory implementation is recorded in [the runtime specification](../../design-docs/research-ingestion.md); actual key/contact/source validation remains a separate gate.

## Risks And Gates

| Risk | Gate / mitigation |
| --- | --- |
| Free endpoint/account limits differ from docs | Probe actual Massive key on three histories and one market date before implementing broad sync. |
| SEC access blocked | HTTP 403 observed; configure honest contact User-Agent and allowed network access. No bypass/retry storm. |
| Free API assumes per-ticker scaling | Prefer market-date grouped batch; independent reference/fundamentals budget. |
| Financial periods/adjustments disagree | Versioned mappings, units, filing times, raw/split series, and restatement fixtures. |
| Local browser can mutate a service | Origin/Host validation, authenticated local session, bounded routes, and narrow Electron bridge. |
| Sleep/crash loses work | Persisted jobs, leases, idempotent commits, watermarks, fake-clock/restart tests. |
| Data footprint becomes large | Measure representative payload/storage sizes; bounded retention and staged backfill. |

## Milestones And Suggested Commits

### M0 — Discovery And Design

- [x] Confirm EOD scope and development targets.
- [x] Inspect Rallies and the three local reference checkouts.
- [x] Verify primary provider docs and probe keyless directory/SEC endpoints.
- [x] Define dataset contracts, jobs, quotas, storage, and page structure.
- [x] Render/review the visual prototype and record corrections.

### M1 — Provider And Identity Spike

- [ ] User configures a personal Massive Basic key and identifying SEC contact.
- [ ] Verify AAPL/MSFT/NVDA histories, a completed market date, source adjustment,
  publication lag, reference types/aliases, and actual account limits.
- [ ] Resolve SEC access or explicitly scope a documented temporary alternative.
- [ ] Freeze first Go dependencies, configuration format, and sample contracts.

Commit: provider adapters and directory identity validation, with redacted fixtures.

### M2 — Local Store And Manual Sync

- [x] Add Go/Cobra, directory schema v1, user-data directory, source blobs, and
  manual sync/list/status.
- [x] Extend storage/status to price and financial datasets.
- [ ] Run bounded manual sync for the three targets; preserve raw responses,
  feed/basis/periods and filing links; do not commit provider datasets.
- [x] Verify duplicates, write rollback, validation failures, and correction history with source fixtures.

Commit: first reproducible live local collection through CLI.

### M3 — Persistent Scheduling

- [ ] Add due jobs, leases, fake clock, market calendar, provider quotas, backoff,
  cancellation, publication lag, sleep/wake catch-up, and revision repair.
- [x] Verify that worker concurrency cannot exceed a provider rate, quota waiting
  cannot spin, and crash/restart cannot falsely advance completeness.

Commit: durable asynchronous EOD collection with status/diagnostics.

### M4 — Local Transport And Stock UI

- [x] Add authenticated loopback reads/sync and restricted desktop lifecycle.
  Live directory readers refresh periodically; push events remain deferred.
- [x] Implement shared stock routes, six-tab layouts, and sample/empty panels.
- [x] Connect cached candidate directory membership, names, exchange labels and search.
- [x] Connect cached bars/facts/filings.
- [x] Keep conversation Research separate; use sources/date/basis labels and
  correct empty/partial/error states. Preserve existing user state.
- [x] Validate Web/Electron, mobile, source links, and offline cached viewing.

Commits: sample UI landed independently; transport/bridge and cached reads follow.

### M5 — Coverage Expansion

- [ ] Three targets → 50 → whole-market EOD batch; validate identity/coverage.
- [ ] Add filing daily-index/bulk strategy and prioritized company enrichment.
- [ ] Measure disk/memory/backfill duration, retention, revised bars, and new/delisted
  instruments. Coverage counts separate listings, prices, and financial facts.

Commit: measured whole-market daily coverage and diagnostics.

## Validation

Repository: make ci; Go checks/race tests are added with the Go module. Runtime
fixtures exercise auth denial, 403, 429/reset, 5xx, partial/empty success, malformed
pagination, DST/holiday/early close, missed sessions, atomic writes, lease expiry,
splits, and restated financial periods. No tests depend on permanent public API
access or leak tokens in recordings.

Design: review prototype at desktop/mobile sizes, all tabs and local controls;
verify source/sample labels, table/tab overflow, theme, and keyboard behavior.

## Decision Log

- 2026-10-13: user chose daily/closing data first.
- 2026-10-13: prefer documented Massive market-date batches over per-stock polling;
  retain provider alternatives without implementing every adapter at once.
- 2026-10-13: use SQLite for jobs and normalized reads, raw evidence separately;
  Go goroutines are bounded execution, not the persistence layer.
- 2026-10-13: define a standalone visual concept before changing the live renderer.
  The design task delivered source review and a prototype; live M1–M5 remain work.
- 2026-10-13: shared Web/Electron stock UI now replaces the standalone prototype.
  Six primary tabs include empty datasets as requested; collection is still pending.

- 2026-10-13: directory collection implemented independently of key-based M1:
  Nasdaq Trader requests, preserved source conventions, SQLite snapshots, bounded
  manual-sync lease, atomic cache switch, and cached CLI reads. No automatic
  scheduler/market data/SEC ingestion/UI transport yet. See
  [directory milestone](../completed/stock-directory-foundation.md).

- 2026-10-13: app-owned directory service ships startup/freshness checks, persisted
  settings/manual requests, existing leases, retry timing and wake catch-up.
  Electron/Web settings reach it through narrow host transport; future provider
  secrets are locally encrypted. This does not complete the broader market-calendar,
  multi-dataset scheduling or cached stock-page milestones.

- 2026-10-13: Stocks/sidebar/workspace search now read cached directory data using
  a replaceable StockDirectoryRepository. Market/facts/filings still require their
  provider collection paths. See [read contract](../../design-docs/stock-directory-reads.md).

- 2026-10-15: whole-directory jobs and market-date batches, fenced leases, raw
  evidence/normalized SQLite snapshots, shared provider budgets, partial-source
  windows, SEC facts/submissions/Form4 and optional FMP adapters implemented.
  Shared stock tabs/Watchlist read stored data; dedicated key/sync settings exist.
  Current actual setup has 7,481 candidates, 522 market-date jobs and zero sourced
  price coverage because no market key/SEC contact is configured. Production
  credentials, real endpoint entitlements and measured live backfill remain gates;
  fixture tests and UI verification are not substitutes for those observations.
