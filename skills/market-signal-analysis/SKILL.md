---
name: market-signal-analysis
description: Analyze market-side signals for an investment target, including price action, relative performance, volume, volatility, valuation multiples, short interest, options activity, and event reactions. Use when the user asks how the market is treating a stock or whether recent news is already reflected in price.
---

# Market Signal Analysis

Use this skill to understand market behavior around a target. It should describe
signals and regimes, not pretend that price movement proves future returns.

## Workflow

1. Load the target profile, peer set, and existing market evidence.
2. Collect current market data when the user asks for recent, latest, or current
   conditions.
3. Compare performance across relevant windows: 1D, 5D, 1M, 3M, YTD, 1Y, and
   since major events when useful.
4. Compare against peers, sector ETF, and broad market benchmark.
5. Inspect volume, volatility, drawdown, valuation, short interest, and options
   signals when available.
6. Save a market note under `research/targets/<target>/evidence/market/`.
7. Hand off notable signals to thesis and risk skills.

Read `references/market-signal-checklist.md` before writing a market note.

## Output

Return:

- market data timestamp and source
- absolute and relative performance summary
- event reaction notes
- valuation and sentiment signals
- stale or unavailable data labels
- archive files created or updated
- thesis and risk handoffs

## Quality Gate

Before finishing:

- state market-data timestamps and whether the market was open or closed
- do not mix delayed and real-time data without labels
- compare against a relevant benchmark
- avoid implying causation from price movement alone
- label options, short interest, and sentiment data by source and delay
