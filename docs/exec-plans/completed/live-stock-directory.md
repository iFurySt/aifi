# Live Stock Directory

## Goal

Read the collected directory in Stocks through a replaceable repository contract.
Electron main forwards to Go/SQLite; local Web uses the existing loopback bridge.
A future cloud repository must fit the same interface without editing page reads.

## Scope

Directory list/search, exact symbol lookup, bounded pagination, live identity,
loading/empty/error states, transport tests and Web/Electron validation.
Market quotes, financials and other research datasets remain samples/placeholders.
No cloud service or new credentials are added.

## Risks

- Source symbols are opaque, including punctuation: preserve them in encoded stock
  routes; keep the existing stricter watchlist validation separate.
- Candidate rows exclude ETFs/tests but are not verified common shares.
- Async responses can arrive out of order: discard superseded reads, debounce
  searches and refresh the local snapshot periodically while mounted.
- Never silently replace a failed/empty directory read with demo companies.

## Milestones

- [x] Typed repository and bounded local transports, exact read, result counts.
- [x] Shared UI integration, real company identity and paged search.
- [x] Tests, Chrome/Electron checks, documentation and staged commits.

## Validation

Run make ci, Go service/store regression tests, injected repository tests,
Chrome desktop/mobile checks via OBU and native Electron smoke.

## Decisions

- 2026-10-13: Go remains the SQLite owner; main does not create a second DB client.
- 2026-10-13: Inject StockDirectoryRepository at the application composition root;
  default to the platform local adapter, no ambient provider override or cloud URL.

- 2026-10-13: TypeScript tests (18) and Go store/service tests pass for read contracts, bounds, exact lookup and pagination.

- 2026-10-13: Real cached 7,488 candidate rows verified in Chrome; company/ticker/global search, pagination, NYSE names, opaque routes and cached error recovery pass. Full snapshot contains no unsupported route symbols. Mobile drawer pagination was made reachable.

- 2026-10-13: Final make ci and actual macOS Electron smoke pass; 19 TypeScript tests, Go vet/race/build and Chrome 1440×1100/390×844 review complete. Documentation and history updated.
