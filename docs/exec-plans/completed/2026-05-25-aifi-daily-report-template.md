# AIFi Daily Report Template

## Goal

Create a repository-local AIFi daily report skill that guides agents to produce
a polished Chinese US market closing daily report as HTML. The report should
live under `research/`, use `research/targets/` as durable context when useful,
allow fresh web verification, and keep internal data-maintenance mechanics out
of the user-facing artifact.

## Scope

- In scope:
  - Add an independent `skills/aifi-daily-report` entry point.
  - Define an AIFi-adapted daily report structure based on the referenced US
    stock daily report.
  - Require direct self-contained HTML output with charts and tables.
  - Add a polished sample output.
  - Document the new research output location.
  - Validate the sample report locally and by browser screenshot.
- Out of scope:
  - Building a full scheduler or live data ingestion runner.
  - Replacing existing target research skills.
  - Sending external messages or emails.

## Context

- Relevant docs:
  - `docs/REPO_COLLAB_GUIDE.md`
  - `docs/ARCHITECTURE.md`
  - `docs/design-docs/core-beliefs.md`
  - `docs/PLANS_GUIDE.md`
  - `docs/HISTORY_GUIDE.md`
  - `docs/QUALITY_SCORE.md`
- Relevant paths:
  - `skills/`
  - `research/`
  - `research/targets/`
- Constraints:
  - Final daily report artifact should be HTML, not Markdown.
  - Final report should be stored in this repository, not Obsidian.
  - Daily report assembly can use both durable `research/targets/` context and
    newly verified web data.
  - The final report should hide repository mechanics and focus on market
    analysis quality.

## Risks

- Risk: A report artifact could expose AIFi internals instead of reading like a
  real market note.
- Mitigation: Put a reader-experience quality gate in the skill reference.

- Risk: Future agents may bypass the template and produce ad hoc Markdown.
- Mitigation: Put the output contract, trigger phrases, and exact report path
  in `skills/aifi-daily-report/SKILL.md`.

## Milestones

1. Discovery and design alignment.
2. Implement skill and references.
3. Generate a sample report.
4. Validate CLI checks and browser rendering.
5. Record history and completion evidence.

## Validation

- Commands:
  - `bash scripts/check-skills.sh`
  - `bash scripts/ci.sh`
- Manual checks:
  - Open the generated HTML in OBU.
  - Capture screenshots at desktop and narrow widths.
  - Inspect for clipped text, overlapping sections, unreadable charts, and
    missing source labels.

## Progress Log

- [x] Confirmed repository rules and current research archive layout.
- [x] Compared the referenced daily report skill against AIFi requirements.
- [x] Implement the AIFi daily report skill and references.
- [x] Generate and inspect a sample HTML report.
- [x] Run repository checks and record a history entry.

## Decision Log

- 2026-05-25: Store generated daily reports under `research/daily-reports/`
  because they are reusable research artifacts assembled from archived evidence.
- 2026-05-25: Remove dependency on the retired notification-log archive; daily
  report assembly now scans only `research/targets/*` profile, index, evidence,
  and artifact files.
- 2026-05-25: Remove the generator script entirely. Daily reports are agent
  authored HTML artifacts so the report can use fresh web verification, durable
  AIFi context, and custom chart/table layout without exposing implementation
  details to the reader.
- 2026-05-25: Use the user-facing filename pattern
  `research/daily-reports/YYYY/MM/美股收盘日报-YYYY-MM-DD.html`.
- 2026-05-25: Tighten the template toward chart/table-first composition:
  every major section should lead with a visual, table, matrix, timeline, or
  scorecard, with text used for conclusions and interpretation.
- 2026-05-25: Adopt the repository's `chart-visualization` guidance for daily
  reports. Tables are required but insufficient on their own; complete reports
  should include real chart families such as line/area charts for time-series
  paths and Sankey/flow diagrams for market rotation when the evidence supports
  them.
- 2026-05-25: Raise the standard again after reviewing
  `skills/chart-visualization/references/html-examples/`: daily reports should
  be understandable at two reading depths, with beginner-safe market-state
  cards and professional chart families for macro, breadth, technical,
  watchlist, rotation, and risk analysis.

## Completion Evidence

- Generated sample report:
  `research/daily-reports/2026/05/美股收盘日报-2026-05-22.html`.
- OBU desktop check: 1550px viewport, 16 sections, 17 tables, 10 SVG charts, no
  internal AIFi/process wording in report text, no page-level horizontal
  overflow.
- OBU mobile check: 390px viewport, 16 sections, no page-level horizontal
  overflow; wide tables and complex SVG charts are intentionally scrollable
  inside their own containers.
- Latest visual-density check: 16 sections, 17 tables, 10 SVG charts, 18
  non-table visual modules, no page-level overflow on desktop or mobile.
- Latest chart QA: added or retained line/area, horizontal bar, macro/rates
  dashboard, breadth gauge, technical rail chart, treemap, calendar heatmap,
  evidence funnel, Sankey/flow, watchlist bubble chart, decision tree, and risk
  distribution/stress chart patterns. Desktop long screenshots read as a
  chart-led report; mobile screenshots remain readable after moving complex
  SVGs into horizontally scrollable chart cards.
- Commands passed:
  - `bash scripts/check-skills.sh`
  - `bash scripts/ci.sh`
