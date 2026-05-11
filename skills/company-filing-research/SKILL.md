---
name: company-filing-research
description: Collect, read, and summarize company filings and formal disclosures for investment research. Use for SEC filings, annual reports, 10-K, 10-Q, 8-K, proxies, risk factors, management discussion, regulatory notices, and disclosure-change analysis.
---

# Company Filing Research

Use this skill for the primary-disclosure layer of an AIFi memo. It should
extract what the company formally reported, what changed from prior disclosures,
and which parts need follow-up from financial, news, or risk skills.

## Workflow

1. Load the `ResearchTarget` and existing filing archive.
2. Identify relevant filing systems for the issuer's market.
3. Collect recent filings for the requested period.
4. Prioritize filings by research question: 10-K/annual report, 10-Q/interim
   report, 8-K/current report, proxy, registration statement, investor
   presentation, or local-market equivalent.
5. Extract material sections and preserve source links or raw files.
6. Compare against prior filings when change detection matters.
7. Save summaries under `research/targets/<target>/evidence/filings/`.

Read `references/filing-review-checklist.md` before summarizing filings.

## Output

Return:

- filing inventory with dates and source links
- key disclosure changes
- business and segment updates
- risk-factor changes
- accounting, liquidity, debt, litigation, or going-concern flags
- handoffs to financials, earnings, news, and risk skills
- archive files created or updated

## Quality Gate

Before finishing:

- state which filings were reviewed and which were unavailable
- distinguish company disclosure from agent interpretation
- preserve exact filing dates and periods covered
- label excerpts from old filings as background
- avoid copying long copyrighted passages into generated memos
