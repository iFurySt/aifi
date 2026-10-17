## 2026-10-17 15:45 | Task: Bounded search and workspace shortcuts

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Limit search height; add Command+[ / Command+] navigation and useful shortcuts.

### Changes Overview

- Cap workspace search at 560px or viewport height minus 48px; keep its 40px
  input/header/footer visible and scroll results internally. Long names truncate
  on one line with full-name titles.
- Reuse session-bounded route history for Command/Control+[ and ]. Add sidebar
  toggle (B), desktop-only New chat (N), and shortcut help (/); retain K and comma.
- Centralize binding labels/matching, dismiss account menus before commands,
  preserve editing/IME and browser New Window, and suppress repeated held commands.
- Support arrow selection, Enter and Escape in search and expose shortcut help
  from its compact footer. Narrow layouts keep the navigation drawer.

### Verification

- TypeScript, 110 unit tests and production builds passed.
- Isolated navigation checks cover history bounds/branches, sidebar and editing,
  search geometry/scroll/long names, keyboard selection, help and new chat focus.
- Account, desktop and interaction smokes passed. Chrome desktop and 390×600
  review confirmed 560px/552px dialogs, 40px inputs and no horizontal overflow.

### Files Modified

- `packages/ui/src/components/Shell.tsx`, `ProfileMenu.tsx`, `primitives.tsx`
- `packages/ui/src/components/workspace-shortcuts.ts` and regression test
- `packages/ui/src/styles.css`
- `scripts/check-workspace-navigation.mjs`, synthetic renderer fixture
- `DESIGN.md`, `docs/FRONTEND.md`, release notes and package scripts
