## [2026-05-11 17:50] | Task: Remove template security and contribution leftovers

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `local workspace`

### User Query

> Update Contributing and Security because they still read like template files.
> Remove remaining unused supply-chain CI pieces.

### Changes Overview

- Area: repository policy docs, issue templates, local checks.
- Key actions:
  - Rewrote `CONTRIBUTING.md` around AIFi skills, research evidence, and
    source-preserving workflows.
  - Rewrote root `SECURITY.md` and expanded `docs/SECURITY.md` for the current
    docs-and-research repository shape.
  - Removed the standalone supply-chain security document and its required-doc
    check because there is no dependency graph or supply-chain workflow.
  - Removed the unused template initialization script and Makefile target.
  - Updated issue templates and repository routing docs to stop referring to
    template/default workflow behavior.

### Design Intent

Keep security and contribution guidance specific to AIFi's current operating
surface: skills, docs, scripts, and research artifacts. Avoid carrying unused
template automation or standalone supply-chain policy until the repository has
real application dependencies, runtime code, and release artifacts.

### Files Modified

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/workflows/ci.yml`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `Makefile`
- `SECURITY.md`
- `docs/CICD.md`
- `docs/QUALITY_SCORE.md`
- `docs/REPO_COLLAB_GUIDE.md`
- `docs/SECURITY.md`
- `scripts/check-docs.sh`
- `scripts/ci.sh`
