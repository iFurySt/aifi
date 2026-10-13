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

### Host And Settings Milestone

- Added bundled Go builds/startup to Web/Electron, private stdio ownership, bounded
  IPC/loopback transport, graceful EOF/quit and a kill deadline. Existing renderer
  isolation/navigation restrictions remain; production file reads are asset-scoped.
- Added AES-GCM encryption in the Node host with a private local key, provider-field
  allowlists and metadata-only saved-state reads. No OS Keychain claim; no key in
  browser storage, child argv, URLs or logs.
- Added General/Appearance/Data sources/Sync/Storage categories, sidebar search,
  responsive grouped rows, actual settings/interval/source controls, manual sync,
  outcomes/cache size/location and configuration for future provider credentials.
  Market/SEC data adapters remain inactive; charts still use samples.
- Preserved workspace v1 content, themes/reset, frame/history and neutral focus.
  Removed Demo from Settings because those controls are real.
- Updated architecture, reliability/security, frontend, design, CI, READMEs, release
  notes and the broader data plan to distinguish implemented and pending work.

### Validation

- make ci passed: fifteen core/platform/host tests, Go vet/race tests and all builds.
  Fixtures/local servers cover scheduling, migration/CAS, request persistence,
  EOF, retry, encryption/private-key permissions and Host/Origin/session/method/body
  bounds. No CI test depends on public providers.
- Chrome Default via OBU reviewed all five categories at desktop/mobile widths,
  no overflow/outlines, interval/automation/source persistence, theme, SEC identity,
  synthetic credential save/reopen/remove, metadata/localStorage redaction and Esc.
- Actual manual Web sync succeeded. Restarting the Web host preserved settings;
  SQLite integrity and foreign-key checks passed.
- Real macOS Electron smoke passed its offline Go sidecar, IPC/settings persistence,
  synthetic encrypted credentials, private-file denial, framed settings UI, local
  save/history and renderer isolation. The Go child was absent after smoke exit.
- Native Windows/Linux runtime, installers, OS-vault integration, directory history
  retention, broader adapters and stock-data UI reads remain follow-ups.

The final transport check also rejects malformed non-ASCII session headers without
throwing from constant-time comparison. New bridge requests require a loopback
peer as well as local Host/Origin. The completed execution plan records shipped
scope and remaining work.
