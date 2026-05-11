# Security

AIFi's current security posture is documentation- and research-archive focused.
There is no deployed service, package dependency graph, or release artifact yet.

## Current Defaults

- Do not commit secrets, API tokens, cookies, brokerage credentials, private
  research, or paid-source material that cannot be redistributed.
- Keep source attribution and retrieval dates with research evidence so later
  agents can assess freshness and provenance.
- Treat generated investment research as decision support, not regulated
  financial advice or autonomous trading instruction.
- Prefer primary or stable sources for material claims, and label uncertainty,
  stale data, or conflicting sources.
- Keep scripts explicit and reviewable. Avoid hidden network calls, destructive
  defaults, or unbounded filesystem operations.
- Add dependency scanning only after the repository has real dependency manifests
  and lockfiles.

## External Sources And Integrations

- Record source URLs, publication dates, filing periods, and retrieval dates
  when saving research evidence.
- Do not paste long copyrighted excerpts into generated artifacts; summarize and
  link back to the source when possible.
- Keep credentials for market-data, filing, news, or LLM providers outside the
  repository and document required environment variables before adding runtime
  code.
- If a connector writes to external systems, document whether the action is
  read-only, creates drafts, or publishes user-visible content.

## Future Runtime Work

When AIFi gains application code or infrastructure, update this file with:

- authentication and authorization boundaries
- secret storage and rotation rules
- data retention policy for research archives and generated artifacts
- dependency and vulnerability scanning for the chosen stack
- deployment rollback and incident-response expectations
