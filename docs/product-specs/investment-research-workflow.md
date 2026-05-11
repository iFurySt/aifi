# Investment Research Workflow

Status: seed product spec.

## User Problem

A user wants to understand the recent situation for a company, such as Intel,
from multiple angles before making an investment decision. Today that requires
checking filings, earnings calls, market data, news, competitors, analyst
commentary, and risks manually. The user needs a repeatable AI workflow that
collects the information, keeps sources visible, and turns it into a structured
research memo.

## Goal

Given a target company or ticker, AIFi should produce a sourced research artifact
that answers:

- What changed recently?
- What are the key facts and metrics?
- What are the bull, bear, and base cases?
- What risks or contradictions need attention?
- What should the user watch before acting?

The output should support investment judgment, not replace it.

## Example Prompt

```text
Help me understand Intel's recent situation from different angles and build an
investment view.
```

## User Journey

1. User enters a company, ticker, theme, or watchlist item.
2. AIFi resolves the target and asks for clarification only when ambiguity would
   materially change the research.
3. AIFi runs independent collection skills for filings, earnings, news, market
   behavior, financial metrics, peers, and risks.
4. AIFi stores each finding as evidence with source, timestamp, and confidence.
5. AIFi synthesizes a memo that separates facts, interpretation, scenarios,
   risks, and open questions.
6. User reviews the decision frame and chooses whether to research deeper,
   monitor events, or make their own portfolio decision.

## Output Sections

- Executive snapshot: short summary of what changed and why it matters.
- Recent timeline: dated events with sources.
- Financial and valuation snapshot: key metrics, trend direction, and gaps.
- Business context: products, segments, customers, strategy, and execution
  issues.
- Competitive context: peer comparison and market positioning.
- Market signals: price behavior, relative strength, volatility, and notable
  flows where available.
- Bull case, bear case, base case: scenario-based interpretation.
- Risk register: ranked risks with evidence and unknowns.
- Open questions: what the user should verify before acting.
- Decision frame: possible actions such as watch, research deeper, wait for a
  catalyst, avoid, or size cautiously.

## Acceptance Criteria

- The workflow can run from a single target phrase such as `Intel` or `INTC`.
- The final artifact includes source links or source identifiers for material
  factual claims.
- The final artifact labels stale, missing, or conflicting evidence.
- The output separates sourced facts from AI interpretation.
- The workflow can be reused for another public company without rewriting the
  prompt.
- The system avoids claiming certainty about future returns.

## Non-Goals

- No autonomous trade execution.
- No broker account integration in the first version.
- No promise of personalized financial advice.
- No single black-box buy, hold, or sell score without supporting evidence.

## Risks And Guardrails

- Freshness risk: recent company information must be retrieved from current
  sources, not model memory.
- Hallucination risk: unsupported claims should be blocked or labeled draft-only.
- Compliance risk: investment language should be framed as research support and
  user-controlled decisioning.
- Source bias risk: news and sentiment sources should not dominate filings,
  financials, and primary disclosures.
- Overconfidence risk: every memo should include unresolved questions and
  downside scenarios.
