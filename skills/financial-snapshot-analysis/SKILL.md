---
name: financial-snapshot-analysis
description: Build a sourced financial snapshot for an investment target, covering revenue, margins, cash flow, balance sheet, valuation, guidance, revisions, and trend quality. Use when analyzing financial statements, earnings metrics, valuation multiples, or whether company fundamentals are improving or deteriorating.
---

# Financial Snapshot Analysis

Use this skill to turn filings, earnings releases, and market data into a
compact financial view. It should produce reusable tables and identify metric
gaps, not make a standalone buy or sell call.

## Workflow

1. Load the target profile and existing financial evidence.
2. Collect recent annual, quarterly, and trailing-twelve-month metrics.
3. Separate reported, adjusted, consensus, and estimated numbers.
4. Compute basic trends only when inputs are clear.
5. Compare metrics against peer or historical ranges when available.
6. Save the snapshot under `research/targets/<target>/evidence/market/` or
   `research/targets/<target>/evidence/filings/` depending on source.
7. Hand off key metric deltas to thesis and risk skills.

Read `references/metric-map.md` before deciding which metrics to collect.

## Output

Return:

- metric table with period labels and sources
- trend summary across revenue, margin, cash flow, capex, debt, and valuation
- guidance and consensus notes, clearly labeled
- data-quality gaps and stale metrics
- peer or historical comparison notes
- archive files created or updated

## Quality Gate

Before finishing:

- state the currency and period for every major metric
- do not mix GAAP, non-GAAP, and estimated values without labels
- include source links or archive paths for material numbers
- avoid precision that source data does not support
- label stale market prices, multiples, and analyst estimates
