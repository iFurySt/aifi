# Valuation Framework

Use the lightest model that answers the research question. A model with more
rows is not better if the assumptions are unsupported.

## Method Selection

| Situation | Preferred method | Notes |
| --- | --- | --- |
| Mature profitable company | Multiples plus DCF cross-check | Use normalized earnings or FCF when cyclicality matters. |
| High-growth company | Revenue, gross profit, or FCF scenarios | Make profitability and dilution assumptions explicit. |
| Conglomerate or mixed segments | Sum-of-the-parts | Avoid applying one multiple to unrelated businesses. |
| Financial institution | Book value, earnings power, asset quality | Treat capital ratios and credit risk as core drivers. |
| Commodity or cyclical business | Mid-cycle earnings or NAV | Do not extrapolate peak margins as base case. |
| Binary catalyst | Probability-weighted outcomes | Label probabilities as assumptions unless externally sourced. |

## Assumption Hierarchy

Prefer assumptions in this order:

1. Company disclosed actuals, guidance, backlog, segment data, or capital plans.
2. Consensus estimates and revisions, clearly labeled by source and date.
3. Peer or historical ranges adjusted for business quality and cycle position.
4. Agent assumptions derived from evidence, explicitly marked as assumptions.

## Scenario Template

```markdown
# <Target> Valuation Scenarios - <YYYY-MM-DD>

## Metadata

- Target:
- Prepared:
- Currency:
- Market price timestamp:
- Evidence cutoff:
- Archive path:
- Sources reviewed:

## Method

- Selected method:
- Why it fits:
- Methods rejected:

## Key Inputs

| Input | Value | Source | Date | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |

## Scenario Assumptions

| Driver | Bear | Base | Bull | Evidence or rationale |
| --- | --- | --- | --- | --- |

## Valuation Output

| Scenario | Equity value | Per-share value | Implied upside/downside | Key dependency |
| --- | --- | --- | --- | --- |

## Sensitivity

| Variable | Low | Mid | High | Output impact |
| --- | --- | --- | --- | --- |

## Market-Implied Expectations

- 

## Gaps And Manual Review Items

- 

## Handoffs

- Thesis:
- Risks:
- Watchlist:
```

## Modeling Rules

- Start from enterprise value when capital structure matters; bridge to equity
  value with cash, debt, minority interest, preferred stock, and investments
  where material.
- Match numerator and denominator. Do not apply enterprise-value multiples to
  equity earnings or equity-value multiples to EBITDA.
- Use diluted shares for per-share values unless a different basis is clearly
  needed and labeled.
- Normalize one-off items only when evidence supports the adjustment.
- Keep terminal values, discount rates, and exit multiples within explainable
  ranges; do not hide the whole conclusion in a terminal assumption.
- For DCFs, separate operating assumptions from financing assumptions.
- For multiples, document why the peer or historical range is relevant.
- For sum-of-the-parts, explain intercompany eliminations, shared costs, and
  segment data gaps.

## Sensitivity Checks

At minimum, test the two or three variables most likely to change the conclusion:

- revenue growth or unit volume
- operating margin or gross margin
- reinvestment and capex intensity
- terminal multiple or terminal growth
- discount rate
- share count and dilution
- commodity price, utilization, or pricing cycle where relevant

## Output Discipline

- Use ranges instead of point estimates when inputs are uncertain.
- Round per-share values to avoid fake accuracy.
- Treat upside/downside as a comparison to the market price timestamp, not as a
  forecast.
- If the model depends on stale price or consensus data, say the model is not
  current enough for a decision frame.
