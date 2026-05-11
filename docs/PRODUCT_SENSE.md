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

## Early Product Focus

Start with a single company research workflow: "What is the recent situation for
this ticker, and what should I watch before making an investment decision?" The
first version should produce a sourced research memo, risk register, open
questions, and optional watchlist alerts.

Do not start with broker integration, autonomous trading, portfolio rebalancing,
or opaque buy/sell signals. Those require stronger compliance, audit, and
runtime controls than the early product should assume.
