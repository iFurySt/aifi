## [2026-05-11 15:11] | Task: Dogfood AIFi skills on Intel

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Use the newly created AIFi skills together on Intel as an example. Produce a
> solid analysis of why Intel recently surged and how to think about Intel as an
> asset allocation candidate, without empty narrative.

### Changes Overview

- Area: Research archive dogfood run.
- Key actions:
  - Ran the company research workflow conceptually across target resolution,
    evidence archive, news, filing, earnings, financial, market signal,
    competitive landscape, and thesis synthesis layers.
  - Created the first persistent Intel research archive under
    `research/targets/intc/`.
  - Stored sourced evidence notes and a decision-frame artifact for future reuse.

### Design Intent

This change tests the skill set against a real investment research question and
creates reusable Intel materials in the repository-local archive. The output
separates confirmed operating improvement from market optionality around Apple,
Terafab, 18A/14A, and foundry strategy.

### Files Modified

- `research/targets/intc/profile.md`
- `research/targets/intc/index.md`
- `research/targets/intc/evidence/news/2026-05-11-news-digest.md`
- `research/targets/intc/evidence/filings/2026-05-11-filing-review.md`
- `research/targets/intc/evidence/earnings/2026-05-11-earnings-call.md`
- `research/targets/intc/evidence/market/2026-05-11-financial-snapshot.md`
- `research/targets/intc/evidence/market/2026-05-11-market-signal-note.md`
- `research/targets/intc/evidence/competitors/2026-05-11-competitive-landscape.md`
- `research/targets/intc/artifacts/decision-frames/2026-05-11-thesis-frame.md`
