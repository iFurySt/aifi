# Supply Chain Security

This document defines the current supply-chain posture for AIFi while it is a
skills-driven research repository without application dependencies or release
artifacts.

## Current Controls

- GitHub Actions pinned to immutable commit SHAs instead of floating tags.
- CI fails when workflow actions are not pinned.
- Dependency, SBOM, and provenance controls are documented here, but not wired
  into GitHub Actions until the repository has real manifests and artifacts.

## Current Workflow Mapping

- `scripts/check-action-pinning.sh`: fails CI if workflow actions are referenced by floating tags instead of immutable SHAs.

## Limits And Assumptions

- Dependency Review is useful after the project has committed dependency
  manifests and lockfiles.
- OSV and SBOM quality depend on the project checking in recognizable manifests
  or lockfiles.
- Provenance is only meaningful once the project has a real build output.
- OpenSSF Scorecard is intentionally not enabled by default because a new template repository has no real branch protection, release history, or SAST posture to score. Add it back after repository rules are configured.

## What To Do When The Project Becomes Real

- Add ecosystem-specific lockfiles and keep them committed.
- Add dependency review and vulnerability scanning for the chosen ecosystems.
- Make the build deterministic and produce explicit versioned artifacts.
- Generate an SBOM for release artifacts.
- Attest build provenance for published release artifacts.
- Gate production deployment on release artifact provenance verification when possible.
- Consider verifying attestations in the deployment environment or cluster admission layer.
