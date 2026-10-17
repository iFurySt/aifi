## [2026-10-17 14:40] | Task: Compact stock data presentation and related stocks

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Clarify the static after-hours price, compact the ticker, color key metrics,
> hide verbose source prose behind citation chips, use earnings dots and add peers.

### Changes Overview

- Added keyless Yahoo related-symbol jobs for every directory candidate, weekly
  by default, with bounded parsing, persisted evidence and offline local reads.
- Related symbols are vendor associations rather than verified competitors;
  source identities remain exact and unsupported aliases are not guessed.
- Replaced verbose source footnotes with shared accessible provider menus.
- Compacted ticker tags, colored meaningful indicators and separated sector from
  industry. EPS uses hollow estimate dots, colored actuals and BEAT/MISS labels.
- Retained the daily/EOD model: after-hours snapshots belong in dated source
  details rather than an apparently live headline.

### Design Intent

Keep the page quiet while retaining provenance and honest freshness. Avoid
source-specific network requests from navigation or stock-related row rendering.

### Validation

- Actual Yahoo AAPL related-symbol HTTP probe returned five associations without
  credentials. App-owned collection persisted AAPL/MSFT/NVDA peer snapshots.
- Parser regressions cover identity mismatch, explicit empty coverage, duplicates,
  self references and invalid scores; collection/restart reads include peers.
- `make ci` passed typecheck, 88 TypeScript tests, production builds and Go
  race/vet checks. Signed EPS regression includes negative actuals/zero estimates.
- Electron smoke/interaction gate passed; Chrome verified persisted peer rows,
  compact prices, metric colors, earnings dots and expandable source timestamps.
  Mobile dark popup stayed within the viewport; source controls dismiss on Escape.

### Files Modified

- `apps/cli/internal/market/yahoo_peers.go`
- `apps/cli/internal/research/engine.go`
- `apps/cli/internal/store/research.go`
- `packages/core/src/stock-research.ts`
- `packages/ui/src/components/ResearchSource.tsx` and `StockPeers.tsx`
- `packages/ui/src/pages/Stocks.tsx` and `stock-research-panels.tsx`
- `docs/design-docs/research-ingestion.md`
