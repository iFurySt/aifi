# CI/CD Guide

This repository keeps CI/CD intentionally small while AIFi is still a
skills-driven research workspace rather than a deployable application.

## What Exists By Default

- `ci.yml`: repository checks for docs, hygiene, skill entry points, GitHub
  Action pinning, and shell validity.
- `scripts/ci.sh`: the local entry point used by GitHub Actions and by
  contributors through `make ci`.

## Design Principle

CI should protect repository legibility without pretending there is a real
application build, deploy target, dependency graph, or release artifact.

Style-only document checks are intentionally not part of CI. This repository
stores skill instructions, planning docs, and raw research evidence; source URLs
and evidence shapes should not be blocked by formatting rules.

All GitHub Actions in workflows are pinned to commit SHAs. Keep that property
when updating actions.

## Recommended Customization Sequence

1. Keep `ci.yml` as the only always-on repository gate.
2. Extend `scripts/check-skills.sh` when skill metadata or reference structure
   becomes stricter.
3. Extend `scripts/ci.sh` with project-specific verification once there is a
   runnable package, workflow engine, or app surface.
4. Add dependency scanning only after the repository has real manifests and
   lockfiles.
5. Add release or deployment automation only after the project has a real build
   artifact and target environment.

## Deferred CD

There is no release workflow by default. Add one only when the output is a real
versioned artifact, not a packaged copy of repository metadata.
