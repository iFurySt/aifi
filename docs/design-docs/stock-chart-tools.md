# Stock chart tools

Status: implemented daily-price tools. Visual reference reviewed on 2026-10-18:
[Rallies AAPL summary](https://rallies.ai/research/AAPL/summary).

Stock tabs divide the old horizontal spacing between inter-item gaps and padding
inside each hover target. Company identity owns an icon-only watch toggle beside
the name, with an accessible action name, pressed state and a larger narrow-screen
touch target. Long names wrap with the star as one title group.

## Toolbar

The chart's single left-aligned, wrapping row contains the shared range Select,
existing Line/Candle segment, original provider source chip, Indicators and Compare.
Ranges are 1M, 3M, YTD, 1Y, 2Y and All, ending at the latest stored session.
Intraday 1D/5D are deferred until persisted minute bars exist. The old OHLCV/basis/
session-count prose and duplicate range caption are removed from the document;
coverage and basis stay available in source details. Cursor OHLCV stays in the
floating tooltip and keyboard live region.

## Studies and comparison

- Indicators implements SMA20, SMA50 and SMA200 over trading sessions. Compute
  on full stored history before clipping to the selected window. Never synthesize
  partial warmup values; unavailable periods are disabled until enough data exists.
  Selected studies can also be removed through their legend controls.
- Compare searches the existing local directory and reads at most three selected
  symbols through the shared research cache. Pending reads show compact skeletons,
  keep the current chart, and never invoke collection or a provider.
- Comparison requires split-adjusted prices, at least two shared observed dates,
  and a common baseline/end for all included series. The axis becomes percent
  price return; dividends and currency conversion are excluded. Missing interior
  sessions break the relevant path instead of forward filling. An empty/error or
  unadjusted peer is explicit and does not replace ready price data with zeros.
- SMA lines remain available in Candle and comparison modes. In comparison mode
  their price values use the primary symbol's baseline for the percentage axis;
  the tooltip retains their absolute prices. Legends and source details expose
  the shared dates and collected provider metadata.

Rallies additionally exposes Trendlines, Support Resistance and AutoVWAP. Their
anchoring/detection rules are not inferable from menu labels; these are deferred
rather than implemented with guessed algorithms. Rallies' Compare accepts a ticker
and provides removal; AIFi adds local-directory lookup and stored-data boundaries.

`packages/core/src/stock-chart.ts` owns deterministic windows, SMA and common-date
returns. `pnpm smoke:chart-tools` verifies interactions and light/dark/narrow
layouts using a disposable renderer and synthetic local data. The existing Stocks
layout gate covers all six tabs, overflow, keyboard drawers and stable chart state.
