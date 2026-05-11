---
name: investment-risk-diligence
description: Investigate downside risks and thesis-breaking evidence for an investment target. Use for accounting quality, governance, legal or regulatory exposure, financing risk, customer concentration, cyclicality, dilution, operational execution, geopolitical risk, and risk-register updates before thesis synthesis.
---

# Investment Risk Diligence

Use this skill to pressure-test an investment case before synthesis. It should
look for ways the thesis can fail, not merely restate generic risk factors.

## Inputs

- `ResearchTarget` from `research-target-resolver`
- filings, earnings notes, financial snapshot, news digest, market signals, and
  competitive analysis where available
- known bull, base, or bear claims that need pressure testing
- user portfolio constraints when the risk question is portfolio-specific

## Workflow

1. Load the target profile, existing evidence, and any draft thesis claims.
2. Build a risk inventory across business, financial, accounting, governance,
   legal, regulatory, macro, market-structure, and execution categories.
3. Prioritize risks by evidence strength, severity, time horizon, and ability to
   break the current thesis.
4. Compare company-disclosed risk factors with recent events, financial trends,
   and market behavior to find new or underweighted risks.
5. Identify leading indicators, catalysts, and evidence that would reduce or
   intensify each material risk.
6. Save the diligence note under
   `research/targets/<target>/evidence/risks/`.
7. Hand off material risks, contradictions, and watch items to valuation and
   thesis synthesis.

Read `references/risk-diligence-checklist.md` before writing the risk note.

## Output

Return:

- prioritized risk register
- thesis-breaking questions
- accounting, governance, legal, regulatory, and financing flags
- concentration, cyclicality, and execution risks
- watch indicators and source-monitoring plan
- evidence gaps and unavailable sources
- archive files created or updated
- handoffs to valuation, thesis, and watchlist artifacts

## Quality Gate

Before finishing:

- distinguish disclosed generic risks from current, evidence-backed risks
- include at least one thesis-breaking question when a thesis exists
- label probability and impact as estimates unless sourced
- avoid overstating risk from a single weak signal
- preserve source dates, reporting periods, and event timing
- state which risk areas were not assessable from available evidence
