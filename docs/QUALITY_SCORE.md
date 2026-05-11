# Quality Score

Track quality by product area and architectural layer so agents can prioritize the weakest parts of the system.

## Suggested Scale

- `A`: strong coverage, stable behavior, clear docs, low operational risk.
- `B`: acceptable but still has known gaps.
- `C`: works but needs targeted hardening.
- `D`: fragile or underspecified.

## Initial Template

| Area | Score | Why | Next Step |
| --- | --- | --- | --- |
| Product surface | C | First AIFi company research workflow is defined, but no implementation exists yet. | Turn `docs/product-specs/investment-research-workflow.md` into an executable prototype. |
| Architecture docs | C | AIFi domain objects and boundaries are drafted; package boundaries and data flow are still pending. | Define package layering, evidence storage, and workflow orchestration contracts. |
| Testing | D | No stack-specific tests yet. | Add a minimal smoke path with one real command. |
| Observability | D | No local stack or conventions yet. | Document logs, metrics, traces, and local access. |
| Security | C | Defaults are documented, implementation is pending. | Add real auth, secret, and dependency rules. |
