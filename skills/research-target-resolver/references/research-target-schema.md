# Research Target Schema

Use this shape in `research/targets/<ticker-or-slug>/profile.md` and in
handoffs to downstream skills.

```markdown
# <Canonical Name> Research Target

## Identity

- Canonical name:
- Ticker:
- Exchange:
- Country:
- Sector:
- Industry:
- Website:
- Investor relations:
- Common aliases:
- User-provided phrases:

## Scope Notes

- Research scope:
- Exclusions:
- Ambiguities:
- Last resolved:

## Peer Set

| Peer | Ticker | Why included |
| --- | --- | --- |

## Source Notes

| Source | Retrieved | Notes |
| --- | --- | --- |

## Downstream Handoff

```yaml
research_target:
  canonical_name:
  ticker:
  exchange:
  country:
  sector:
  industry:
  aliases: []
  peer_tickers: []
  archive_path:
  resolved_at:
```
```

## Resolution Guidance

Prefer primary or stable sources for identity:

- exchange listing pages
- company investor-relations pages
- SEC company pages for US public issuers
- official annual reports or 10-K filings
- reputable market data pages when primary sources are unavailable

For ambiguous names, keep the ambiguity visible. Examples:

- `Intel` usually means Intel Corporation, ticker `INTC`, but verify exchange
  and country.
- `Apple` may mean Apple Inc. or a commodity/agriculture context depending on
  the user's wording.
- A theme such as `AI infrastructure` is not a company target; create a theme
  slug and list representative companies separately.
