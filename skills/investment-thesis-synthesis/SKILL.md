---
name: investment-thesis-synthesis
description: Synthesize archived AIFi evidence into an investment thesis, risk register, bull/base/bear scenarios, open questions, watch items, and decision frame. Use after collecting filings, news, earnings, financials, market signals, and competitive context for a target.
---

# Investment Thesis Synthesis

Use this skill at the end of a research workflow. It should transform evidence
into a decision-support artifact while keeping facts, interpretation, and action
options separate.

## Workflow

1. Load the target profile, archive index, and relevant evidence notes.
2. Check source coverage before writing the thesis.
3. Extract high-confidence facts and unresolved contradictions.
4. Build bull, base, and bear cases from evidence.
5. Create a risk register with probability, impact, evidence, and mitigants when
   known.
6. Produce watch items and catalysts that can update the thesis later.
7. Save the artifact under
   `research/targets/<target>/artifacts/decision-frames/` or
   `research/targets/<target>/artifacts/memos/`.

Read `references/thesis-frame-template.md` before writing the final artifact.

## Output

Return:

- evidence coverage summary
- bull, base, and bear cases
- risk register
- open questions
- watchlist triggers
- decision frame with user-controlled options
- archive files created or updated

## Quality Gate

Before finishing:

- every material claim links to evidence or is labeled as inference
- missing evidence is visible in the coverage summary
- facts and interpretation are separated
- no single opaque buy/sell recommendation is presented as truth
- decision language preserves user control and avoids certainty about returns
