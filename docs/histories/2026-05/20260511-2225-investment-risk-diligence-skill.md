## [2026-05-11 22:25] | Task: Add investment risk diligence skill

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Review the repository skills from a professional investor's perspective,
> supplement missing skills as needed, and commit and push each added skill in
> small increments.

### Changes Overview

- Area: Investment research skills.
- Key actions:
  - Added `skills/investment-risk-diligence` for evidence-backed downside and
    thesis-breaking risk review.
  - Added a risk diligence checklist covering business, competition, financial
    quality, accounting, liquidity, governance, legal, regulatory, macro,
    execution, and market-positioning risks.
  - Connected risk diligence to the company research workflow, skill
    composition map, and thesis evidence coverage.

### Design Intent

Professional investment research needs risk work before final synthesis, not
only a generic risk table after the thesis is already formed. This skill creates
a reusable diligence layer that asks what can break the thesis and what evidence
would confirm or reduce each material risk.

### Files Modified

- `skills/investment-risk-diligence/SKILL.md`
- `skills/investment-risk-diligence/references/risk-diligence-checklist.md`
- `skills/investment-risk-diligence/agents/openai.yaml`
- `skills/company-research-workflow/SKILL.md`
- `skills/investment-thesis-synthesis/references/thesis-frame-template.md`
- `docs/design-docs/aifi-skill-composition.md`
- `docs/histories/2026-05/20260511-2225-investment-risk-diligence-skill.md`
