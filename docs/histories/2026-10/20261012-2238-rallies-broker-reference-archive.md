## [2026-10-12 22:38] | Task: Preserve Rallies and broker connectivity references

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-6`
- Runtime: `Codex desktop`

### User Query

> Clone the three recommended open-source investment projects into a git-ignored
> directory for later reference. Record Schwab as the first broker priority,
> retain Plaid as an optional account aggregation path for self-hosted users,
> and defer implementation beyond the first wave. Consider a company-operated
> commercial offering separately in the future.

### Changes Overview

- Added an ignored local reference directory for Dexter, OpenBB, and AI Hedge
  Fund, with a tracked inventory of upstream sources, revisions, and license
  observations.
- Archived Rallies product and public-source findings, including the hosted
  research dependency in its CLI and the license boundaries of its other tools.
- Recorded the Schwab/Plaid direction, provider roles, individual access
  conditions, future capability boundaries, and checks before implementation.
- Linked the deferred direction from architecture, product sense, and the
  design and reference indexes.

### Design Intent

Keep the discussion available to later contributors without starting broker or
trading development. Self-hosted users should eventually choose and authorize
their own provider. Portfolio observation, market data, and order execution
remain separate capabilities. Local upstream clones are reference material,
not AIFi dependencies or redistributed source.

### Files Modified

- `.gitignore`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SENSE.md`
- `docs/design-docs/index.md`
- `docs/design-docs/broker-connectivity-direction.md`
- `docs/references/README.md`
- `docs/references/rallies-open-source-landscape.md`
- `docs/references/local-reference-checkouts.md`
- `docs/histories/2026-10/20261012-2238-rallies-broker-reference-archive.md`

### Validation

- `make ci` passed the documentation, repository hygiene, skills, action pinning,
  and script syntax checks.
- All three local checkouts have an upstream remote, the recorded HEAD, and a
  clean working tree. Their paths are ignored and absent from the parent index.
- Local Markdown links, new-file whitespace, and `git diff --check` passed.
