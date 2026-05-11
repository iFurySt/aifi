## [2026-05-11 17:40] | Task: Slim CI/CD for skills-driven repository

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `local workspace`

### User Query

> Review GitHub CI/CD and remove unused template-era pieces for a repository
> that is now primarily skills-driven. Also remove Markdown linting from CI.

### Changes Overview

- Area: GitHub Actions, repository scripts, CI/CD documentation.
- Key actions:
  - Removed template release and supply-chain workflows that had no real
    application build, dependency graph, release artifact, or deployment target.
  - Removed markdownlint from CI and deleted the markdownlint config.
  - Added a lightweight skills entry-point check to keep `skills/*/SKILL.md`
    present and legible.
  - Updated CI/CD and supply-chain docs to describe the current minimal posture
    and the conditions for reintroducing dependency scanning, SBOMs, provenance,
    and release packaging.

### Design Intent

Keep CI focused on checks that matter for the current AIFi shape: repository
legibility, script validity, pinned Actions, and skills entry points. Defer
release packaging, dependency scanning, SBOM generation, and provenance until
the repository has real dependencies and versioned build artifacts. Markdown
style linting is intentionally excluded because the repo stores skill
instructions and raw research evidence where source URLs and evidence formats
should not be blocked by style-only rules.

### Files Modified

- `.github/workflows/ci.yml`
- `Makefile`
- `docs/CICD.md`
- `docs/RELIABILITY.md`
- `docs/REPO_COLLAB_GUIDE.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `scripts/check-repo-hygiene.sh`
- `scripts/check-skills.sh`
- `scripts/ci.sh`
- `skills/research-target-resolver/references/research-target-schema.md`
