## [2026-10-17 15:00] | Task: Compact stock header and exchange-local clock

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Align the company header, remove inline search in favor of global Command+K,
> tighten quotes, separate the research tabs and native toolbar controls, and
> show an automatically advancing exchange-local clock.

### Changes Overview

- Company name and ticker/exchange share a desktop identity row with the
  watchlist action; narrow screens wrap metadata without page overflow.
- Removed the duplicate company search and its local lookup state. Global
  Command/Ctrl+K search and sidebar stock filtering remain available.
- Added a divider above research tabs and tightened market-state/price/currency
  gaps while retaining the compact ticker tag.
- Added an independently ticking New York clock with focus/visibility catch-up.
  Original quote observation dates remain in source details; no provider data
  is fetched by clock ticks.
- Removed sidebar-width reservation from native navigation. An adjacent divider
  and consistent 18px page-specific icon lead into the AIFi/page breadcrumb.

### Design Intent

Current exchange time and quote freshness describe different facts. The visible
clock follows time without presenting historical prices as streaming data. Native
window controls and the established local data boundary stay intact.

### Validation

- Typecheck, 99 working-tree TypeScript tests and production builds passed.
- Actual Electron smoke and interaction regression suite passed (initial smoke
  had a transient renderer-settle timeout; the diagnostic retry passed).
- Chrome verified one-line desktop identity, a 1px tab divider, removed company
  search, and global Command+K. Advancing the client clock by a minute updated
  the exchange clock while the price stayed unchanged.
- Desktop and 390px mobile checks showed no document overflow. Electron screenshot
  confirmed adjacent native controls/divider/breadcrumb alignment.

### Files Modified

- `packages/ui/src/pages/Stocks.tsx`
- `packages/ui/src/components/Shell.tsx`
- `packages/ui/src/components/ExchangeClock.tsx`
- `packages/ui/src/styles.css`
- `DESIGN.md`, `docs/FRONTEND.md`
