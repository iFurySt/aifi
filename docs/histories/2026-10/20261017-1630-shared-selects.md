## 2026-10-17 16:30 | Task: Shared compact selection controls

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Unify dropdown styling across Usage/settings and other pages, with compact
> chevron spacing and reusable optional search.

### Changes Overview

- Added a controlled shared Select with optional local search, neutral selected
  rows/checkmarks, keyboard navigation, disabled choices and portal collisions.
- Added isolated interaction checks for selection, search, no matches, native
  Tab/Shift+Tab, outside dismissal and dialog focus/Escape. Verified 390px light
  and dark layouts. Pinned compatible Radix layer/focus versions.
- Migrated settings accounts/models/theme/provider/history, stock collections,
  Financials and agent cadence; Chat and Usage working pages use the same picker.
- Menus size to content within a 180–320px viewport-bounded range, with a 220px
  search minimum. Usage filters align to their leading edge.
- Updated native/Financials smoke selectors for listbox semantics and shared
  UI/design documentation. The unrelated in-progress Usage/Chat features retain
  their working-tree integrations without being included in these commits.

### Design Intent

Use one value-selection primitive while retaining distinct action/source menus.
Keep existing controlled state, persistence and data/auth callbacks in callers.

### Validation

- TypeScript, 130 existing tests, renderer/desktop builds and new Select smoke pass.
- New Select and Financials smokes also pass against isolated staged source;
  frozen lockfile and TypeScript checks pass there.
- Native desktop, continuity, ChatGPT, account, navigation and Stocks responsive
  checks pass. Native App verifies Usage period selection and focus return;
  Chrome Default verifies the shared theme/account popup presentation.

### Files Modified

- `packages/ui/src/components/Select.tsx` and `select.css`
- `packages/ui/package.json`, root manifest and lockfile
- `scripts/check-selects.mjs` and `scripts/fixtures/selects.tsx`
- `DESIGN.md`, `docs/FRONTEND.md`, `docs/design-docs/selection-controls.md`
