# App-Owned Data Service And Settings

Created and completed 2026-10-13.

## Goal

Launch the Go directory service with each local Web/Electron host. Check due work
on startup and periodically, with persisted, user-configurable enable/interval
settings. Build the screenshot-inspired settings sidebar and grouped content for
General, Appearance, Data sources, Sync, Storage.

## Scope And Decisions

- Default directory interval 24 hours, adjustable 1–720 hours; fresh cache avoids
  an unnecessary download at every launch. Manual sync and persisted requests,
  source disabling, restart/wake catch-up, bounded retry and existing sync leases.
- SQLite v2 migrates v1 in place for service settings and encrypted credential
  blobs. Secrets are encrypted by the Node host with AES-GCM and a private local
  key file; renderer storage and status responses never contain saved plaintext.
  This local vault is not claimed to be an OS Keychain.
- Electron owns a Go child through private stdio and a narrow IPC allowlist. Web
  dev/preview own a child through a same-origin loopback bridge, Host/Origin checks,
  a per-server memory-only session token, and bounded requests.
- Known future provider credentials can be configured, without claiming that
  their data adapters or remote credential validation are implemented.
- Go process exits with the owning app/server. Work is scheduled while the host
  runs; no always-on OS service. Preserve the workspace schema and neutral focus.

## Milestones

- [x] SQLite/config migration, due-work scheduler, bounded stdio RPC and tests.
- [x] App-owned host/vault/bridge, shared contracts, settings/sidebar integration.
- [x] Browser/mobile/native validation, lifecycle/security checks, docs and staged
  commits/pushes. Existing directory/history checks remain in CI.

## Validation

Fake-clock/fetcher scheduling, restart/settings/disable/backoff, request persistence,
EOF shutdown, migration, ciphertext/status redaction, IPC/web transport allowlists,
CSRF/Host/body bounds, native child lifecycle, browser/mobile UI and real Electron.
Use isolated profiles/data directories and synthetic credentials only in tests.
No new market/SEC/broker/model data adapter is part of this task.

## Outcome

App-owned Go scheduling, SQLite v2 settings migration, encrypted provider
configuration and screenshot-inspired settings shipped in staged commits.
CI (15 TypeScript/host tests, Go vet/race and all builds), real macOS Electron
sidecar/IPC/private-file/exit smoke, Chrome desktop/mobile categories, real manual
Web sync, restart persistence and SQLite integrity passed. Market/SEC adapters,
stock-page live reads, native Windows/Linux runtime and history retention remain
explicit follow-ups. No OS daemon or OS Keychain was claimed.
