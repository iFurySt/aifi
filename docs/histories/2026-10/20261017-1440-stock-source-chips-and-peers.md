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

### Files Modified

- `apps/cli/internal/market/yahoo_peers.go`
- `apps/cli/internal/research/engine.go`
- `apps/cli/internal/store/research.go`
- `packages/core/src/stock-research.ts`
- `docs/design-docs/research-ingestion.md`
