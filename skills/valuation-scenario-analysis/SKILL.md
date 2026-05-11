---
name: valuation-scenario-analysis
description: Build valuation scenarios for an investment target using sourced financial drivers, peer context, and explicit assumptions. Use when the user asks about intrinsic value, target price range, upside/downside, margin of safety, DCF, multiples, sum-of-the-parts, or whether expectations are already priced in.
---

# Valuation Scenario Analysis

Use this skill after the target has a financial snapshot and enough evidence to
support assumptions. The goal is not a single price target; it is a transparent
range of outcomes that shows which drivers matter most and where evidence is
weak.

## Inputs

- `ResearchTarget` from `research-target-resolver`
- financial snapshot with period labels, currency, and source links
- peer comparison or historical multiple context when available
- thesis, risks, or catalysts that affect assumptions
- current market price and timestamp when price-implied return is requested

## Workflow

1. Load the target profile, financial evidence, peer context, and current market
   data if needed.
2. Choose the valuation method that fits the business model and data quality:
   multiples, DCF, sum-of-the-parts, asset value, or probability-weighted event
   analysis.
3. Define the key drivers before calculating outputs: revenue growth, margin,
   capital intensity, reinvestment, terminal assumptions, share count, net debt,
   and segment mix where relevant.
4. Build bear, base, and bull cases with explicit assumptions and evidence
   links.
5. Run sensitivity checks on the few assumptions that most affect value.
6. Compare scenario value ranges with market price only when price data is fresh
   enough for the user's request.
7. Save the model note under
   `research/targets/<target>/artifacts/valuation/`.

Read `references/valuation-framework.md` before building the model.

## Output

Return:

- valuation method and why it fits the target
- assumption table with sources and confidence labels
- bear, base, and bull scenario outputs
- sensitivity table for the most important drivers
- market-implied expectations when current price is used
- data gaps, stale inputs, and assumptions that need manual review
- archive files created or updated
- handoffs to thesis, risk, and watchlist skills

## Quality Gate

Before finishing:

- do not present a target price as a recommendation
- state currency, share count basis, enterprise value adjustments, and data
  timestamps
- separate sourced inputs from agent assumptions
- avoid false precision; round outputs to a level supported by the inputs
- label stale or missing market prices, estimates, and peer multiples
- explain which assumptions drive most of the valuation range
