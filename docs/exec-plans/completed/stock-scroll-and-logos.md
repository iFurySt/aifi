# Stock Scrolling And Logos

## Goal

Replace Previous/Next controls with incremental directory scrolling, clarify that
Nasdaq Trader is the provider of US listings, and determine usable company logos.

## Scope

- Shared feed controller, bounded read port, debounced search and stale-response guards.
- Snapshot changes rebase the list; failed next pages retain existing rows and retry.
- Visible company logos when a compatible source is available, with letter fallback.
- No pricing/fundamental data changes or fake common-stock/identity inference.

## Risks And Decisions

- Offset pages must share one snapshot; restart on changed snapshot IDs.
- Logo sources can require keys, attribution or prohibit caching; verify the actual
  current source rather than copying an old public endpoint into the renderer.
- A logo is decorative, not proof of corporate identity or financial data freshness.

## Milestones

- [x] Feed and source name, regression tests.
- [x] Logo choice and implementation/research outcome.
- [x] Chrome/Electron validation, documentation and staged integration into main.

## Validation

Injected repository tests for concurrent paging, races, snapshot changes, error/retry,
empty/end behavior; make ci and native smoke; Chrome desktop/mobile scrolling.

- 2026-10-14: Feed slice typechecks; 24 TypeScript tests pass. Logos: Nasdaq
  files have no images; FMP public AAPL/MSFT/KO PNG assets succeed without a key,
  missing symbol is 404. Older Parqet/Elbstream API probes return 403 here.

- 2026-10-14: Separate logo repository, bounded host PNG cache, private local data URLs and renderer contrast/fallback implemented. Native HTTPS agent verified against real public AAPL data. Directory feed is unaffected by asset latency.

- 2026-10-14: make ci passes with 31 TypeScript tests, Go vet/race and all builds.
  Actual macOS smoke passes. Native UI verifies 50→100 and AAPL reset; Chrome
  verifies 50→100→150, prefix preservation, search reset/empty, cached data-only
  logos and no viewport overflow. Mobile drawer verifies 50→100 and logos.
  White transparent marks retain contrast across cached focus refreshes.

- 2026-10-14: Both feature commits pushed and main updated/built. Main Web
  preview opens the live 50-row directory with no pager. Main native process
  restarted with the new build. Final visual handoff awaits Mac unlock; isolated
  native validation passed.
