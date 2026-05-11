---
name: portfolio-exposure-review
description: Review how an investment target or watchlist idea fits within a portfolio, including position sizing context, concentration, factor and sector exposure, liquidity, correlation, drawdown contribution, risk budget, and rebalance watch items. Use when the user asks whether to size, add, trim, hold, or monitor an idea in portfolio context.
---

# Portfolio Exposure Review

Use this skill after single-name evidence and thesis work when the question is
about portfolio fit. It does not execute trades or prescribe an order; it frames
position-level risks, constraints, and watch items for the user.

## Inputs

- target thesis, valuation scenario, market signals, and risk diligence where
  available
- current or proposed position size if the user provides it
- portfolio holdings, sector weights, factor exposures, cash, liquidity needs,
  or risk limits when available
- benchmark, mandate, time horizon, and tax or restriction context when relevant

## Workflow

1. Load the target archive and any supplied portfolio context.
2. Identify whether the task is about a new idea, existing holding, watchlist
   candidate, trim/add decision, or portfolio-level risk review.
3. Map exposures by issuer, sector, industry, geography, currency, factor,
   customer/supplier dependency, and catalyst overlap.
4. Review position sizing context: concentration, liquidity, drawdown
   contribution, conviction, valuation range, risk severity, and time horizon.
5. Identify correlated risks and duplicate bets across holdings or watchlist
   names.
6. Produce user-controlled options such as watch, research more, add to
   watchlist, size smaller, rebalance candidate, or revisit after catalyst.
7. Save the review under
   `research/targets/<target>/artifacts/portfolio-reviews/` or a portfolio
   archive when one exists.

Read `references/portfolio-review-framework.md` before writing the review.

## Output

Return:

- portfolio context used and missing context
- exposure map and concentration notes
- sizing considerations, not an autonomous trade instruction
- liquidity, correlation, drawdown, and catalyst-overlap risks
- fit with thesis, valuation, and risk evidence
- user-controlled options and watch triggers
- archive files created or updated

## Quality Gate

Before finishing:

- state whether actual portfolio holdings were available or assumed absent
- do not recommend or execute trades
- distinguish target-specific risk from portfolio-level exposure
- label stale or missing prices, weights, liquidity, and benchmark data
- avoid precise sizing math without complete portfolio inputs
- preserve user control over any allocation decision
