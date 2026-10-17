# Funds ownership workspace

Status: active, 2026-10-17.

## Outcome and sequence

Compare Rallies Funds with the local page and implement sourced institutional
ownership with a fund selector, position changes and real period history.

1. [x] Inspect the real reference and source adapters/reference repositories.
2. [x] Add keyless Yahoo public holders collection, configurable source/schedule,
   bounded same-source stored history, validation and offline persistence tests.
3. [ ] Build compact ownership summary, selectable fund history and searchable,
   filterable holdings table with exact reporting dates and source details.
4. [ ] Verify actual AAPL and additional companies, isolated UI tests, native/Web
   presentation, docs/history; commit and push only Funds changes in phases.

## Source decisions and boundaries

- Yahoo's public holders page exposes ten institutions and ten mutual funds plus
  aggregate ownership. Identity is checked; no cookies/private quoteSummary API.
- Its tables are partial, with different report dates. Mutual funds overlap with
  managers and must not be summed into an institutional total. Source value is a
  vendor holding valuation, not assumed quarter-end 13F fair value.
- Nasdaq is keyless in OpenBB but the local public probe failed (HTTP2 error and
  timeout); do not add a default source that could not be verified here.
- SEC bulk 13F is official/keyless, but requires CUSIP mapping and amendment/
  combination-manager handling, plus ~96MB per archive. Record the dedicated
  backfill path; do not imply a full 13F warehouse has been built.
- Preserve optional FMP, its endpoint entitlement requirement and real quarter
  windows. Do not infer New/Exited from absence in a top-holder sample or infer
  exact share counts from a rounded percentage change. Unknown remains unknown.
- Collect → persist SQLite → local read. Durable scheduling, settings, budgets,
  source dates, last-good/offline data and immutable evidence stay intact. Store
  observed history over time without fabricating uncollected past quarters.
- Preserve existing disabled settings. New installations enable keyless Funds;
  the maintainer's existing local Funds setting can be enabled explicitly for
  live validation. Other tasks' files/index/configuration are left alone.

## Validation

Synthetic parser tests: identity, numeric units/fraction percentages, bounds,
empty vs missing modules, exact source report dates, sampled disappearance,
source-isolated stored history and provider failures. Store reopen/read cannot
call collectors. UI checks cover selector, table/chart synchronization, search,
position filtering, real history gaps, exact monthly dates, mobile overflow,
hover/keyboard inspection, missing and partial coverage. Review actual AAPL plus
MSFT/NVDA when source access allows. No login/inference/API purchase required.
