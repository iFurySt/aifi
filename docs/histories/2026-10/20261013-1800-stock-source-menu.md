## 2026-10-13 18:00 | Task: Stock source menu

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Move the Nasdaq directory footer label into a source selector on the Stocks
> heading, with an arrow. Currently only Nasdaq is available.

### Changes Overview

- Stocks title opens a Radix source menu with Nasdaq directory checked.
- Removed footer copy and unused styling; retained counts/search/pagination.
- The existing directory backend and read contract remain unchanged.

### Design Intent

Keep source selection beside the list heading. Present only the available source;
new options require real implementations rather than placeholder selections.

### Files Modified

- `packages/ui/src/components/StockSidebar.tsx`
- `packages/ui/src/styles.css`
- `docs/design-docs/stock-directory-reads.md`
- `docs/FRONTEND.md`

### Validation

make ci passes (19 TypeScript tests, Go vet/race checks and Web/Electron builds).
Actual macOS Electron smoke passes. Chrome Default / OBU desktop/mobile review
confirms the checked sole source, viewport bounds, selection dismissal, retained
mobile drawer, Escape focus restoration and neutral focus without blue outlines.
