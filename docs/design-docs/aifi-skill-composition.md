# AIFi Skill Composition

Status: seed design direction.

## Context

AIFi treats an AI application as a composition of smaller skills. A skill is not
just a prompt; it is a bounded operation with inputs, source expectations,
outputs, checks, and a place in a repeatable workflow.

For investment research, this matters because "understand Intel recently" is not
one task. It is a bundle of tasks across time-sensitive sources and analytical
angles. The value comes from orchestrating those angles, preserving evidence, and
making the final reasoning inspectable.

## Skill Contract

Each skill should declare:

- Purpose: the narrow research question it answers.
- Inputs: ticker, company name, sector, date range, portfolio context, or prior
  artifacts.
- Source policy: required sources, allowed fallback sources, recency needs, and
  citation requirements.
- Output schema: structured fields the next skill can consume.
- Confidence model: how the skill labels stale data, missing data, conflicts, or
  weak evidence.
- Cost profile: expected latency, API cost, token cost, and caching rules.
- Quality gate: checks that must pass before the output can be used downstream.

## Baseline Research Skills

- Target resolver: maps a user phrase such as "Intel" to canonical company,
  ticker, exchange, sector, and peer set.
- Freshness scanner: finds recent filings, earnings events, press releases,
  news, executive changes, guidance updates, and major price moves.
- Financial snapshot: collects revenue, margin, cash flow, balance sheet,
  valuation, guidance, and revision trends.
- Filing reader: extracts key changes from 10-K, 10-Q, 8-K, proxy statements,
  and risk factors.
- Earnings call reader: summarizes management claims, analyst questions,
  guidance deltas, and language shifts.
- Market signal reader: inspects price action, volume, volatility, short
  interest, options signals, and relative performance.
- Competitive context reader: compares the target with peers and substitutes
  across product, margin, growth, valuation, and strategic positioning.
- Narrative and sentiment reader: separates market narrative from sourced facts
  across news, analyst notes, and social signals when available.
- Risk register builder: lists fundamental, market, execution, legal,
  geopolitical, and data-quality risks.
- Thesis synthesizer: turns evidence into bull case, bear case, base case,
  watch items, and unresolved questions.
- Decision frame builder: converts the thesis into possible user actions such as
  watch, research deeper, size cautiously, avoid, or revisit after an event.

## Workflow Shape

The default workflow should be graph-shaped rather than a single chain:

1. Resolve the target and date range.
2. Run collection skills in parallel where sources are independent.
3. Normalize findings into evidence items.
4. Run analysis skills over the evidence store.
5. Ask critique skills to look for contradictions, missing sources, stale data,
   and unsupported claims.
6. Assemble a research artifact with citations and confidence labels.
7. Present a decision frame and open questions for the user.

## Evidence Rules

Material claims need provenance. A useful research artifact should tell the user
what happened, when it happened, where the data came from, why it matters, and
what remains uncertain.

If sources disagree, the workflow should preserve the disagreement and surface
the conflict. If the latest reliable source cannot be retrieved, the artifact
must say so instead of filling the gap with model memory.

## Human Control

AIFi may help users build an investment view, but it should not silently execute
trades or present a single opaque recommendation as truth. The default output is
a decision frame with evidence, scenarios, and watch items. Any future action
layer should require explicit user confirmation and a stronger compliance model.
