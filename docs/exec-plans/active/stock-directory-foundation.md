# Stock Directory Foundation

Created 2026-10-13. In progress.

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
- [ ] Implement Go module, directory client/parser, SQLite migrations/snapshots,
  and manual sync/list/status commands.
- [ ] Verify failures/repeated snapshots/history/concurrent sync, live downloads,
  pure-Go builds, and repository CI; update docs and history.

## Validation

Tests use authored small fixtures and local HTTP servers, not public live APIs.
Cover truncation/HTML/invalid rows/timestamps/duplicates, HTTP errors and bounds,
atomic rollback, snapshot deduplication, absence/reappearance, cached-only reads,
and concurrent sync. Actual public fetch evidence and DB stay outside Git.
