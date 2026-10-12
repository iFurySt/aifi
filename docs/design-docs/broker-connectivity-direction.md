# Schwab and Plaid Connectivity Direction

Status: deferred product direction; no integration implementation is scheduled.
Decision date: 2026-10-12.

AIFi should eventually let people connect their own investment accounts using
either a direct broker API or an account aggregation service. Schwab is the
first intended broker for the maintainer's observation and investment workflow.
Plaid remains an optional path for people who need account aggregation across
institutions. Both paths may coexist, and people who clone AIFi should be able to
choose their own provider and supply their own credentials.

The first wave remains the company research workflow. This decision preserves
future options; it does not authorize broker integration, account onboarding,
trading code, or a change to the current research-only product boundary.

## User Decisions

- Prioritize Schwab direct access when brokerage integration becomes an active
  task, starting with account observation and portfolio context.
- Keep Plaid available as an alternative rather than committing the project to
  one connectivity vendor.
- Treat personal, self-hosted use as the initial context. A possible commercial
  product would operate through a company entity and will be considered later.
- Preserve the possibility of investment execution through a broker API, but
  decide and authorize that scope separately from account observation.
- Keep implementation deferred. Future work should begin with a fresh execution
  plan and updated provider documentation.

## Provider Roles

| Capability | Schwab direct API | Plaid Investments |
| --- | --- | --- |
| Intended use | Personal Schwab account observation and a possible later investment workflow | Account aggregation and portfolio research across supported institutions |
| Personal access | Evaluate the Trader API individual path and obtain app approval for the intended account | Sandbox testing is available; real accounts require eligible Production or Trial access |
| Holdings and activity | Account information is part of the Trader API; confirm exact holdings and transaction endpoints during implementation | Holdings and investment transaction endpoints are documented |
| Market data | Real-time and historical market data are documented; confirm account entitlements | Holdings include security data and prices, but this is not a live quote feed |
| Stock and option orders | Trader API supports order entry; execution stays outside the first wave | Investments retrieves investment data; it is not a securities order execution API |
| Institution coverage | Schwab | Multiple supported institutions, with product-specific coverage |
| Authorization responsibility | AIFi must handle its direct app authorization and token lifecycle | Plaid Link orchestrates institution authorization; AIFi still handles Link setup, token exchange, storage, and reconnection |

Schwab describes Trader API access to account information, real-time and
historical market data, and stock, option, and ETF order entry in its
[API customization overview](https://www.schwab.com/learn/story/ways-ai-trading-tools-help-increase-efficiency)
(published 2026-08-14; reviewed 2026-10-12). The
[Developer Portal](https://developer.schwab.com/) is the entry point for product
selection and registration. App approval, precise transaction history coverage,
OAuth requirements, and eligibility for the intended account remain checks for
the future integration task.

[Plaid Investments](https://plaid.com/docs/investments/) documents holdings and
up to 24 months of investment transactions. Investment data updates periodically
on market days, usually detecting holding changes overnight; refresh is an
additional capability. A future UI must show the provider's data timestamp
instead of presenting these snapshots as live market prices.

Plaid's [Sandbox documentation](https://plaid.com/docs/sandbox/) describes a
free Sandbox and a Trial plan for eligible US and Canadian teams created on or
after 2026-04-15. The Trial path can use real data with up to 10 Production Items;
it is not an unconditional promise of access for every individual or region.
The [OAuth guide](https://plaid.com/docs/link/oauth/) documents app registration,
redirect handling, and institution-specific activation, including additional
waiting time for Schwab. These provider facts were reviewed on 2026-10-12 and
must be rechecked before implementation.

## Future Architecture Boundaries

Keep these as design intentions until implementation begins:

- Separate portfolio data access, market data access, and order execution.
  A provider may support only some of these capabilities.
- Normalize accounts, positions, balances, and investment transactions for
  research skills, while preserving provider identifiers, timestamps, and
  provenance. Direct Schwab and Plaid-linked Schwab accounts should not silently
  count as two different holdings.
- Make provider selection explicit and optional. The research workflow should
  remain usable without a linked broker, including with manual portfolio input.
- Let each self-hosted installation own its provider applications, approvals,
  keys, and account authorization. Open-source availability does not transfer
  the maintainer's provider permissions to other users.
- Follow the repository's existing secret and private-data rules. Keep tokens,
  account identifiers, balances, and private transaction records out of tracked
  research artifacts and example fixtures.
- Start a future connector with observation capabilities. Order execution needs
  a separate scope decision, human authorization, and runtime controls before
  the application exposes it.

## Checks Before Implementation

1. Verify Schwab's individual application process, account eligibility,
   authorization lifecycle, data entitlements, transaction history, and limits.
2. Verify Plaid access for the intended region and account, Investments coverage,
   institution activation, refresh behavior, and ongoing cost.
3. Define the minimum portfolio data contract and handling of overlapping
   connections before choosing a runtime stack or SDK.
4. Recheck upstream licenses at the exact revisions to be reused; local reference
   clones are not permission to incorporate arbitrary upstream code.
5. Create an execution plan only when integration becomes active. Commercial
   onboarding and order execution each need their own scope decision.

Related: [product focus](../PRODUCT_SENSE.md),
[architecture](../ARCHITECTURE.md),
[security defaults](../SECURITY.md), and
[Rallies and open-source references](../references/rallies-open-source-landscape.md).
