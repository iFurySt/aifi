# Web Interactive Charts

Use browser-native charts when the result needs hover tooltips, zooming,
filtering, client-side exploration, or embedding in a research page.

## Library Choices

- Plotly: quickest path to standalone interactive HTML and Sankey charts.
- ECharts: strong dashboard primitives, Sankey, treemap, heatmap, and large
  series performance.
- Vega-Lite: concise declarative grammar and portable JSON specs.
- Reaviz or Recharts: React component integration when the host app already
  uses those libraries.
- D3: custom interaction or layout when higher-level libraries are insufficient.

## Standalone HTML Pattern

Use a single HTML file with embedded data for review artifacts. Prefer a CDN
loader for temporary research outputs, but pin package versions for durable app
surfaces.

```html
<div id="chart"></div>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script>
const data = [{ type: "bar", x: ["A", "B"], y: [10, 15] }];
const layout = { title: "Example", margin: { t: 48, r: 24, b: 48, l: 56 } };
Plotly.newPlot("chart", data, layout, { responsive: true });
</script>
```

## React Integration

- Reuse the application's existing chart system before adding a new dependency.
- Keep data transforms outside the component when they are reusable.
- Keep chart dimensions stable with `min-height`, `aspect-ratio`, or measured
  containers.
- Add empty, loading, and error states for dashboard surfaces.
- Use accessible table fallback or CSV export for dense research data.

## Delivery Checklist

- The HTML opens without a build step.
- CDN or bundled dependency choice is explicit.
- The chart has a title, axis labels, tooltip labels, and source note.
- The file does not fetch private data from remote services.
