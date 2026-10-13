# Stock Directory Foundation

Created and completed 2026-10-13.

## Goal And Scope

Implement the first live collection path: official US-listed security directory
requests, strict validation, immutable SQLite snapshots, and Go/Cobra manual
sync/list/status. No live prices, SEC facts, automatic scheduler, local HTTP
transport, or renderer connection in this milestone.

## Decisions

- Nasdaq Trader's two documented symbol-directory files are the initial keyless
  bulk source. Massive ticker reference is future enrichment for types/CIK/FIGI;
  SEC mapping is a later company/filing join, not the listing authority.
- Preserve all source rows/fields and symbol conventions. ETF=N does not prove
  common stock. Non-test/non-ETF listings are a candidate universe, with security
  type unresolved until a trusted reference source enriches it.
- SQLite stores source content/hashes, snapshots, listing IDs/aliases, snapshot
  memberships, and sync outcomes. The normalized directory switches atomically
  only after both files validate. Source timestamps retain the provider's raw
  representation; absent rows are not asserted to be delisted.
- Start with a manual bounded sync. Durable scheduling/leases for broader datasets
  remain a separate milestone; no long-running daemon is added implicitly.

## Milestones

- [x] Review primary docs, three pinned projects, and actual directory requests.
- [x] Implement Go module, directory client/parser, SQLite migrations/snapshots,
  and manual sync/list/status commands.
- [x] Verify failures/repeated snapshots/history/concurrent sync, live downloads,
  pure-Go builds, and repository CI; update docs and history.

## Validation

Tests use authored small fixtures and local HTTP servers, not public live APIs.
Cover truncation/HTML/invalid rows/timestamps/duplicates, HTTP errors and bounds,
atomic rollback, snapshot deduplication, absence/reappearance, cached-only reads,
and concurrent sync. Actual public fetch evidence and DB stay outside Git.

## Outcome

- Actual pure-Go collector imported 13,296 security rows, 7,488 non-test/non-ETF
  candidates, 28,630 convention-specific aliases, and two raw source blobs.
  AAPL/MSFT/NVDA were found in cached queries.
- Repeated actual download returned changed=false and kept one snapshot. SQLite
  integrity_check returned ok and foreign_key_check returned no violations. The
  initial database measured 17,649,664 bytes; retention/compaction needs sizing
  before automatic daily history is enabled.
- Go vet/race tests, authored fixture failures, leases/rollback/reappearance, and
  cached CLI checks passed. make ci includes Go checks and the unchanged frontend
  tests/builds. CGO-free macOS/Linux/Windows builds passed; only macOS execution
  was tested. No claims of native Windows/Linux runtime validation.
- Broader source enrichment, directory UI transport, automatic scheduling, prices,
  and SEC remain in the active stock data plan.
