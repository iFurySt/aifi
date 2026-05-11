## [2026-05-11 22:27] | Task: Add portfolio exposure review skill

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Review the repository skills from a professional investor's perspective,
> supplement missing skills as needed, and commit and push each added skill in
> small increments.

### Changes Overview

- Area: Investment research skills and architecture docs.
- Key actions:
  - Added `skills/portfolio-exposure-review` for portfolio fit, sizing context,
    concentration, liquidity, correlation, drawdown, and watchlist review.
  - Added a portfolio review framework with modes, required inputs, exposure
    dimensions, review template, sizing discipline, and watch triggers.
  - Connected portfolio review to the company research workflow, skill
    composition map, and architecture domain objects.

### Design Intent

Single-name research is incomplete for a professional investor unless it can be
connected to portfolio constraints. This skill frames allocation context and
exposure risks while preserving user control and avoiding autonomous trading
instructions.

### Files Modified

- `skills/portfolio-exposure-review/SKILL.md`
- `skills/portfolio-exposure-review/references/portfolio-review-framework.md`
- `skills/portfolio-exposure-review/agents/openai.yaml`
- `skills/company-research-workflow/SKILL.md`
- `docs/design-docs/aifi-skill-composition.md`
- `docs/ARCHITECTURE.md`
- `docs/histories/2026-05/20260511-2227-portfolio-exposure-review-skill.md`
