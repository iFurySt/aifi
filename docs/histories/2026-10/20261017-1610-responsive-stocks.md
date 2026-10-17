## 2026-10-17 16:10 | Task: Responsive Stocks workspace

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Improve Stocks layout in narrow windows, including automatic stock-sidebar
> collapse, using Rallies as a reference.

### Changes Overview

- Compared Rallies AAPL at large, tablet and phone widths through Chrome/OBU.
- Stocks moves its list to a left drawer below a 1280px viewport, while retaining
  the user's wide sidebar preference. The toolbar and Command/Control+B reopen it.
- Share the stock filter between the mounted sidebar and drawer. Select a stock
  to close the drawer; return wide without losing list position. A drawer open
  during widening closes and restores focus to visible content.
- Reflow the same sections by document width: three columns, grouped medium
  layout, then quote/chart first in one column. Retain About/Analyst/Earnings
  instead of hiding them. Compact headers, summary rows and 40px watch targets.
- Reveal selected scrolling tabs horizontally; keep tables inside their wrappers.
  A single chart retains its range/style during resizing and drawer interaction.
- Add an isolated responsive gate and wait for actual stock results in search
  regression checks instead of assuming a fixed number of other result types.

### Design Intent

Research keeps usable space before the list squeezes it. Automatic layout and
user preference are separate, and responsive behavior changes presentation rather
than source collection, persisted evidence, or the selected research target.

### Verification

- TypeScript, 118 unit tests and production Web/Electron builds passed.
- Responsive checks passed at desktop 1440/1279/1100/900/760px and Web 600/390px,
  including every tab, overflow, selected-tab visibility, drawer keyboard/select,
  wide preference, filter/scroll and chart DOM/range/style retention.
- The staged source also passed TypeScript and responsive checks independently
  from unrelated in-progress work in the shared checkout.
- Navigation, account, desktop and continuity smoke checks passed.
- Chrome checked all six tabs at 900/760/390px without document overflow. The
  actual native App was rebuilt/restarted and opened Stocks with cached data.
- Synthetic checks used isolated profiles and local repositories, without real
  credentials, authorization, inference or provider collection.

### Files Modified

- `packages/ui/src/components/Shell.tsx`, `StockSidebar.tsx`, `primitives.tsx`
- `packages/ui/src/pages/Stocks.tsx`, `packages/ui/src/styles.css`
- `scripts/check-stocks-responsive.mjs`, synthetic renderer and navigation check
- `DESIGN.md`, frontend/stock-page docs, release notes and package commands
