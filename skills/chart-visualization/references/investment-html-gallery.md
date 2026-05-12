# Investment HTML Gallery

Use this reference when an AIFi research artifact should be delivered as a
polished HTML chart component rather than a raw notebook plot. The examples in
`html-examples/` are intentionally close to UI component references: a complete
layout, representative data, annotations, labels, source notes, and responsive
styling in a single file.

## When To Use HTML First

- Use HTML when the output is a memo exhibit, dashboard section, data room
  visual, IC appendix, or artifact the user should inspect in a browser.
- Keep Python, SVG, and scripts when the task needs heavy calculation,
  backtesting, regression, optimization, Monte Carlo generation, or reproducible
  numeric transforms before the final visual is rendered.
- Prefer a self-contained HTML file for final presentation. Put any calculation
  assumptions in the visible source note or companion research artifact.

## Visual System

All examples follow the local `html-effectiveness` direction:

- ivory page background, dark slate text, white panels, restrained borders, and
  clay or olive emphasis colors;
- serif display headings, system sans body text, and mono labels for dates,
  tickers, units, and source notes;
- compact sections with table-like scanability instead of marketing layouts;
- no unexplained dual axes, unlabeled units, decorative gradients, or purely
  ornamental chart marks;
- responsive dimensions with stable panels so labels and controls do not
  collapse on narrow screens.

## Example Index

| Example | Use For | Covers |
| --- | --- | --- |
| `html-examples/market-timeseries.html` | Price, NAV, fund return, macro trend, benchmark-relative performance | line, area, indexed line, cumulative return, equity curve, relative performance, rolling return, rolling Sharpe, rolling beta, drawdown, volume |
| `html-examples/trading-microstructure.html` | Trading-oriented price and liquidity inspection | candlestick, OHLC, volume, depth chart, order flow, footprint, tick chart, Renko, Heikin Ashi, Point & Figure |
| `html-examples/composition-and-allocation.html` | Portfolio, revenue, geography, and market-share structure | bar, stacked bar, 100% stacked bar, horizontal bar, grouped bar, pie, donut, treemap, sunburst, icicle, Marimekko, pyramid |
| `html-examples/risk-distribution.html` | Return distribution, tail risk, manager ranking, volatility review | histogram, KDE, box plot, violin, QQ plot, VaR, stress test, Sharpe, Sortino, information ratio, tracking error |
| `html-examples/portfolio-optimization.html` | Portfolio construction and multi-asset diagnostics | scatter, bubble, efficient frontier, risk-return, correlation matrix, covariance matrix, alpha/beta, factor exposure, risk attribution |
| `html-examples/attribution-scenario.html` | Explaining changes, sensitivity, and uncertain forecasts | waterfall, bridge, tornado, Monte Carlo, fan chart, scenario tree, decision tree |
| `html-examples/macro-rates-dashboard.html` | Rates, inflation, growth, economic cycle, and geography | yield curve, spread, CPI/PPI, GDP growth, PMI, Fed dot plot, calendar heatmap, seasonality, polar/cycle chart, choropleth, geo bubble |
| `html-examples/venture-saas-dashboard.html` | VC, growth equity, SaaS, and operating diligence | KPI cards, table, cap table, financial model, cohort, unit economics, burn multiple, magic number, Rule of 40, TAM/SAM/SOM, adoption/logistic curve, power law, Pareto, Lorenz |
| `html-examples/flow-network-systems.html` | Capital movement, relationships, reasoning systems, and agent workflows | funnel, Sankey, flow diagram, chord, network graph, causal graph, Bayesian network, knowledge graph, agent workflow, multi-agent collaboration |

## Extended Taxonomy Coverage

Some investment chart names are specialized variants rather than separate HTML
families. Map them to the nearest example before deciding whether to create a
new component:

| Chart Type | Start From | Notes |
| --- | --- | --- |
| OHLC, Heikin Ashi, Renko, Point & Figure, footprint, tick chart | `trading-microstructure.html` | Calculate transformed bars first, then reuse the price/liquidity layout. |
| Hexbin, swarm plot, strip plot | `risk-distribution.html` or `portfolio-optimization.html` | Use when dense scatter or sample distribution would overplot. |
| Radar chart, spider chart, parallel coordinates | `portfolio-optimization.html` | Use only when dimensions are fixed and comparable across assets or companies. |
| Timeline and Gantt chart | `flow-network-systems.html` | Use for financing history, IPO process, diligence workstreams, or product milestones. |
| Polar chart, seasonality chart, cycle chart | `macro-rates-dashboard.html` | Keep periodicity explicit: month, quarter, economic phase, or policy cycle. |
| Sunburst, icicle, pyramid | `composition-and-allocation.html` | Use for hierarchy; switch to table if labels become cramped. |
| Financial model spreadsheet and cap table | `venture-saas-dashboard.html` | Preserve row precision and formulas in companion notes when needed. |
| Scenario tree, decision tree, Bayesian network | `attribution-scenario.html` or `flow-network-systems.html` | Use trees for discrete paths and networks for probabilistic dependency maps. |

## Production Checklist

Before using an example in research:

1. Replace sample data with sourced data and keep the source date visible.
2. Preserve chart units in axis labels, legends, or source notes.
3. Sort ranked displays by value unless the order is temporal, stage-based, or
   legally fixed.
4. Add annotations only for material events or decision-relevant thresholds.
5. Open the HTML in a browser and inspect desktop and narrow widths for label
   collisions, clipped text, excessive whitespace, and illegible color contrast.
