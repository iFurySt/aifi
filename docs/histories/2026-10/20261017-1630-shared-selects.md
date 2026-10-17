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
- Updated shared UI/design documentation. Page migrations follow in the next
  implementation slice.

### Design Intent

Use one value-selection primitive while retaining distinct action/source menus.
Keep existing controlled state, persistence and data/auth callbacks in callers.

### Validation

- TypeScript, 130 existing tests, renderer/desktop builds and new Select smoke pass.
- Native App and Chrome display the new theme selector with compact neutral rows.

### Files Modified

- `packages/ui/src/components/Select.tsx` and `select.css`
- `packages/ui/package.json`, root manifest and lockfile
- `scripts/check-selects.mjs` and `scripts/fixtures/selects.tsx`
- `DESIGN.md`, `docs/FRONTEND.md`, `docs/design-docs/selection-controls.md`
