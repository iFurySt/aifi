# Funds ownership workspace

Status: completed, 2026-10-17.

## Outcome and sequence

Compare Rallies Funds with the local page and implement sourced institutional
ownership with a fund selector, position changes and real period history.

1. [x] Inspect the real reference and source adapters/reference repositories.
2. [x] Add keyless Yahoo public holders collection, configurable source/schedule,
   bounded same-source stored history, validation and offline persistence tests.
3. [x] Build compact ownership summary, selectable fund history and searchable,
   filterable holdings table with exact reporting dates and source details.
4. [x] Verify actual AAPL and additional companies, isolated UI tests, native/Web
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

## Completion evidence

- Data layer committed/pushed independently as `27c7a08`. Shared workspace edits
  were preserved; no stash or blanket add/commit was used.
- TypeScript, 148 unit tests, full Go format/vet/race/build, production builds,
  desktop/continuity smoke and isolated Funds interaction checks passed.
- Actual SQLite stores AAPL/MSFT/NVDA with 20 normalized rows each. The existing
  local Funds dataset alone was enabled with Yahoo; other settings were retained.
- Native AAPL and Chrome desktop/mobile show aggregate and sampled ownership.
  Monthly fund dates remain exact; 390px layout has no body overflow and the table
  owns its horizontal scroll. App is left on AAPL Funds.
- Full historical 13F, all-manager census and managed fund logos remain source
  gaps; no uncollected quarter, inferred exit or fabricated logo is displayed.


Historical backfill and fund-logo gaps above describe the initial sample-only
iteration. They are superseded by the subsequent
[fund history and logos plan](fund-history-and-logos.md), which adds the tracked
manager history source, ring layout and shared logo catalog.
