## [2026-10-13 13:00] | Task: App-owned data service and settings

### Execution Context

- Agent ID: `root`
- Base Model: `GPT-6`
- Runtime: `Codex desktop`

### User Query

> Start Go with the app, automatically check/collect directory updates in the
> background, allow configurable frequency/API credentials, and build settings
> categories and grouped content like the supplied screenshot.

### Go Service Milestone

- Added SQLite v2 migration for revisioned settings, durable manual requests and
  encrypted credential blobs while preserving the v1 directory.
- Added private bounded stdio RPC, app-lifetime worker, startup due checks,
  configurable 24-hour default, 1–720-hour range, source/automation control,
  wake catch-up and persistent 15/30/60-minute failure backoff.
- Preserved sync leases, raw/source history and last-good cache. Manual requests
  survive service recreation; EOF cancels work and completes cleanup.
- Added fake-clock/fetcher, migration/CAS, metadata redaction and EOF tests.
  Go vet/race/build checks passed. Host and UI integration follow in this task.

### Files Modified

- `apps/cli/internal/service/`, `internal/store/settings*`, schema and command.
- Shared core data/settings contracts and service design/implementation plan.
