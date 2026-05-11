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
| Product surface | C | First AIFi company research workflow is defined and seed skills exist, but there is no executable runner yet. | Turn `skills/company-research-workflow` into an executable prototype. |
| Architecture docs | C | AIFi domain objects, skill directory, and research archive direction are drafted; package boundaries and data flow are still pending. | Define package layering, evidence storage, and workflow orchestration contracts. |
| Testing | D | No stack-specific tests yet. | Add a minimal smoke path with one real command. |
| Observability | D | No local stack or conventions yet. | Document logs, metrics, traces, and local access. |
| Security | C | Defaults are documented, implementation is pending. | Add real auth, secret, and dependency rules. |
