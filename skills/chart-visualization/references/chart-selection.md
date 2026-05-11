# Chart Selection

Choose the visual from the analytical question first, then adapt to the
available renderer.

## Common Intents

| Intent | Prefer | Avoid |
| --- | --- | --- |
| Trend over time | line, area, indexed line, small multiples | pie, unordered bars |
| Category comparison | bar, column, dot plot, slope chart | radar unless dimensions are fixed |
| Ranking | sorted horizontal bar, lollipop, table with bars | unsorted columns |
| Composition | stacked bar, treemap, waterfall, Sankey | pie with many slices |
| Distribution | histogram, box, violin, ridgeline | averages without spread |
| Correlation | scatter, bubble, hexbin, pair plot | dual axes without explanation |
| Funnel or conversion | funnel, step chart, waterfall | stacked pie |
| Flow or allocation | Sankey, alluvial, chord, network | stacked bars when path matters |
| Matrix relation | heatmap, correlation matrix | long tables |
| Geographic pattern | choropleth, symbol map | map when location is irrelevant |
| Process or dependency | Mermaid, Graphviz, swimlane | chart libraries optimized for metrics |

## Chart Data Contracts

Keep raw source data separate from derived plotting data.

- Time series: `date`, `series`, `value`, optional `unit`, `source`.
- Category bars: `category`, `value`, optional `group`, `rank`, `unit`.
- Distribution: `sample_id`, `value`, optional `group`, `bucket`.
- Scatter: `x`, `y`, optional `label`, `size`, `group`.
- Heatmap: `x`, `y`, `value`, optional `group`, `unit`.
- Sankey: `source`, `target`, `value`, optional `group`, `source_id`,
  `target_id`.
- Treemap or sunburst: `id`, `parent`, `label`, `value`.
- Diagram: `nodes`, `edges`, optional `group`, `label`, `status`.

## AIFi Defaults

- Show reporting period and currency for financial charts.
- Prefer one clear message per figure; use small multiples for several related
  messages.
- Sort bars by value unless the natural order is time, funnel stage, or rating.
- Use annotations for material events such as earnings, guidance changes,
  filings, analyst revisions, and product launches.
- Keep a companion note with source URLs or archive paths when the artifact
  cannot embed full provenance.
