# App-Owned Data Service

Status: shared Web/Electron host and settings integration implemented, 2026-10-13.

## Lifecycle And Schedule

The local host starts the bundled `aifi service` child, which opens/migrates its
SQLite store and accepts bounded newline JSON over private stdio. Directory
work runs in a separate bounded goroutine; status/settings requests do not wait
for HTTP downloads. No Go TCP listener, hosted service, or OS daemon is added.

Default: directory enabled, automatic enabled, 24-hour interval. Intervals are
integer hours from 1 to 720. Startup checks last successful collection; a fresh
cache avoids another download. The worker checks due work every 30 seconds and
on settings/manual requests. Resume after sleep computes due work from persisted
outcomes rather than counting missed timer events.

Manual requests persist in SQLite and work even with automatic sync disabled.
Source disabling prevents new work and cancels the host's active request. Another
host notices changed settings on its next check. The existing three-minute lease
coalesces simultaneous hosts/CLI work; expired leases recover after a crash.
Failures use 15/30/60-minute bounded retry delays when scheduled data is overdue;
manual requests can retry immediately. Disabling automation cancels an automatic
run, while a deliberately requested manual run is independent of that switch.

Stdin EOF or parent cancellation cancels network work, waits for outcome cleanup,
and ends the process. A queued manual request is retained through shutdown if it
has not completed. macOS closing its last window keeps the app alive; normal Quit
ends the child. Unexpected child exit is surfaced as unavailable until the host
restarts. No always-on background collection after app/server exit.

## Persistence

SQLite v2 adds versioned service settings, a durable manual-request bit, and
credential ciphertext rows. Migration preserves v1 listings, memberships,
aliases, sources, and sync history. Revision-based compare-and-swap rejects stale
settings edits. No browser workspace-schema change is needed.

Source generation strings retain their original timezone-unspecified format.
Scheduler instants use UTC collection outcomes, not that publication marker.
Daily full directory snapshots can grow over time; storage size is visible.
Retention/compaction remains a follow-up rather than deleting existing history.

## Host Transport And Credentials

Electron owns the Go child and exposes an allowlisted data IPC method to its
trusted top frame. Browser dev/preview hosts own an equivalent child and expose
same-origin loopback session/request routes. Web requires an exact local Host,
same Origin, a memory-only per-server token, JSON requests, and bounded body/time.
No permissive CORS, user-provided remote URL, or arbitrary process command exists.

Only the Node host handles plaintext credentials. It encrypts them with AES-256-GCM
and a randomly generated 0600 `aifi-vault.key` in the private data directory before
sending ciphertext to Go/SQLite. The UI only receives provider/field presence,
never saved plaintext or ciphertext. Inputs clear on save/close; credentials are
not placed in localStorage, request URLs, child argv, or logs.

This is a local file vault, not an OS Keychain. Same-user filesystem access and a
backup containing both key and DB can recover credentials; preserving the key is
required for future decryption. Future adapters must decrypt in the host and must
not add a plaintext retrieval API for the renderer. Runtime HTTP/IPC allowlists
exclude internal vault methods. Renderer file/network resources are restricted,
and Vite denies private key/SQLite/artifact paths.

## Settings Surface

The inner sidebar changes to Settings categories: General, Appearance, Data
sources, Sync, Storage. The document uses centered headings and bordered grouped
rows as in the supplied screenshot. Global app navigation stays in the outer rail.
Mobile uses the shared navigation drawer. Neutral keyboard focus remains intact.

Nasdaq source enabling, interval/automation, manual sync, outcomes, cached counts,
storage location, and theme/reset controls are functional. Massive/Alpaca secrets
and SEC identification can be configured; those adapters are not syncing and
remote credential validity is not asserted. Market charts/financials stay samples.

## Verification

Fake-clock/fetcher tests cover fresh startup, shorter interval, disabled schedules,
manual requests across service recreation, retry timing, EOF and metadata redaction.
Store tests cover v1 migration, data preservation, revision conflicts, and credential
metadata. Host tests cover authenticated encryption/key permissions, input bounds,
loopback session/Host/Origin and method/body checks. Native smoke uses an isolated,
offline Go child and synthetic credentials; public sync/UI checks use isolated data.

## Stock Directory Read Port

`StockDirectoryRepository` in core defines bounded `search` and exact `get` reads.
The platform local adapter uses allowlisted directory.list/directory.get methods.
Electron main forwards to the Go child; Go owns SQLite and returns a snapshot ID,
filtered result count, stable listing ID, source symbol/name and exchange code.
Reads do not trigger a provider download. Source symbols remain opaque in routes;
watchlist persistence retains its stricter existing validation.

The UI receives this repository at application composition. A future cloud
adapter can implement the same domain contract with its own authenticated
transport; no cloud URL or authentication support is added by this change.

A separate stock.logo host method verifies directory membership and serves
bounded PNG data URLs from an optional presentation cache. Go remains the database
owner; Node asset HTTP retrieval does not occupy the Go RPC loop or directory
worker. See [logo capability](stock-logos.md).
