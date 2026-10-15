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
| Product surface | C | Seven local demo pages, including six stock tabs, and persistent interactions work; stock list/search/header read the real cached directory with incremental scroll and optional company logos; market data and research execution remain pending. | Connect the company research workflow to a sourced local runner. |
| Architecture docs | B | App-owned Go lifecycle/settings/transport and encrypted credential boundaries are explicit; Web/Electron share one renderer; domain/platform/UI boundaries and demo persistence are documented. | Specify evidence storage and runner contracts before integration. |
| Testing | B | TypeScript, 52 domain/storage/route/host/UI tests, Go parser/store/service/scheduler race tests, and all builds, Chrome desktop/mobile review, and a real macOS Electron smoke pass. | Add Windows/Linux launch checks and runner tests when their scope arrives. |
| Observability | C | App-owned directory scheduling and sync outcomes/settings are durable; frontend errors are visible. There is no broader research runner yet. | Add structured run diagnostics when execution is implemented. |
| Security | B | Renderer sandbox, narrow preload, CSP, validated demo state, and pinned dependencies are implemented. | Add dependency scanning and OS-vault/retention enhancements before wider integrations. |
