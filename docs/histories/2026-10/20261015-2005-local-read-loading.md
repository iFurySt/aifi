## 2026-10-15 20:05 | Task: Local-first read policy and sidebar append status

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Inset Loading more, and require asynchronous collection into SQLite followed
> by local reads for this and future source datasets.

### Findings

Directory reads already use Go/SQLite; renderer IPC or loopback requests do not
recollect Nasdaq data. Periodic local head checks incorrectly displayed the same
append label as actual paging. Status text also lacked the row-content inset.

### Changes Overview

- Separate loadingMore state from general read activity; quiet head checks retain
  rows without the append hint. Keep the existing busy gate/snapshot safeguards.
- Give list loading, empty and error hints the row's 8px leading content inset.
- Record the required collect → persist → local-read policy in the repository
  map, core beliefs, architecture and a focused local-data contract. Future cloud
  sources must synchronize behind persistence instead of bypassing local reads.
- Add a real SQLite reopen regression with an unavailable provider. Paging,
  scopes/search and exact lookup succeed with zero fetcher calls after restart.

### Validation

- `make ci`: 62 TypeScript tests, Go vet/race checks and production builds pass.
- Actual isolated Electron smoke passes.
- Chrome Default on the production renderer with copied public SQLite/logo data:
  a held local head check keeps 50 rows and shows no append hint. A held offset-50
  read displays Loading more at x=105, matching row content x=105 with 8px padding.
  Releasing that read appends to 100 rows normally. Only local response delivery
  is delayed in the QA wrapper; no fake listing repository is substituted.

### Files Modified

- `packages/core/src/directory-feed.ts` and regression tests
- `packages/ui/src/components/StockSidebar.tsx`, `styles.css`
- `apps/cli/internal/service/service_test.go`
- `AGENTS.md`, core beliefs, local-data contract and related architecture/UI docs

### Delivery

Implementation `3694d38` pushed to main. Primary checkout rebuilt and normal
AIFi restarted; its saved S&P selection and cached directory rows were verified
in the native accessibility tree. The existing Chrome preview was restored to
the primary build with its QA wrapper removed. Ignored screenshots/results and
native smoke evidence were preserved before isolated-service/worktree cleanup.
