# AIFi Daily Report Template

This is the required content structure for AIFi's user-facing HTML daily report.
It follows the `us-stock-daily-report` outline, but the finished artifact should
look like a market report, not a repository status page.

## Composition Principle

The report should be chart/table-first. Use short text to explain the
implication of a visual, not to replace the visual. A strong daily report
usually contains:

- first-viewport KPI strip
- first-viewport market-state map that explains the session in beginner-safe
  language without dumbing down the signal
- index performance chart
- at least one line / area chart when there is a time path, weekly trend,
  intraday path, yield move, breadth path, or indexed-performance comparison
- sector heatmap or ranked sector table
- Sankey / alluvial-style flow chart when the report discusses capital
  rotation, source-of-move, or AI supply-chain flow
- macro/rates dashboard when rates, Fed expectations, PMI, inflation, or dollar
  moves matter
- treemap or composition view when several themes compete for attention
- scatter / bubble chart when watchlist names need to be positioned by
  confirmation, risk, or urgency
- distribution / stress chart when the conclusion depends on tail risk,
  volatility, or overheat
- decision tree or flow diagram when the next-session plan depends on a small
  number of conditional signals
- macro dashboard table
- breadth / participation table
- technical levels table
- stock mover tables by group
- earnings calendar table
- rotation matrix
- watchlist table
- risk matrix
- source appendix

Avoid long narrative-only sections. If a section has more than two paragraphs,
add or replace content with a table, scorecard, timeline, or compact chart.
Do not let tables be the only visual language. A polished report should mix
tables with at least five true chart families such as line, area, bar, heatmap,
macro/rates dashboard, Sankey / flow, waterfall, scatter, bubble, treemap,
calendar heatmap, distribution, stress, or decision tree. When building HTML,
adapt the closest reference from
`skills/chart-visualization/references/html-examples/` before settling for a
table-only section.

## 0. 今日一句话总结

Use 4-6 cards or bullets covering:

- index direction and breadth
- main drivers
- risk-on / risk-off tone
- dominant theme or rotation
- one clear market state label

## 1. 大盘表现总览

Include a table for Dow Jones, S&P 500, Nasdaq Composite, Nasdaq 100 / QQQ,
Russell 2000 / IWM, SOX / SMH, and VIX when data is available.

Recommended HTML visuals:

- KPI cards for the most important index moves
- a horizontal bar chart comparing daily index returns
- a line chart for intraday path, weekly indexed trend, or risk appetite path
- a short note on index leadership and breadth

## 2. 盘中走势复盘

Use a timeline: premarket, open, midday, close, after-hours. Explain market
drivers such as rates, earnings, AI, macro data, geopolitical news, and whether
the tape showed buy-the-dip, sell-the-news, short squeeze, or rotation.
Pair the timeline with a small driver table when possible.

## 3. 宏观环境

Cover:

- Treasury yields and curve changes
- Fed cut / hike expectations
- dollar, gold, oil, BTC / ETH
- important economic releases

Use tables and compact callouts. State `暂无可靠数据` when a datapoint cannot be
verified.
Use a macro/rates dashboard when the day's story depends on yields, Fed
probabilities, inflation/growth releases, dollar, oil, gold, or crypto.

## 4. 板块表现

Rank S&P 500 sectors or sector ETFs. Include the strongest / weakest sectors,
growth versus value, cyclical versus defensive tone, and whether AI-related
capital moved into software, power, networking, or industrials.
Use a heatmap or ranked bar view in addition to the table when data allows.

## 5. 主题与风格表现

Cover relevant themes such as:

- semiconductors and AI hardware
- software / SaaS / AI applications
- cybersecurity and cloud
- data centers, power, utilities, nuclear / SMR, grid equipment
- small caps, equal-weight indices, growth versus value

AIFi tracked targets under `research/targets` can inform the watchlist and
interpretation, but the final report should describe the market theme directly.
Use a theme scorecard that shows direction, conviction, catalyst, and evidence
quality.
Use a treemap or composition visual when multiple themes share the same
headline story, for example AI hardware, AI power, small caps, and software.

## 6. 市场宽度与参与度

