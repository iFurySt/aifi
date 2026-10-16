# Reliability

## Current Local Runtime

Web starts on the fixed loopback origin 127.0.0.1:5173. Desktop development owns
its Vite process; a conflicting port causes startup to fail rather than silently
choosing another origin. Production desktop loads bundled assets without a server.
The first desktop launch downloads Electron if the binary is not cached. On
macOS, a cached local AIFi-named runtime is prepared from that pinned distribution,
with an icon and ad-hoc signature; source dependencies are left pristine.

App-owned Go now schedules directory checks/downloads while the host runs.
Electron starts a private child; local Web dev/preview starts an equivalent child.
The renderer uses local settings/status transport and has no direct provider calls
or cloud dependency. Cached reads do not fetch. See [CLI guardrails](../apps/cli/README.md).
Local state is bounded and validated. Invalid or unsupported state opens a
recoverable temporary demo and preserves the stored value until explicit reset.
Storage denial/quota failure leaves the session usable and displays a notice.

## Verification And Diagnostics

make ci includes repository checks, TypeScript, domain/storage contracts, and
production builds. pnpm smoke:desktop separately checks a real native launch,
local persistence, renderer isolation, and the shared renderer with a timeout.
It uses a throwaway profile and saves diagnostics in .artifacts. Frontend
browser/Electron verification lives in
[the frontend guide](FRONTEND.md). Vite and Electron diagnostics appear in the
launching terminal; the app exposes user-facing storage/startup failures.

Directory collection has bounded requests, persisted outcomes/leases, atomic
snapshot writes, stale-source/shrink guards, and last-good cache retention. SQLite
v4 migrates prior versions in place and is explicitly versioned; an unknown future schema is rejected.

Multi-window editing, UI schema migrations, backups, broader live-source retry policies,
and research-runner observability remain future work. CI workflow and release
automation guidance live in [CICD.md](CICD.md).

Directory settings use revision checks; source disabling cancels owned work,
automation/interval changes recompute due time, and manual requests persist.
Failures back off 15/30/60 minutes; wake checks catch up using stored outcomes.
EOF/quit cancels downloads and waits for cleanup, with a host kill deadline.
Unexpected process exit is visible as unavailable and needs host reconnect/restart.
Directory history retention remains a follow-up; Storage exposes DB size.

Company logos persist as private host PNGs across restarts. Fresh disk hits make
no image-provider request; stale/fallback hits display immediately and refresh in
the background. The renderer shares pending reads and holds a bounded session
cache to avoid repeated local round trips/letter flashes during navigation.
Directory paging prepares disk-cached images in batches before displaying rows,
independent of slow remote downloads. Cache misses get immediate letters; no
blank pending avatars. Catalog metadata retains its separate at-most-daily refresh schedule.

SQLite v3 adds index snapshots with provenance and immutable source symbols.
Startup seeds require complete validated lists and an atomic transaction;
reopening older reviewed bundles cannot roll a newer index head back. Index
coverage reports unresolved source symbols instead of silently truncating counts.
Automatic index sync is deferred; source dates stay attached to scoped reads.

The [local data contract](design-docs/local-data-contract.md) requires asynchronous
structured-data collection followed by durable SQLite commits and local reads.
Directory paging/search has a restart regression with an unavailable provider:
all reads still succeed without invoking its fetcher. The UI distinguishes quiet
local head rechecks from append progress instead of showing Loading more for both.

Research workers now have durable fenced leases, atomic evidence/snapshot/bar
commits, provider budgets, shared 429/auth cooldowns, staged institutional pages
and last-good reads. See [research ingestion](design-docs/research-ingestion.md)
for execution limits, UTC budget days, source windows and live-validation gates.

Daily prices default to the keyless Yahoo chart adapter. A provider switch never
mixes source series or price bases. Shared budgets and public-endpoint cooldowns
apply across hosts; 401/403 do not turn into a nonexistent Yahoo API-key prompt.
Split-adjusted historical windows replace atomically, preserving last-good data
on failure. Keyless collection/offline reopening and double-adjustment tests are
part of the research regression suite.

Coverage counts aggregate unique symbols before directory membership joins; the
20,000-bar status regression prevents collection progress from blocking local
settings/read operations through a session-by-listing join.
