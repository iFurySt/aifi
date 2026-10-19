## [2026-10-19 23:17] | Task: Verify FMP/Rallies news sources and enable a free Digest source

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Confirm whether a personal FMP key can fetch news, inspect Rallies Digest's
> source, and integrate a usable free public alternative.

### Findings

- Official FMP personal pricing lists news in paid Starter and higher plans;
  personal use itself is not the restriction. The configured local key's bounded
  AAPL news request returned HTTP 402. News was disabled with no saved snapshots.
- Rallies links Digest prose to its own article pages without disclosing the
  underlying news supplier in the inspected public content. No supplier is assumed.
- Yahoo's direct public ticker RSS returned dated headlines/links without keys or
  browser credentials. It is a limited source window, not a guaranteed archive/API.

### Changes Overview

- Added a bounded Yahoo RSS collector with exact endpoint/ticker identity checks,
  XML/DTD/size protections, publication-date/URL validation, deduplication, plain
  snippets and immutable source evidence. It uses the existing provider budget
  and fair dataset rotation, then atomically persists through Go/SQLite.
- New installs enable daily Yahoo news. Legacy disabled states and enabled FMP
  selections remain; Sync settings exposes News source. Disabled missing datasets
  now report Sync is off, while existing saved data remains readable.
- Digest displays ordered stored headlines, publication times, short feed snippets
  and safe original links. It does not claim AI-generated analysis or copy Rallies.
- Added source documentation and collector/store/worker/domain/renderer regressions.

### Design Intent

Make ordinary personal research work without a news subscription while retaining
replaceable explicit sources, bounded background work and offline local reads.
Provider failure must not erase saved news or trigger collection on page visits.

### Verification

- Independent snapshot: TypeScript, 14 core/link tests, production renderer build,
  market/store/research/service Go suites, CLI build and `pnpm smoke:news` passed.
  Scoped Go vet and the current-workspace full app build passed.
- Tests cover budget admission, malformed/oversized/wrong-symbol feeds, unsafe
  URLs, duplicates/future dates, fresh/legacy choices, persistence across restart,
  zero HTTP on reads, failure retention and no price-backlog starvation. UI covers
  populated/empty/disabled states, source selection, links and wide/narrow themes.
- Enabled Yahoo news for the current store and saved eight valid AAPL items.
  Reopened the actual App and verified visible source-dated headlines/snippets.
  Its background worker then independently saved nine MSFT items.

### Files Modified

- `apps/cli/internal/market/client.go`, Yahoo news collector/tests
- `apps/cli/internal/research/engine.go` and worker tests
- `apps/cli/internal/store/research.go`, defaults and news tests
- `packages/core/src/stock-research.ts` and tests
- `packages/ui/src/pages/ResearchSyncSettings.tsx`, Digest/shared empty states and CSS
- `scripts/check-company-news.mjs`, isolated fixture, package command and source/design docs
