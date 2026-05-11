---
name: chart-visualization
description: Create analytical charts, data visualizations, diagrams, dashboards, and Sankey or flow visuals from research data. Use when a task asks to draw, plot, graph, visualize, chart, compare, summarize data visually, build an analysis figure, create an interactive chart, or choose the right visualization method.
---

# Chart Visualization

Use this skill to turn structured or semi-structured data into legible visual
artifacts for AIFi research. The skill supports static figures, browser-native
interactive charts, analysis dashboards, diagrams, and Sankey-style flow views.

## Workflow

1. Clarify the audience, artifact target, data source, and output format.
2. Read `references/chart-selection.md` to choose the chart family and data
   contract.
3. Load only the implementation reference needed for the selected environment:
   static SVG, Python plotting, browser HTML, diagram text, or Sankey flow.
4. Normalize the data before drawing. Keep source labels, units, time ranges,
   and transformations visible in the artifact or companion notes.
5. Generate the smallest useful artifact first, then iterate on labeling,
   ordering, annotations, and accessibility.
6. Validate the output with `references/quality-gates.md` before returning it.
7. Store reusable outputs under the relevant `research/targets/<target>/`
   artifact folder when the chart belongs to investment research.

## Reference TOC

- `references/chart-selection.md`: chart chooser, data contracts, and common
  analytical intents.
- `references/static-svg.md`: dependency-free SVG generation and when to use
  `scripts/render_examples.py`.
- `references/python-analysis.md`: matplotlib, seaborn, pandas, and Plotly
  guidance for local or notebook-style analysis environments.
- `references/web-interactive.md`: Plotly, ECharts, React chart libraries, and
  self-contained HTML export patterns.
- `references/sankey-flow.md`: Sankey, alluvial, funnel, and flow-map data
  shapes plus layout checks.
- `references/diagram-text.md`: Mermaid, Graphviz, Vega-Lite, and text-first
  visual specs for agents that cannot render images directly.
- `references/quality-gates.md`: artifact validation, accessibility, source
  labeling, and delivery checklist.

## Method Selection

- Need guaranteed local execution with no packages: use `static-svg.md`.
- Need statistical analysis or print-quality PNG/PDF: use
  `python-analysis.md`.
- Need interactive hover, zoom, filters, or browser delivery: use
  `web-interactive.md`.
- Need money, users, cohorts, costs, or energy moving between categories: use
  `sankey-flow.md`.
- Need architecture, process, causal, or relationship diagrams: use
  `diagram-text.md`.

## Output

Return:

- artifact path(s)
- chart type and implementation method
- data source and transformation notes
- validation performed
- known limitations or follow-up data needed

## Quality Gate

Before finishing, read `references/quality-gates.md` and confirm that labels,
units, source dates, color accessibility, rendering, and artifact paths are all
handled.
