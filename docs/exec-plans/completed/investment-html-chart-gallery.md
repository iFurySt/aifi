# Investment HTML Chart Gallery

## Goal

Extend `skills/chart-visualization` with an investment-focused HTML chart
reference gallery. The gallery should provide polished, self-contained HTML
components modeled after the local `html-effectiveness` examples, while keeping
the existing script-oriented guidance for calculations and static rendering.

## Scope

- In scope: a chart taxonomy in the skill TOC, HTML references for the major
  investment chart families, sample data, design guidance, visual verification,
  history documentation, small commits, and a final push.
- Out of scope: replacing the existing Python/SVG/script references, adding a
  production app, live market data connectors, or implementing every specialized
  chart variant as a separate standalone file.

## Context

- Relevant docs: `docs/REPO_COLLAB_GUIDE.md`, `docs/ARCHITECTURE.md`,
  `docs/design-docs/core-beliefs.md`, `docs/HISTORY_GUIDE.md`,
  `docs/QUALITY_SCORE.md`, and `docs/PLANS_GUIDE.md`.
- Relevant skill: `skills/chart-visualization/`.
- External references: local `html-effectiveness` HTML examples and the user's
  investment chart list, summarized without recording local absolute paths.
- Constraint: each finished HTML example should be opened and visually checked
  before its commit.

## Risks

- Risk: the source chart list is broad enough to produce many repetitive files.
  Mitigation: cover the list through reusable investment chart families, and
  document which specific chart types map to each reference.
- Risk: HTML examples can look good in source but fail in a browser viewport.
  Mitigation: use local browser screenshots for each example and fix spacing,
  sizing, and typography issues before committing.
- Risk: script guidance could be lost while adding HTML guidance.
  Mitigation: keep scripts for calculation and analysis support; add HTML as a
  preferred delivery path for polished visual artifacts.

## Milestones

1. Discovery and design alignment.
2. Skill TOC and taxonomy update.
3. HTML examples implemented and visually verified in small slices.
4. Repository checks, history entry, completion audit, and push.

## Validation

- Commands: `scripts/ci.sh`, plus targeted file/status checks before commits.
- Manual checks: open each HTML example in the local browser and capture a
  screenshot after implementation.
- Completion audit: map the user request to concrete files, commits, visual
  checks, CI output, and remote push state.

## Progress Log

- [x] Read required repository collaboration, architecture, and belief docs.
- [x] Reviewed existing `chart-visualization` skill shape.
- [x] Reviewed the external chart list and local `html-effectiveness` style.
- [x] Add skill TOC and investment HTML reference index.
- [x] Implement and visually verify HTML example slices.
- [x] Run CI and update history.
- [ ] Push final commits.

## Visual Verification Log

- `market-timeseries.html`: captured local Chrome screenshot at 1280x1100.
- `trading-microstructure.html`: captured local Chrome screenshot at 1280x1100.
- `composition-and-allocation.html`: captured local Chrome screenshot at
  1280x1100 and fixed missing legend and treemap colors before commit.
- `risk-distribution.html`: captured local Chrome screenshot at 1280x1100.
- `portfolio-optimization.html`: captured local Chrome screenshot at 1280x1100.
- `attribution-scenario.html`: captured local Chrome screenshot at 1280x1100.
- `macro-rates-dashboard.html`: captured local Chrome screenshot at 1280x1450.
- `venture-saas-dashboard.html`: captured local Chrome screenshot at 1280x1250.
- `flow-network-systems.html`: captured local Chrome screenshot at 1280x1200.

## Decision Log

- 2026-05-12: Keep `chart-visualization` as the home for the new gallery,
  because the existing skill already owns chart selection, browser HTML,
  scripts, and quality gates. Add HTML-first investment references beside the
  existing script-based references instead of splitting a second skill.
