## [2026-05-13 00:50] | Task: investment HTML chart gallery

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `local terminal, Chrome headless screenshots`

### User Query

> Add investment chart HTML examples to the chart visualization skill, using the
> local HTML effectiveness examples as style inspiration. Keep the existing
> script-oriented chart guidance when useful, make `SKILL.md` a TOC, visually
> inspect each HTML example with screenshots, commit in small slices, and push
> when complete.

### Changes Overview

- Area: `skills/chart-visualization`
- Key actions:
  - Added an investment HTML gallery reference and linked it from `SKILL.md`.
  - Added nine self-contained HTML chart examples covering investment chart
    families across market time series, trading, allocation, risk,
    optimization, attribution, macro, venture/SaaS, and flow/network systems.
  - Kept existing SVG, Python, browser, Sankey, and diagram references intact so
    scripts remain available for calculations and reproducible analysis.
  - Captured local Chrome screenshots for each HTML example and fixed visual
    issues found during review.

### Design Intent

The change treats HTML as the preferred presentation layer for polished
investment research artifacts while preserving scripts for numeric transforms,
analysis, optimization, and static rendering. The gallery maps many specialized
chart names to a smaller set of reusable component families so the skill stays
legible and practical for agents.

### Files Modified

- `skills/chart-visualization/SKILL.md`
- `skills/chart-visualization/references/investment-html-gallery.md`
- `skills/chart-visualization/references/html-examples/market-timeseries.html`
- `skills/chart-visualization/references/html-examples/trading-microstructure.html`
- `skills/chart-visualization/references/html-examples/composition-and-allocation.html`
- `skills/chart-visualization/references/html-examples/risk-distribution.html`
- `skills/chart-visualization/references/html-examples/portfolio-optimization.html`
- `skills/chart-visualization/references/html-examples/attribution-scenario.html`
- `skills/chart-visualization/references/html-examples/macro-rates-dashboard.html`
- `skills/chart-visualization/references/html-examples/venture-saas-dashboard.html`
- `skills/chart-visualization/references/html-examples/flow-network-systems.html`
- `docs/exec-plans/completed/investment-html-chart-gallery.md`
