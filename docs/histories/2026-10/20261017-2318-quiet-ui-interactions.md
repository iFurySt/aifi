## 2026-10-17 23:18 | Task: Quiet UI interactions

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Remove redundant stock counts and search hints, display square logos without
> added inset, balance the toolbar Chat icon, and share the rail hover color
> across application controls.

### Changes Overview

- Stock collection heading drops the count and uses available width. Search uses
  a short title; keyboard instructions move behind the existing Shortcuts action.
- Avatar images use the original PNG at full content-box size with contain sizing.
  Remove automatic cropping, retaining shared decode/cache and transparent white
  mark contrast handling.
- Add one neutral interaction token for navigation, buttons, searches, menus,
  selects and related controls. Preserve resting surfaces and semantic CTA colors.
- Give the round toolbar Chat glyph a 1px optical inset in its existing 18px slot.

### Design Intent

Reduce chrome noise and keep controls predictable in both themes. Whitespace
inside source artwork is handled by catalog curation rather than image heuristics.

### Validation

TypeScript, six focused logo/page tests, navigation/select and responsive Stocks
smokes pass; scoped staged-source checks also pass. Production builds succeed.
Native light/dark review confirms logos, heading, search and Chat toolbar sizing.

### Files Modified

- `packages/ui/src/styles.css` and `components/select.css`
- `packages/ui/src/components/Shell.tsx` and `components/StockSidebar.tsx`
- `packages/ui/src/stock-logo-image.ts` and its tests; remove obsolete bounds helper
- `scripts/check-workspace-navigation.mjs` and `scripts/check-selects.mjs`
- `DESIGN.md`, frontend/logo docs and the completed execution plan
