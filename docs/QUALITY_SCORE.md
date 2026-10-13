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
| Product surface | C | Seven local demo pages, including six stock tabs, and persistent interactions work; real research execution remains pending. | Connect the company research workflow to a sourced local runner. |
| Architecture docs | B | The Go directory collector has explicit source/store boundaries; Web/Electron share one renderer; domain/platform/UI boundaries and demo persistence are documented. | Specify evidence storage and runner contracts before integration. |
| Testing | B | TypeScript, eleven frontend domain/storage/route tests, Go parser/store/CLI race tests, and all builds, Chrome desktop/mobile review, and a real macOS Electron smoke pass. | Add Windows/Linux launch checks and runner tests when their scope arrives. |
| Observability | C | CLI sync outcomes and source snapshots are durable; frontend errors are visible. There is no broader research runner yet. | Add structured run diagnostics when execution is implemented. |
| Security | B | Renderer sandbox, narrow preload, CSP, validated demo state, and pinned dependencies are implemented. | Add dependency scanning and protected token storage before live access. |
