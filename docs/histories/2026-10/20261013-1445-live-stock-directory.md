## 2026-10-13 14:45 | Task: Live stock directory

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Connect Stocks to collected directory data. Abstract the reads so a future cloud
> API implementation can replace local access smoothly.

### Changes Overview

- Core directory repository contract and platform local adapter.
- Allowlisted bounded read methods through Electron main/Web host to Go/SQLite.
- Exact lookup, search result counts and deterministic pagination.
- Shared sidebar, company header and workspace search now read the real cache.
- Debounced reads ignore stale responses; minute/focus refreshes discover imports.
- Empty/error/retry states never substitute sample companies.
- Preserve directory notation in routes without changing saved watchlist schema.

### Design Intent

Keep Go as the sole database owner. Pages consume a domain repository injected
at composition rather than importing IPC, SQL or URL/provider choices.
Market data is a separate capability and stays explicitly sample-based.

### Files Modified

- `packages/core/src/stock-directory.ts`
- `packages/platform/src/stock-directory.ts`
- `packages/host/src/runtime.ts`
- `apps/cli/internal/store/store.go`
- `apps/cli/internal/service/service.go`
- `packages/ui/src/stock-directory-context.tsx`
- `packages/ui/src/components/StockSidebar.tsx`
- `packages/ui/src/pages/Stocks.tsx`
- `docs/design-docs/stock-directory-reads.md`
- `docs/design-docs/app-data-service.md`

### Validation

Initial transport/store slice: 18 TypeScript tests and Go store/service tests pass.
Final make ci passes: 19 TypeScript tests, Go vet/race tests and all builds.
Actual macOS Electron smoke verifies allowlisted directory reads, empty-cache UI,
service/settings/credential boundaries and existing navigation.
Chrome Default / OBU verifies real cached 7,488 candidate rows, list pagination,
company/ticker/workspace search, NYSE identity, opaque routes, empty results,
retained cache during blocked requests and recovery after unblocking.
Desktop/mobile have no viewport overflow; mobile drawer pagination stays visible.
Ignored screenshots and machine-specific evidence are retained locally.
