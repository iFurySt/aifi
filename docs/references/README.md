# References

Use this directory for durable external references copied or summarized into repo-local files that agents can read directly.

Good candidates:

- Framework or deployment references that the team relies on repeatedly.
- Design system references and API usage notes.
- Short summaries of external standards or partner integrations.

Avoid dumping large vendor manuals here. Keep references curated and scoped.

## Investment Research and Connectivity

- [Rallies and open-source investment research references](rallies-open-source-landscape.md)
  covers product inspiration, public Rallies projects, and the three local
  reference projects.
- [Local reference checkout snapshots](local-reference-checkouts.md) records
  upstream revisions and how to recreate the ignored reference directory.
- [Schwab and Plaid connectivity direction](../design-docs/broker-connectivity-direction.md)
  preserves the future provider choices and current scope boundary.

## Model Access and Identity

- [Official open-source ChatGPT sign-in tutorial](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)
  explains how eligible users bring their ChatGPT plan to a local open-source app.
  The first sign-in dynamically registers the client; no console app, client secret
  or user API key is needed. Published 2026-09-28; reviewed 2026-10-17.
- [Implemented AIFi desktop connection](../design-docs/chatgpt-desktop-connection.md)
  records setup, authoritative URLs, identity/plan permission separation,
  protected credentials, request restrictions and live verification results.
- [ChatGPT sign-in and plan usage for AIFi](../design-docs/chatgpt-auth-and-plan-usage.md)
  records the official open-source flow, website identity availability, account
  limits, and request restrictions, with linked OpenAI documentation reviewed on
  2026-10-17.

## Stock Data

- [US stock data sources](us-stock-data-providers.md) compares personal free API
  options, primary documentation, actual keyless probes, and implementation
  lessons from the three reference projects, reviewed on 2026-10-13.

- [Stock directory sources](stock-directory-sources.md): selected keyless bulk
  directory, pinned-project comparison, actual requests, and classification limits.

- [Company logo sources](stock-logos.md): directory limitations, keyless public
  asset probes, provider restrictions and the shipped presentation adapter.

- [Company logo coverage audit](company-logo-coverage-audit.md): measured GitHub
  filename coverage, current provider sample and reviewed catalog proposal.

- [Keyless company research](keyless-company-research.md): live company profile,
  financial-series and filing-index probes, access limits and vendor semantics.

- [Financial statement coverage and sources](financial-statement-sources.md): Rallies comparison, extended SEC/Yahoo mappings, actual probes and calculation limits.
