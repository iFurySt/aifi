# Static SVG

Use this method when the agent needs deterministic chart artifacts with no
package installation. SVG is easy to diff, can be embedded in markdown or HTML,
and works in restricted environments.

## Built-In Example Script

Run:

```sh
python3 skills/chart-visualization/scripts/render_examples.py --out-dir /tmp/aifi-chart-examples
```

The script writes:

- `analysis_dashboard.svg`: compact bar, line, scatter, and heatmap panels.
- `sankey_flow.svg`: dependency-free Sankey-style flow view.
- `plotly_sankey.html`: self-contained data plus Plotly CDN loader.
- `echarts_dashboard.html`: self-contained data plus ECharts CDN loader.
- `research_flow.mmd`: Mermaid flowchart text.

Use the script as a smoke test or a starting point for project-specific chart
generation. Copy logic only when the target environment cannot install a chart
library.

## SVG Guidance

- Set a fixed `viewBox` and explicit width or height.
- Keep chart geometry deterministic: fixed margins, stable ordering, rounded
  values only at label time.
- Escape labels and titles with an XML-safe encoder.
- Draw axes, gridlines, marks, labels, and legend as separate groups.
- Use semantic colors sparingly and do not rely on color alone.
- Include `<title>` and `<desc>` inside the root SVG for accessibility.

## When Not To Use

- Large data with panning, hover, filtering, or zoom needs.
- Complex layout such as dense networks or maps.
- Statistical plots where mature libraries handle binning and uncertainty
  better.
