## [2026-05-11 21:37] | Task: Add chart visualization skill

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Add a dedicated, full-purpose charting skill for charts, analysis figures,
> Sankey diagrams, and related visualization workflows. Survey public skill
> patterns first, keep SKILL.md as a TOC, put detailed methods in separate
> files for lazy loading, verify each method, commit, and push.

### Changes Overview

- Area: `skills/chart-visualization`
- Key actions: Added a TOC-style chart visualization skill, split chart method
  guidance into focused reference files, and added a dependency-free example
  renderer for SVG, Sankey, Plotly HTML, ECharts HTML, and Mermaid outputs.
  Extended CI to compile Python scripts so executable skill helpers stay
  syntax-checked.

### Design Intent

The skill is intentionally broad in capability but shallow at the entry point:
agents load only the method reference needed for their environment. A standard
library example script provides a reliable smoke path without making the
repository depend on plotting packages.

### Files Modified

- `skills/chart-visualization/SKILL.md`
- `skills/chart-visualization/agents/openai.yaml`
- `skills/chart-visualization/references/chart-selection.md`
- `skills/chart-visualization/references/static-svg.md`
- `skills/chart-visualization/references/python-analysis.md`
- `skills/chart-visualization/references/web-interactive.md`
- `skills/chart-visualization/references/sankey-flow.md`
- `skills/chart-visualization/references/diagram-text.md`
- `skills/chart-visualization/references/quality-gates.md`
- `skills/chart-visualization/scripts/render_examples.py`
- `scripts/ci.sh`
- `docs/CICD.md`
- `docs/releases/feature-release-notes.md`
