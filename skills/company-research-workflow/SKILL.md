---
name: company-research-workflow
description: Orchestrate a full AIFi company research workflow from a user request such as "understand Intel recently" into target resolution, evidence archiving, news, filings, earnings, financials, market signals, competitive landscape, and investment thesis synthesis. Use when multiple AIFi research skills must be combined into one application-like workflow.
---

# Company Research Workflow

Use this skill when the user asks for a complete company-level investment
research run. It composes narrower skills and keeps the persistent archive as
the shared memory layer.

## Workflow

1. Run `research-target-resolver`.
2. Run `research-evidence-archive` to create or load the target archive.
3. Decide which collection skills are needed for the user's question.
4. Run independent collection skills in parallel when possible:
   `company-news-research`, `company-filing-research`,
   `earnings-call-analysis`, `financial-snapshot-analysis`,
   `market-signal-analysis`, `competitive-landscape-analysis`, and
   `valuation-scenario-analysis` when valuation, margin of safety, or
   price-implied expectations matter.
5. Save all source notes and raw files through `research-evidence-archive`.
6. Run `investment-thesis-synthesis` only after evidence coverage is visible.
7. Return the final artifact paths, major findings, gaps, and suggested next
   research runs.

Read `references/intel-example-workflow.md` for the default Intel-like scenario.

## Skill Selection

- User asks "what happened recently": prioritize target, archive, news, filings,
  earnings, market, then thesis.
- User asks "is the business improving": prioritize filings, earnings,
  financials, competitors, then thesis.
- User asks "why did the stock move": prioritize news, earnings, market, then
  filings if the event is disclosure-driven.
- User asks "how does it compare": prioritize target, financials, competitors,
  market, then thesis.
- User asks "what is it worth" or "is it priced in": prioritize target,
  financials, filings, peers, market, valuation scenarios, then thesis.

## Output

Return:

- skills executed
- archive paths touched
- evidence coverage table
- valuation scenario path when created
- final memo or decision-frame path
- unresolved gaps
- recommended follow-up skills

## Quality Gate

Before finishing:

- do not synthesize before evidence coverage is known
- store reusable materials in `research/` instead of leaving them only in chat
- label current-data retrieval failures
- keep user-facing conclusions tied to archived evidence
- avoid autonomous trading, broker actions, or certainty about future returns
