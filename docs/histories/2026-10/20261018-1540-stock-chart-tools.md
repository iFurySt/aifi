## [2026-10-18 15:40] | Task: Compact stock identity and chart tools

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Refine tab hover spacing, move the icon-only watch action beside company text,
> simplify the chart toolbar, and inspect/add Rallies-style Indicators and Compare.

### Changes Overview

- Split tab spacing between gaps and inner hover padding; group title/star for
  long-name wrapping and maintain an accessible narrow-screen touch target.
- Replace range segments with the shared Select, retain Line/Candle segments,
  place source details immediately after them, and remove the always-visible
  technical readout/duplicate range caption.
- Add SMA20/50/200 with full-history warmup, legend removal and hover values.
- Add local-directory search and up to three price comparisons through cached
  research reads. Align actual shared baseline/end dates and use percent returns;
  missing observations stay gaps. Exclude unadjusted or absent price histories.
- Move basis/coverage and comparison collection metadata into source details.
- Record Rallies' remaining Trendlines, Support Resistance and AutoVWAP options
  as deferred algorithm work. Persisted intraday bars are required for 1D/5D.

### Design Intent

Keep document controls compact, visual and consistent. Preserve analytical
meaning when overlaying differently priced securities; source data and collection
boundaries remain unchanged. No synthetic prices or assumed indicator algorithms.

### Validation

- TypeScript and production Web build; domain tests for calendar windows, SMA
  warmup and common-date returns, including absent/zero/missing-session cases.
- Isolated chart controls, delayed peer reads, empty/unadjusted peers, tooltip,
  provider metadata, and 1440/1000/650/390 light/dark layout checks.
- Existing all-six-tab responsive and shared-loading regression gates pass.
- Native App reviewed with stored AAPL SMA20 and AAPL/MSFT percentage comparison.
- Scoped snapshot checked independently of concurrent Chat/Usage/Arena work.

### Files Modified

- `packages/core/src/stock-chart.ts`, its tests and public export
- `packages/ui/src/components/StockChart.tsx`, `StockComparePicker.tsx`, chart CSS
- `packages/ui/src/pages/Stocks.tsx`, scoped stock styling
- `scripts/check-stock-chart-tools.mjs`, synthetic fixture, stock responsive gate
- Chart design doc, frontend/design guidance and execution plan
