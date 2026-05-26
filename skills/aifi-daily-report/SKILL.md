---
name: aifi-daily-report
description: Generate a user-facing Chinese US stock market closing daily report as a polished self-contained HTML file under research/daily-reports/. Use when the user asks for "美股日报", "美股收盘日报", "AIFi日报", "每日研究日报", "US stock daily report", "昨夜美股", "美股复盘", "今天研究汇总", or when a scheduled daily AIFi agent run needs the final daily report. Use research/targets as durable context, but freely verify fresh market data with authoritative web sources before writing the report.
---

# AIFi Daily Report

Use this skill to produce the final daily report the user reads. The report is
a polished investment research artifact, not a log of how AIFi maintains data.
Do not expose archive mechanics, skill names, or repository maintenance details
inside the report unless the user explicitly asks for provenance diagnostics.

## Output Contract

1. Language: Chinese, professional, concise, data-driven.
2. Format: one self-contained HTML file led by tables and compact charts, with
   short text used only for key conclusions and interpretation.
3. File path:

   ```text
   research/daily-reports/YYYY/MM/美股收盘日报-YYYY-MM-DD.html
   ```

   `YYYY-MM-DD` is the US trading session date being reviewed.
4. The first viewport should read like a real market note: title, session date,
   3-5 sentence headline summary, and key market cards. It should not explain
   AIFi internals.
5. End-of-turn response: one line with the saved file path and a 2-3 sentence
   headline summary. Do not paste the full report.

## Data Sourcing

- Resolve the correct US session date first. On Beijing mornings, the latest
  completed US session is usually the prior US calendar day.
- Use `research/targets/*` as durable AIFi context for tracked companies,
  open questions, earnings history, filings, and recurring watchlists.
- Use web search / fetch for fresh market data, macro data, breadth, sector
  moves, earnings calendars, and newly reported company news. Prefer primary
  or market-standard sources: company IR, SEC, Nasdaq, NYSE, CME FedWatch,
  Treasury, FRED, EIA, Yahoo Finance, CNBC, Reuters, Bloomberg, MarketWatch,
  WSJ, Barchart, Finviz, TradingView, Koyfin, FactSet.
- If fresh research materially improves a tracked target, update
  `research/targets/<target>/` before composing the final report.
- Never fabricate numbers. If a value cannot be verified, write
  `暂无可靠数据` in the report.
- Cite important numbers and claims with visible source links or source labels.

## Report Structure

Follow `references/aifi-daily-report-template.md`. Keep the same market-facing
15-section shape as the referenced `us-stock-daily-report` skill, adapted for
HTML and AIFi's durable watchlist context.

## HTML Requirements

- Build the final HTML directly as the report artifact. Do not require a repo
  generator script.
- Keep CSS inline so the file opens locally without a build step or network.
- Use compact, readable visuals as the main structure: KPI cards, ranked bars,
  sparkline-like SVGs, heat strips, scorecards, risk matrices, rotation maps,
  earnings calendars, watchlist tables, and responsive tables.
- Use `skills/chart-visualization/references/html-examples/` as the visual
  reference library when the report feels table-heavy. Prefer adapting its
  investment patterns over inventing text-only sections.
- Use real chart families where they fit the analysis: line / area charts for
  time series, horizontal bars for ranking, heatmaps for sector breadth, Sankey
  or alluvial-style flow charts for rotation and source-of-move analysis,
  macro/rates dashboards for policy context, treemaps for theme weight,
  scatter/bubble charts for watchlist positioning, decision trees for next-day
  observation logic, distribution/stress charts for risk, matrices for
  confirmation states, and timelines for intraday tape.
- Every major section should start with a table or chart unless a timeline is
  the more natural visual. Avoid long standalone prose blocks.
- A complete report should usually include at least 10 tables, 10 non-table
  visual modules, and 5 true chart families. It should include at least one
  time-series style chart and one flow / Sankey-style visual when the session
  narrative involves rotation. Visual modules can be KPI strips, heatmaps,
  ranked bars, timelines, matrices, scorecards, mini charts, flow diagrams,
  source cards, bubble charts, calendar heatmaps, and decision trees.
- Design for two reading depths: a beginner should understand the market state
  from the first screen and chart captions; an experienced investor should find
  the key confirmation, invalidation, and data-gap signals without reading long
  prose.
- Use report content, not process labels, in chart titles and cards.
- Wide tables may scroll inside their own containers on mobile; the page itself
  should not create accidental horizontal overflow.

## Quality Gate

Before finishing:

1. Read `references/html-quality-gate.md`.
2. Open the generated HTML in a browser.
3. Inspect desktop and narrow widths for clipped text, overlapping content,
   unreadable charts, and source-link visibility.
4. Run repository checks that are relevant to the change, at minimum
   `bash scripts/check-skills.sh`.

## Output

Return:

- report path
- session date
- key headline summary
- validation performed
- any material data gaps that remain in the report
