# Sankey And Flow Visuals

Use Sankey or alluvial charts when the important message is movement,
allocation, leakage, conversion, or dependency between stages.

## Data Shape

Use a flat edge table first:

| source | target | value | group |
| --- | --- | ---: | --- |
| Revenue | Gross profit | 62 | income statement |
| Revenue | Cost of revenue | 38 | income statement |

Normalize labels before rendering so that `Cloud`, `cloud`, and `Cloud ` do not
become separate nodes.

## Renderer Options

- Plotly Sankey: fastest standalone interactive HTML path.
- ECharts Sankey: good dashboard option with broad chart family coverage.
- D3 Sankey: custom layout control when the app can own JavaScript code.
- Static SVG fallback: acceptable for small flows and deterministic reports.
- Mermaid flowchart: acceptable when exact flow width is less important than
  explaining process sequence.

## Layout Checks

- Values leaving a node should reconcile with values entering the next stage
  when the data represents conserved flow.
- Label every major node and aggregate tiny links into `Other` when labels
  collide.
- Use left-to-right stage order for conversion or financial waterfalls.
- Use source-target groups or colors to preserve path readability.
- Do not imply conservation when the metric is not conserved. For example,
  count of customers, dollars, and percentage points should not share one flow.

## AIFi Use Cases

- Revenue to gross profit, operating profit, cash flow, and reinvestment.
- Segment revenue mix moving into margin contribution.
- Funnel from watchlist to researched targets to portfolio actions.
- Supply-chain or ecosystem dependency flows.
- Sources of stock move: macro, sector, company-specific news, earnings, and
  positioning signals.
