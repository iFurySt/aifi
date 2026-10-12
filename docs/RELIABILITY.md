# Reliability

## Current Local Runtime

Web starts on the fixed loopback origin 127.0.0.1:5173. Desktop development owns
its Vite process; a conflicting port causes startup to fail rather than silently
choosing another origin. Production desktop loads bundled assets without a server.
The first desktop launch downloads Electron if the binary is not cached.

The demo has no network data sources, background schedules, or cloud services.
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

Multi-window editing, schema migrations, backups, live-source retry policies,
and research-runner observability remain future work. CI workflow and release
automation guidance live in [CICD.md](CICD.md).
