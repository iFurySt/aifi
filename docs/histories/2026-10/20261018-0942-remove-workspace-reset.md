## [2026-10-18 09:42] | Task: Remove legacy workspace reset

### Execution Context

- Agent ID: `root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Remove Reset workspace.

### Changes Overview

- Removed the Storage settings demo reset section and confirmation dialog.
- Removed the unused context action and its implementation that replaced personal
  workspace state with demo defaults.
- Updated Storage documentation and release notes to match the remaining UI.

### Design Intent

Storage should show local usage and folder actions. A demo reset that overwrites
personal workspace state does not belong in this surface. Initial workspace
creation and existing saved data are unchanged.

### Validation

- `pnpm check` passed.
- `pnpm --filter @aifi/web build` passed.
- Scoped diff and whitespace checks passed; unrelated work was preserved.

### Files Modified

- `packages/ui/src/pages/Settings.tsx`
- `packages/ui/src/App.tsx`
- `packages/ui/src/workspace-context.tsx`
- `docs/FRONTEND.md`
- `docs/design-docs/storage-usage.md`
- `docs/releases/feature-release-notes.md`
