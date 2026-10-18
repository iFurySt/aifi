# Stock chart controls and studies

## Goal
Compact stock tabs/watch controls and one aligned chart toolbar with range,
style and source. Add useful local-price studies/comparison after inspecting
Rallies' current interface.

## Decisions
- Rallies Indicators offers SMA20/50/200, Trendlines, Support Resistance and
  AutoVWAP; Compare accepts a ticker and permits removing added tickers.
- Implement the three unambiguous SMA studies and multi-stock return comparison
  using stored daily bars. Defer unspecified trend/support/anchored-VWAP algorithms.
- Retain truthful daily ranges (1M/3M/YTD/1Y/2Y/All), not unbacked intraday options.
- Comparison uses a shared actual session baseline and split-adjusted closes;
  gaps stay gaps, absent data stays explicit. No provider fetches on interaction.

## Work
- [x] Adjust tabs, inline icon-only watch control and chart toolbar/source details.
- [x] Implement tested range, SMA warmup and common-date comparison calculations.
- [x] Wire accessible indicator/compare menus, loading/errors and narrow layouts.
- [x] Run math and interaction/responsive checks; review real App.
- [x] Update docs/history and commit the scoped change.

## Validation
Known mathematical series, calendar boundaries, insufficient history, partial
comparison overlap/gaps, cursor/OHLC behavior, keyboard menus/watch action,
toolbar ordering, cached local reads and desktop/narrow light/dark screenshots.

## Outcome
Daily studies and local comparisons implemented. Unit, loading, chart controls
and six-tab reflow checks pass; actual AAPL/MSFT comparison reviewed in App.
Remaining reference-site studies/intraday ranges are explicitly deferred above.
