## 2026-10-15 18:20 | Task: Stock collections and hidden vertical scrollbars

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Hide vertical scrollbars and implement the previously discussed Stocks choices.

### Changes Overview

- Slice 1 (`34e8928`): SQLite v3 stores reviewed index snapshots/source hashes;
  scoped directory reads apply membership before search/count/paging in Go.
  Existing directory, settings and credential data survive migration. Built-ins
  accept no caller membership or write operation.
- Sources: 503 S&P securities from the datasets PDDL CSV observed 2026-10-15;
  101 Nasdaq-100 securities from Nasdaq's complete response dated 2026-10-14.
  All members reconciled with the real candidate directory in validation.
- Slice 2: four working choices, persisted view state, watchlist add/remove
  integration, generation-safe collection changes and hidden vertical scrollbars.
  Directory bottom-scroll loading and cached logo preparation remain in use.
- Index dates and partial directory coverage are visible. Public source updates
  remain reviewed script/commit changes; automatic index scheduling is deferred.

### Design Intent

The earlier grouping task saved a proposal without runtime choices. Deliver
actual scoped reads rather than inactive menu entries. Keep system list ownership
separate from personal watchlists and future custom groups. Preserve global stock
lookup, detail tabs, local logo batching and local/cloud repository replacement.
No generic group manager or additional market is introduced.

### Validation

- `make ci`: 61 TypeScript tests, Go vet/race checks and production builds pass.
- Go regressions cover scoped search/paging, unresolved members, empty watchlists,
  protected built-ins, migration, idempotence and newer-head preservation.
- Real Chrome Default at 1280×960: All=7,481, S&P=503, Nasdaq-100=101; all NDX
  rows loaded by scroll and matched the recorded source symbols. Hidden bars
  retain scrolling. Index search excludes outsiders; BRK.B punctuation is kept.
- Watchlist UI add/remove updates the selected sidebar immediately. Empty
  watchlist has zero directory rows and an Add stocks action. Reload retains
  selection; global IBM search opens outside NDX without changing its membership.
- Light/dark menus and 390px mobile drawer reviewed without page/menu overflow.
- Actual isolated Electron smoke checks the four choices, saved selection,
  offline index coverage, caller-override rejection and hidden scrollbar styles.

### Files Modified

- `apps/cli/internal/store/collections.go`, schema, seed and regression tests
- `apps/cli/internal/service/service.go`
- `packages/core/src/stock-directory.ts`, `directory-feed.ts`
- `packages/platform/src/stock-collection.ts`, scoped transport tests
- `packages/ui/src/components/StockSidebar.tsx`, `stock-directory-context.tsx`
- `packages/ui/src/App.tsx`, `workspace-context.tsx`, `styles.css`
- `apps/desktop/src/main.ts` smoke, source updater and related documentation

### Delivery

- Data foundation `34e8928` and shared UI `a54f22f` pushed separately.
- Primary checkout rebuilt; normal AIFi bundle restarted with its existing data.
  Actual SQLite migration/index heads verified at 503/101; primary Chrome preview
  confirmed all four options and was restored to its original stock route.
- macOS was locked during final root native inspection. Actual isolated Electron
  smoke had passed; do not claim a final root-window visual review.
- QA evidence retained in ignored artifacts; isolated services/worktree cleaned up.
