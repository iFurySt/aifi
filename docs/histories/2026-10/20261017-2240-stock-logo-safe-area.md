## 2026-10-17 22:40 | Task: Consistent stock-logo safe area

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Keep company logos from touching or clipping their avatar borders, normalize
> oversized original whitespace, preserve colored tiles, and reopen the App.

### Changes Overview

- Replaced edge-to-edge cover sizing with centered contain sizing and 8% insets.
- Added conservative bounds analysis for transparent and flat-white outer space,
  protecting anti-alias edges and retaining full colored backgrounds.
- Crops run once during existing shared preparation, preserve aspect ratio and
  cap previews at 128px. Derived PNGs decode before display. Original source and
  host cache bytes remain intact; optional crop failures preserve usable images.
- Added bounds/crop tests and updated logo/frontend documentation.

### Design Intent

Normalize visible artwork rather than adding more margins to already-padded files.
Keep list/avatar first-paint caching and acquisition boundaries unchanged.

### Validation

- Logo bounds, decode/cache, contrast and directory-page preparation checks pass.
- TypeScript and Web/desktop builds pass; actual App is reopened for visual review.

### Files Modified

- `packages/ui/src/stock-logo-bounds.ts` and tests
- `packages/ui/src/stock-logo-image.ts` and tests
- `packages/ui/src/styles.css`
- `docs/design-docs/stock-logos.md`, `docs/FRONTEND.md`
