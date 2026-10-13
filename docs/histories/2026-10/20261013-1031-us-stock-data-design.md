## [2026-10-13 10:31] | Task: US stock data foundation design

### Execution Context

- Agent ID: `root`
- Base Model: `GPT-6`
- Runtime: `Codex desktop`

### User Query

> Design basic US stock collection, initially using several development targets,
> free personal APIs, a Go asynchronous schedule, and Rallies-style stock tabs.
> Inspect the three archived reference projects. Start with daily/closing data.

### Changes Overview

- Reviewed Rallies AAPL through OBU and inspected Dexter, OpenBB, and AI Hedge Fund
  source without executing or copying upstream applications.
- Compared primary provider documentation. Recommended Massive EOD market batches,
  Nasdaq directory, and SEC filings/facts; kept Alpaca historical SIP as an
  alternative and recorded other free-tier limits/unknowns.
- Probed two keyless directory downloads successfully. SEC metadata/facts returned
  403; Massive account entitlement remains untested without a user key.
- Specified instruments/aliases, raw provenance, normalized rows, SQLite jobs,
  rate/quota limits, leases, retries, wake catch-up, corrections, financial period
  semantics, local transport boundaries, and staged expansion.
- Defined Overview/Chart/Financials/Filings and built a standalone fixture-based
  visual concept. Kept conversation Research separate from the planned Stocks UI.
- Updated architecture/product/design/frontend/CLI docs and added the active
  implementation plan. No runtime collector, credentials, or Go module added.

### Design Intent

Use batch endpoints and durable jobs rather than assuming more goroutines solve
quota or recovery. Keep company identity, prices, filings, and financial coverage
separate. Preserve source/period/adjustment provenance and make missing data
visible. The prototype is a review artifact, with no claim of live data.

### Files Modified

- `docs/references/us-stock-data-providers.md`
- `docs/design-docs/us-stock-data-pipeline.md`
- `docs/design-docs/stock-research-page.md`
- `docs/exec-plans/active/us-stock-data-foundation.md`
- `docs/prototypes/stock-research/`, `DESIGN.md`
- Architecture, frontend, product, reference/index, and CLI documentation

### Validation

- Public directory probes: HTTP 200 with row counts/trailer times; SEC HTTP 403
  recorded without bypass. No personal account, cookie, or key accessed.
- OBU: desktop/mobile layouts, all four tabs, keyboard tab navigation, ticker/
  watchlist, chart range/type, financial statement/period, filing filters, theme,
  and sample-dialog focus passed. No external page assets or data requests.
- Visual review corrected mobile chart text by sizing SVGs to their rendered
  viewport rather than shrinking a desktop canvas; recorded the reusable rule.
- make ci passed: repository gates, TypeScript, nine domain/storage tests, and
  both production builds. Live provider and scheduler verification remain staged
  in the implementation plan.
