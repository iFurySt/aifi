---
name: research-target-resolver
description: Resolve an investment research target into canonical identifiers and initial context. Use when a user names a company, ticker, sector theme, watchlist item, or ambiguous phrase such as Intel, INTC, Apple, chip stocks, or AI infrastructure before running AIFi research workflows.
---

# Research Target Resolver

Use this skill before company or sector research. Its job is to turn the user's
target phrase into a stable `ResearchTarget` that downstream skills can reuse.

Keep this skill narrow: resolve identity, scope, ambiguity, and initial peer
context. Do not write the investment thesis here.

## Workflow

1. Parse the user's target phrase, requested market, date range, and intent.
2. Resolve canonical identifiers: company name, ticker, exchange, country,
   sector, industry, common aliases, and investor-relations site.
3. Detect ambiguity. Ask a concise clarification only if multiple plausible
   targets would materially change the research.
4. Build a first-pass peer set and sector tags.
5. Create or update the target directory in the research archive.
6. Emit a `ResearchTarget` block for downstream skills.

## Archive Location

Persist reusable target context under:

```text
research/targets/<ticker-or-slug>/profile.md
```

Use lowercase slugs for non-ticker themes. For public equities, prefer the main
listed ticker in lowercase, such as `research/targets/intc/profile.md`.

Read `references/research-target-schema.md` before writing a profile or target
block.

## Output

Return:

- canonical target identity
- ambiguity notes, if any
- peer set and sector tags
- archive path used or created
- source list and freshness notes
- next recommended skills

## Quality Gate

Do not hand off to downstream skills until:

- ticker and company identity are explicit for public-company research
- exchange and country are known when available
- aliases include the user's original phrasing
- stale or uncertain facts are labeled
- profile updates preserve useful prior context instead of replacing it blindly
