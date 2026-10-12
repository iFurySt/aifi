# Rallies and Open Source Investment Research References

Reviewed: 2026-10-12.

Rallies is a reference for combining single-company research, portfolio context,
continuous monitoring, and AI portfolio experiments. AIFi's immediate scope is
still sourced company research. Broker connectivity and investment execution
are deferred in the [Schwab and Plaid direction](../design-docs/broker-connectivity-direction.md).

## Rallies Product and Connectivity

The [Rallies website](https://rallies.ai/) describes portfolio-aware chat,
monitoring agents, single-ticker research, and an Arena exposing AI portfolio
decisions and performance. Relevant product pages are
[Research](https://rallies.ai/features/research),
[Chat](https://rallies.ai/features/chat),
[Agents](https://rallies.ai/features/agents), and
[Arena](https://rallies.ai/features/arena).

The user reports that Rallies uses Plaid. Preserve Plaid as a relevant integration
path for AIFi. Rallies' public homepage also describes SnapTrade for read-only
brokerage connectivity. These facts do not establish an exclusive provider or
the precise routing for every account type; AIFi's provider choice should follow
its own use case rather than assume Rallies has only one integration.

The user's supplied Schwab/Plaid comparison motivates separate roles: Schwab
for direct broker observation and possible later execution, Plaid for account
aggregation. The provider comparison in the direction document qualifies that
summary with access, freshness, and authorization requirements. The screenshot's
star ratings are subjective and are not acceptance criteria.

## Public Rallies Projects

The [official GitHub account](https://github.com/ralliesai) lists these projects:

| Project | Useful reference | License and dependency boundary |
| --- | --- | --- |
| [rallies-cli](https://github.com/ralliesai/rallies-cli) | Planning loop, progress presentation, summaries, and streamed answers | GPL-3.0; research actions depend on Rallies' hosted service |
| [tenk](https://github.com/ralliesai/tenk) | SEC retrieval, local filing search, source links, and report exports | Personal Use License; paid products and services are prohibited |
| [OpenFactor](https://github.com/ralliesai/openfactor) | Factor exposures, portfolio risk attribution, and deterministic analytics | Apache-2.0 code; rebuilding model outputs requires licensed provider inputs |

In the published CLI, the local LLM plans research steps and summarizes results.
The [action implementation](https://github.com/ralliesai/rallies-cli/blob/main/src/rallies/agent/agent.py)
posts each research step to `https://rallies.ai/api/complete-cli-action`.
The corresponding research service is not included in that repository, so the
CLI is not a complete self-hosted Rallies backend. The
[manager](https://github.com/ralliesai/rallies-cli/blob/main/src/rallies/manager.py)
contains the plan, execute, summarize, and repeat loop.

Tenk's [tools](https://github.com/ralliesai/tenk/blob/main/src/tools.py) download SEC
filings and retrieve source passages. Its
[database implementation](https://github.com/ralliesai/tenk/blob/main/src/db.py)
uses DuckDB and sentence-transformers. Consult its
[actual license](https://github.com/ralliesai/tenk/blob/main/LICENSE) before any
reuse; public source is not equivalent to unrestricted open-source permission.

OpenFactor publishes model outputs, while its
[data pipeline](https://github.com/ralliesai/openfactor/blob/main/data/README.md)
depends on paid raw inputs that are not redistributed. This separates reusable
analytics from the credentials and cost of producing market datasets.

No matching repositories were found for GitHub repository-name searches
`OpenRallies`, `open-rallies`, or `open_rallies` on 2026-10-12. This is a search
result, not a guarantee that no similarly scoped project exists.

## Local Reference Projects

The three alternative projects recommended in the research discussion are
cloned locally for future inspection:

| Project | Upstream | Local checkout | What to inspect |
| --- | --- | --- | --- |
| Dexter | [virattt/dexter](https://github.com/virattt/dexter) | `.reference-repos/dexter/` | Research planning, tool selection, loop limits, evaluation, and query logs |
| OpenBB | [openbq-org/OpenBB](https://github.com/openbq-org/OpenBB) | `.reference-repos/openbb/` | Provider adapters, normalized financial data, Python, REST, and MCP surfaces |
| AI Hedge Fund | [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) | `.reference-repos/ai-hedge-fund/` | Portfolio research, mandate configuration, backtests, and paper portfolio records |

These are reference checkouts, not AIFi dependencies, submodules, or vendored
code. No upstream setup scripts or application code are run as part of this
archive. `/.reference-repos/` is excluded by the root `.gitignore`; the tracked
snapshot record preserves their sources and revisions for other clones of AIFi.

See [checkout snapshots](local-reference-checkouts.md) for revisions, license
observations, and commands to recreate the local directory. Recheck each project
before implementation; demonstrations and roadmap items are not proof of
production readiness.
