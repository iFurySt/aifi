# Reliability

## Current Local Runtime

Web starts on the fixed loopback origin 127.0.0.1:5173. Desktop development owns
its Vite process; a conflicting port causes startup to fail rather than silently
choosing another origin. Production desktop loads bundled assets without a server.
The first desktop launch downloads Electron if the binary is not cached.

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
v2 migrates v1 in place and is explicitly versioned; an unknown future schema is rejected.

Multi-window editing, UI schema migrations, backups, broader live-source retry policies,
and research-runner observability remain future work. CI workflow and release
automation guidance live in [CICD.md](CICD.md).

Directory settings use revision checks; source disabling cancels owned work,
automation/interval changes recompute due time, and manual requests persist.
Failures back off 15/30/60 minutes; wake checks catch up using stored outcomes.
EOF/quit cancels downloads and waits for cleanup, with a host kill deadline.
Unexpected process exit is visible as unavailable and needs host reconnect/restart.
Directory history retention remains a follow-up; Storage exposes DB size.
