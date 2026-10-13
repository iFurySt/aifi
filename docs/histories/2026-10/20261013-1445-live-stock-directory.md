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
- `docs/design-docs/app-data-service.md`

### Validation

Initial transport/store slice: 18 TypeScript tests and Go store/service tests pass.
UI integration and final checks are tracked in the execution plan.
