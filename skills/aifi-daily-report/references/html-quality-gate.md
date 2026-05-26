# AIFi Daily Report HTML Quality Gate

Run this checklist before returning an AIFi daily report.

## Data Integrity

- The session date is correct and visible.
- Important numbers have source links or source labels.
- Fresh market data and durable AIFi research context are not confused.
- Missing values are labeled as `暂无可靠数据`.
- Inferences are clearly separated from verified facts.
- The report includes a non-advisory posture.

## Reader Experience

- The report reads as a market note for the user, not as an explanation of the
  repository, skills, scripts, archive paths, or data maintenance process.
- The first viewport contains the title, session date, headline summary, and
  high-signal market cards.
- Section headings match the 15-section daily report structure.
- Tables are concise enough to scan and cover the most important facts.
- Each major section starts with a visual, table, or timeline. Long text-only
  blocks should be converted into a table, matrix, scorecard, or chart.
- The report contains enough structure to feel visual: normally at least 10
  tables and 10 non-table visual modules.
- The visual set is not just tables and KPI cards. Include at least five real
  chart families when the data supports them, such as line / area, bar,
  heatmap, macro/rates dashboard, Sankey / flow, waterfall, scatter / bubble,
  treemap, calendar heatmap, distribution / stress, or decision tree.
- The report works at two reading depths: a beginner can understand market
  direction from chart captions and state cards, while an experienced investor
  can quickly find confirmation signals, invalidation points, and data gaps.
- When a section feels dry or table-only, check
  `skills/chart-visualization/references/html-examples/` and adapt the closest
  chart family before returning the report.
- Sankey / flow diagrams clearly label whether values are exact flows or
  qualitative relative-strength widths.
- Charts support the analysis instead of decorating the page.
- Source links are visible near the relevant sections or in a source appendix.

## Visual Integrity

- The HTML opens locally without a build step or network access.
- The page does not accidentally overflow horizontally on desktop or mobile.
- Wide tables scroll inside their table containers on narrow screens.
- Text does not overlap or clip.
- Chart labels include units or make the measurement obvious.
- Colors remain readable and do not rely only on hue.

## Validation

Minimum validation:

```sh
bash scripts/check-skills.sh
```

For report artifacts, open the HTML in a browser and capture desktop and
narrow-width screenshots. Fix layout issues before returning the report path.
