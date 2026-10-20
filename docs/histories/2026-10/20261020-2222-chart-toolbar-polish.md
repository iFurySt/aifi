## [2026-10-20 22:22] | Task: Polish chart toolbar and indicator menu

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Fix the transparent dropdown, unify toolbar icon sizes, and make Line/Candle
> equal halves with a sliding selection animation.

### Changes Overview

- Corrected Indicators’ undefined dropdown class to the shared opaque menu surface.
  Kept viewport bounds, themed border/shadow, inset rows and selected checkmarks.
- Unified toolbar control heights and 16px icon slots, with compact shared insets
  and phone-sized minimum targets.
- Split Line/Candle evenly with one 180ms sliding selected background; reduced
  motion switches immediately. Existing pressed states and chart behavior remain.

### Design Intent

Give the chart one compact, consistent control row and clearly separate the menu
from research content beneath it. Reuse shared surface and hover tokens.

### Verification

- TypeScript and production renderer build passed.
- Existing chart-tools smoke passed at 1440/1000/650/390px in light/dark, including
  studies, Line/Candle, range, comparison, metadata and local-only reads.
- Refreshed the native App, switched Line/Candle, and visually confirmed the opaque
  Indicators menu and compact, aligned toolbar with equal-width segments.

### Files Modified

- `packages/ui/src/components/StockChart.tsx`
- `packages/ui/src/components/StockComparePicker.tsx`
- `packages/ui/src/components/stock-chart-tools.css`
- `docs/design-docs/stock-chart-tools.md`
