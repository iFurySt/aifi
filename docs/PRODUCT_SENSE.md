# Product Sense

AIFi helps users turn messy market information into evidence-backed investment
research by composing reusable AI skills. It should feel closer to a disciplined
research desk than a chatbot: source-aware, skeptical, repeatable, and explicit
about uncertainty.

## Primary Users

- Individual investors who want structured company research without manually
  checking every source.
- Analysts who need faster first-pass coverage of companies, sectors, events,
  and watchlists.
- Builders of agent-first finance workflows who want reusable skills instead of
  one-off prompts.

## Product Differentiation

- Skill composition is the product primitive. Each research angle, such as SEC
  filings, earnings calls, price action, product news, supply chain context, or
  competitor comparison, should be implemented as a reusable skill.
- The system preserves evidence. Every material claim in a memo should be tied
  to source, timestamp, and confidence.
- Outputs separate facts from interpretation. AIFi should make it clear when it
  is reporting sourced information, inferring a thesis, or suggesting possible
  portfolio implications.
- Research should be repeatable. The same workflow can be run for Intel today,
  Nvidia tomorrow, and a watchlist every week.

## Quality Attributes

- Trust before speed: a slower sourced answer is better than a fast unsupported
  summary.
- Freshness matters: market data, news, executive changes, guidance, and analyst
  estimates require current retrieval rather than cached model memory.
- Cost should be visible: expensive skills should declare why they are needed
  and what cheaper fallback exists.
- Human control is required for investment action. AIFi may frame options, but
  execution and final judgment stay with the user.

## Current Local Preview

The first app establishes the six-page workspace and demonstrates local research
routines with sample data. Its purpose is to review navigation and interaction
before provider work. Demo status stays visible; simulated briefs never claim
real source retrieval. The next foundation is traceable local stock data,
followed by the research runner described below; neither is a feature of this preview. See the
[stock data design](design-docs/us-stock-data-pipeline.md).

Product copy should help users act with minimal reading. Keep internal planning,
implementation details, and development conversations in repository docs. Use a
single visible Demo entry with optional details, concise sample-data labels, and
clear confirmations for data loss.

## Early Product Focus

Start with a single company research workflow: "What is the recent situation for
this ticker, and what should I watch before making an investment decision?" The
first version should produce a sourced research memo, risk register, open
questions, and optional watchlist alerts.

Do not start with broker integration, autonomous trading, portfolio rebalancing,
or opaque buy/sell signals. Those require stronger compliance, audit, and
runtime controls than the early product should assume.

For a later phase, preserve direct Schwab connectivity as the initial broker
priority and Plaid as an optional path for account aggregation. People who clone
AIFi should be able to choose their own provider. Personal use is the initial
context; a possible company-operated commercial offering remains a separate
future decision. See the
[deferred connectivity direction](design-docs/broker-connectivity-direction.md).

An optional ChatGPT plan connection could reduce API-key setup for eligible
users of a future local research runtime. Preserve other model access choices,
make the active funding path visible, and keep plan usage independent of broker
access. This researched option adds no first-wave implementation requirement;
see [ChatGPT sign-in and plan usage](design-docs/chatgpt-auth-and-plan-usage.md).
