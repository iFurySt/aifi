# CI/CD Guide

CI covers both the research workspace and the local Web/Electron app foundation.

## What Exists By Default

- `ci.yml`: repository checks for docs, hygiene, skill entry points, GitHub
  Action pinning, shell validity, and Python script syntax.
- `scripts/ci.sh`: the local entry point used by GitHub Actions and by
  contributors through `make ci`.
- Go from apps/cli/go.mod, pinned module sums, gofmt/vet/race tests, and a
  CGO-disabled CLI build, including service/scheduler/config contracts through scripts/check-go.sh.
- Node 24 and pinned pnpm dependencies: TypeScript, domain/storage tests, and
  Web/Electron builds with the bundled Go sidecar. Host crypto/transport tests
  use temporary profiles and local HTTP servers without live provider calls.
  CI installs with lifecycle scripts disabled; an Electron launch is a separate
  local smoke check.

## Design Principle

CI protects repository legibility and the runnable local application. There is
no cloud deployment target, signed installer, or automatic release pipeline.

Style-only document checks are intentionally not part of CI. This repository
stores skill instructions, planning docs, and raw research evidence; source URLs
and evidence shapes should not be blocked by formatting rules.

All GitHub Actions in workflows are pinned to commit SHAs. Keep that property
when updating actions.

## Recommended Customization Sequence

1. Keep `ci.yml` as the only always-on repository gate.
2. Extend `scripts/check-skills.sh` when skill metadata or reference structure
   becomes stricter.
3. Keep app checks in `scripts/ci.sh`; add runner verification there when
   research execution arrives.
4. Add dependency scanning for the manifests and lockfile now present.
5. Add release or deployment automation only after the project has a real build
   artifact and target environment.

## Deferred CD

There is no release workflow by default. Add one only when the output is a real
versioned artifact, not a packaged copy of repository metadata.

## Stock Activity Regression

`AIFI_UI_ACTIVITY=1 make ci` additionally runs `pnpm smoke:stock-activity` in a
disposable Electron profile. The combined fixture covers Politicians ranges and
ambiguous records, Insider event exclusions/post-holdings, and Analyst radar/
source-population/target/upside/filter semantics. It checks narrow table overflow
and performs no provider or account requests.
