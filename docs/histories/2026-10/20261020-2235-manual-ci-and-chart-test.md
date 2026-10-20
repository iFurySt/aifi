## [2026-10-20 22:35] | Task: Repair repeated CI failures and make hosted checks opt-in

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> GitHub CI keeps failing. Fix it; automatic CI may not be needed at this stage.

### Findings

- The latest six hosted runs failed after chart comparison was introduced.
- The latest failed run, `39438704471`, passed 166 tests and failed only the
  StockChart static-render volume test: Compare's directory hook lacked a provider.
  The failure was reproduced in an isolated committed-source snapshot. The old
  session-count text assertion also referred to copy removed from the toolbar.

### Changes Overview

- Changed the workflow to `workflow_dispatch` only: push and pull_request no
  longer launch hosted checks. Retained SHA-pinned actions, read-only permissions,
  the full check command and all local checks through `make ci`.
- Used the focused existing fixture repair to isolate Compare in the volume unit
  test and assert stored date coverage instead of removed explanatory text.
  Preserved assertions for every volume bar, the peak and non-NaN output.
- Updated CI documentation and the collaboration guide to the manual-hosted policy.

### Design Intent

Stop unattended workflow runs during early development while retaining meaningful,
usable checks and fixing the underlying regression rather than hiding a failure.

### Verification

- Full `make ci` passed in an isolated snapshot of exactly the scoped commit:
  docs/hygiene/skills/action pinning and syntax, TypeScript, all 167 tests,
  Web/Electron builds, Go formatting/vet/race tests and CGO-disabled CLI build.
- Parsed the workflow YAML and confirmed its sole event is workflow_dispatch and
  repository permissions remain contents: read.

### Files Modified

- `.github/workflows/ci.yml`
- `packages/ui/src/components/StockChart.test.tsx`
- `docs/CICD.md`
- `docs/REPO_COLLAB_GUIDE.md`
