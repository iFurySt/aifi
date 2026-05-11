---
name: company-news-research
description: Collect and analyze recent company news, press releases, media narratives, executive changes, product updates, regulatory events, and dated catalysts for an investment target. Use for information-side or news-side research such as "what happened recently with Intel" before thesis synthesis.
---

# Company News Research

Use this skill to build the recent-event layer for an AIFi company memo. Focus
on what changed, when it changed, who reported it, and whether the source is
primary, reputable secondary, or market commentary.

## Inputs

- `ResearchTarget` from `research-target-resolver`
- date range, defaulting to the recent period requested by the user
- existing archive path from `research-evidence-archive`
- optional focus areas such as product, management, litigation, guidance,
  subsidies, layoffs, customer wins, or supply chain

## Workflow

1. Load the target profile and existing news archive if present.
2. Search current sources when the user asks for recent or latest information.
3. Prioritize primary sources, then reputable financial and trade media.
4. Build a dated event timeline.
5. Separate confirmed events from interpretation and market narrative.
6. Save a markdown digest under
   `research/targets/<target>/evidence/news/`.
7. Hand off unresolved questions and important catalysts to synthesis skills.

Read `references/news-source-policy.md` before collecting or ranking sources.

## Output

Return:

- timeline of recent events
- source list grouped by source type
- narrative changes and disputed claims
- catalyst list with future dates when available
- archive files created or updated
- gaps requiring filings, earnings, or competitor skills

## Quality Gate

Do not present news as investment conclusion. Before finishing, verify:

- date range is explicit
- every material event has a source and publication date
- primary-source claims are distinguished from journalist or analyst framing
- stale articles are not mixed into "recent" results without labels
- rumors, leaks, and social-media claims are marked as unconfirmed
