# Stock collections runtime

## Goal

Replace the provider-only Stocks menu with All US listings, S&P 500,
Nasdaq-100 and My watchlist. Preserve incremental paging/logo preparation;
hide sidebar and main vertical scrollbar chrome without disabling scrolling.

## Scope and decisions

Use the existing Go/SQLite owner and replaceable directory port. Bundle reviewed,
dated membership snapshots (503 S&P securities from datasets' PDDL dataset,
101 NDX securities from Nasdaq's full response). Import immutable source hashes,
metadata and symbols into SQLite v3 on startup; reads work offline. Display
snapshot date/coverage concisely. Source refresh remains a reviewed repository
update for this slice; automatic index scheduling stays explicitly deferred.
No generic group engine, per-user mutations of built-ins, exchange filters or
additional markets. Watchlist stays in existing renderer workspace storage.

## Risks

- Index names are not security counts; validate complete payloads and preserve
  provenance. Do not use top-N directory rows or silently substitute ETF holdings.
- Keep unresolved index symbols and report incomplete local directory coverage.
- Migration must preserve directory/settings/credential rows. Reject unknown
  future schemas; seed rollback must not replace newer snapshots.
- Search/pagination must remain scoped through Go; global detail lookup stays global.
- Collection changes/watchlist edits must discard stale rows and reset scroll.

## Progress

- [x] Confirm old menu was planning-only; verify full sources/local reconciliation.
- [x] SQLite snapshots/scoped reads and bounded transport contract.
- [ ] Four-choice selector, persisted view state, watchlist integration, hidden bars.
- [ ] Tests, real Chrome/Electron validation and docs/history.
- [ ] Commit/push, rebuild/restart normal app, preserve evidence and clean up.
