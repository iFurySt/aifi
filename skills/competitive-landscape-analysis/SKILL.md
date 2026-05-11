---
name: competitive-landscape-analysis
description: Analyze a company's competitive landscape, peer set, industry structure, product positioning, customer overlap, margin differences, strategic advantages, and substitution risks. Use for peer comparison and sector context in AIFi investment research, especially when a target like Intel must be compared with AMD, Nvidia, TSMC, Broadcom, or other competitors.
---

# Competitive Landscape Analysis

Use this skill to explain what the target is competing against and where its
position is strengthening or weakening. Keep peer selection explicit; bad peer
sets produce misleading conclusions.

## Workflow

1. Load the target profile and peer set.
2. Validate peers by business segment, customer problem, geography, and investor
   comparability.
3. Compare product position, growth, margins, capital intensity, strategy, and
   valuation where data is available.
4. Identify substitutes and ecosystem dependencies, not only direct public peers.
5. Save the comparison under
   `research/targets/<target>/evidence/competitors/`.
6. Hand off durable advantages, threats, and open questions to thesis and risk
   skills.

Read `references/peer-comparison-framework.md` before building the comparison.

## Output

Return:

- peer set and rationale
- direct competitors, substitutes, suppliers, and customers where relevant
- comparison table
- target strengths and weaknesses
- market-structure notes
- archive files created or updated
- thesis and risk handoffs

## Quality Gate

Before finishing:

- explain why each peer belongs in the comparison
- avoid comparing unrelated multiples without business-model context
- separate current evidence from strategic speculation
- mark missing private-company or segment data
- preserve a list of excluded peers when exclusion affects interpretation
