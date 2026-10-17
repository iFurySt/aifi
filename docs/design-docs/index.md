# Design Docs Index

Keep architectural and product design documents indexed here.

Suggested conventions:

- One document per substantial topic.
- Add a short summary and current status.
- Link to the execution plan or spec that introduced the change.

## Seed Documents

- `core-beliefs.md`
- `aifi-skill-composition.md` - current direction for composing reusable
  investment research skills into larger AI workflows.
- [Schwab and Plaid connectivity direction](broker-connectivity-direction.md) -
  deferred broker integration direction: prioritize Schwab, preserve optional
  Plaid access, and keep implementation outside the first wave.
- [ChatGPT sign-in and plan usage](chatgpt-auth-and-plan-usage.md) - researched
  local runtime option, website login availability, OAuth flow, and current
  inference restrictions.
- [ChatGPT desktop connection](chatgpt-desktop-connection.md) - implemented local
  OAuth, protected accounts, model discovery and streaming text chat; live sign-in,
  inference and connection recovery after restart verified.

## Stock Data Foundation

- [Local US stock data pipeline](us-stock-data-pipeline.md) — proposed Go/local
  collection design, source boundaries, durable jobs, and correctness rules.
- [Stock research page](stock-research-page.md) — shared six-tab Web/Electron company UI
  with persisted provider reads and empty/access states for unavailable datasets.
- [Execution plan](../exec-plans/active/us-stock-data-foundation.md) — design first,
  then provider verification, local collection, scheduling, UI, and scale.

- [App-owned data service](app-data-service.md) — directory scheduling, local
  settings/credential boundaries, and app-owned lifecycle.

- [Local research ingestion](research-ingestion.md): implemented provider jobs,
  SQLite evidence/read contracts, dataset settings and current coverage limits.

- [Local storage usage](storage-usage.md) — implemented file inventory, SQLite
  page categories and bounded desktop reveal from Settings.