Use breadth data when available:

- percentage above moving averages
- advancers / decliners
- new highs / new lows
- VIX term structure, put/call, MOVE, HY / IG spreads

If exact breadth data is unavailable, separate sourced facts from qualitative
inference.
Use a data-availability table so missing breadth inputs are visible without
turning the section into prose.
Use a gauge / donut / breadth dashboard when participation is part of the
headline, while clearly labeling missing A/D or new-high/new-low inputs.

## 7. 技术面分析

Cover SPY, QQQ, IWM, SMH, IGV, XLK, XLC, XLY where useful:

- current price
- 20 / 50 / 100 / 200 day moving averages
- RSI or momentum
- support and resistance
- breakout / pullback confirmation levels

Prefer a levels table plus a short momentum/overheat scorecard.
Use a rail chart or indexed mini chart when support/resistance proximity is
more important than the raw level table.

## 8. 重点个股新闻与异动

Use subsections:

- 8.1 七巨头
- 8.2 AI 硬件 / 半导体
- 8.3 软件 / SaaS / AI 应用
- 8.4 AI 电力 / 数据中心 / 能源基础设施
- 8.5 其他显著异动

Use `research/targets` for durable target context and web sources for fresh
session moves.
Each subsection should have a mover table. Use text only for the conclusion
under the table.
Use a supply-chain map, bubble chart, or grouped ranking when the section has
several related names and the reader needs to see leadership versus risk at a
glance.

## 9. 财报日历与财报解读

Summarize recently reported earnings and the next 1-3 trading days of important
earnings. Include revenue, EPS, guidance, after-hours reaction, and sector
readthrough when verified.
Use an earnings calendar table even when some values are `暂无可靠数据`.
Pair the table with a calendar heatmap or event strip when upcoming earnings
are important confirmation points.

## 10. 机构观点与资金流

Cover:

- strategist notes and index targets
- analyst rating changes
- ETF flows
- options activity
- buybacks, insider activity, blocks, financing, or strategic investments

Do not invent flows.
If flow data is incomplete, show a data-quality or evidence funnel that
separates verified market facts from unverified ETF / options / block-flow
inputs.

## 11. 板块轮动判断

Pick a clear state, for example:

- AI 硬件主升浪
- 高位震荡
- 利好钝化
- 软件补涨
- 高切低
- 全面 risk-on
- 防御 risk-off
- 宽度扩散
- 指数强内部弱

Explain where money appears to be flowing and what would confirm or invalidate
the rotation.
Use a rotation matrix with rows for source area, destination area, evidence, and
confirmation signal.
When possible, include a Sankey / flow visual showing source areas, destination
areas, and relative flow strength. Label it as qualitative when exact fund-flow
data is not verified.

## 12. 我的重点关注股观察

Use a table with:

- ticker
- daily move
- current trend
- key news
- support
- resistance
- judgment

Default watchlist should include core AI / technology, software, AI interconnect,
and AI power / data center names when relevant.
Add a watchlist positioning chart when names differ by confirmation strength,
risk, urgency, or catalyst proximity.

## 13. 明日交易计划 / 观察清单

Cover:

- macro signals
- index levels
- sector confirmation signals
- 10-20 tickers worth watching and why

Keep wording non-advisory: observation plan, not trading instruction.
Use a decision tree or signal flow so both beginner and experienced readers can
see the order of confirmation signals.

## 14. 风险提示

Use a risk table with dimension, current state, and risk level. Include macro
rates, market breadth, AI crowding, earnings risk, geopolitical risk,
technicals, liquidity, consumer data, credit spreads, and dollar strength when
relevant.
Add a distribution, stress, or tornado chart when risk is central to the
conclusion.

## 15. 最终结论

End with:

- today's market conclusion
- current market stage
- non-advisory operating posture
- top five signals for the next session

## HTML Presentation Checklist

- First viewport: title, date, summary, and important market cards.
- Body: readable section rhythm, tables, and compact charts.
- Source area: visible source list with links.
- No internal AIFi process narration in the report body.
- No marketing copy, decorative-only visuals, or unsourced precision.
