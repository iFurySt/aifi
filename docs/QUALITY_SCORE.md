# Quality Score

Track quality by product area and architectural layer so agents can prioritize the weakest parts of the system.

## Suggested Scale

- `A`: strong coverage, stable behavior, clear docs, low operational risk.
- `B`: acceptable but still has known gaps.
- `C`: works but needs targeted hardening.
- `D`: fragile or underspecified.

## Current Snapshot

| Area | Score | Why | Next Step |
| --- | --- | --- | --- |
| Product surface | C | Seven local demo pages, including six stock tabs, and persistent interactions work; stock list/search/header read the real cached directory with protected index/watchlist scopes, incremental scroll and optional company logos; Stocks/Watchlist now read persisted market/research data with full-directory collection jobs and explicit source-setup gates; Desktop ChatGPT login and bounded text inference are implemented; source-backed AI workflows remain pending. | Connect the company research workflow to a sourced local runner. |
| Architecture docs | B | App-owned Go lifecycle/settings/transport and encrypted credential boundaries are explicit; Web/Electron share one renderer; domain/platform/UI boundaries and demo persistence are documented. | Keep model connection separate from evidence storage and research-runner contracts. |
| Testing | B | TypeScript, domain/storage/route/host/UI tests, Go parser/store/service/scheduler race tests, and all builds, Chrome desktop/mobile review, and a real macOS Electron smoke pass. | Add Windows/Linux launch checks and runner tests when their scope arrives. |
| Observability | C | App-owned directory scheduling and sync outcomes/settings are durable; frontend errors are visible. Research datasets now expose durable job progress and provider readiness; ChatGPT connection/usage errors are visible; there is no sourced AI research runner yet. | Add structured run diagnostics when execution is implemented. |
| Security | B | Renderer sandbox, narrow preload, CSP, validated demo state, and pinned dependencies are implemented. | Add dependency scanning and OS-vault/retention enhancements before wider integrations. |

Storage inspection now has Go page-accounting and no-collection tests, host
inventory/path/symlink/pagination tests, and an isolated Electron gate using a
real offline Go store. Native Windows/Linux Finder-equivalent behavior still
requires platform verification; file totals exclude profile/browser data.
