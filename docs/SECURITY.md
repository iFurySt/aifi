# Security

AIFi now includes a local Web/Electron demo and a pinned dependency lockfile.
There is no hosted backend, model credential handling, or broker connection.

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
- Review dependency updates against the pinned lockfile; automated vulnerability
  scanning remains a follow-up.

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

## Local Application Boundaries

- Electron renderer: sandbox, context isolation, no Node integration, and a
  preload bridge exposing only runtime metadata.
- New windows and navigation away from the app are denied.
- Production CSP allows local assets and denies network connections/frames;
  development permits the fixed localhost Vite origin and its HMR socket.
- Local storage contains demo research state, not credentials. Do not add tokens
  to this storage adapter; future secrets need a separate protected capability.
- Saved data is validated before use and rendered as text, without raw HTML.
- Browser and desktop data remain separate; reset replaces only AIFi's state.

## Future Runtime Work

If ChatGPT plan access is implemented, use AIFi's official OAuth registration
and protect its account-specific tokens in local or user-controlled runtime
storage. Keep model permission separate from application sessions and Schwab or
Plaid authorization. The researched requirements and current availability are
recorded in [ChatGPT sign-in and plan usage](design-docs/chatgpt-auth-and-plan-usage.md);
no credential handling is implemented yet.

Before live provider access or infrastructure, extend this file with:

- authentication and authorization boundaries
- secret storage and rotation rules
- data retention policy for research archives and generated artifacts
- dependency and vulnerability scanning for the chosen stack
- deployment rollback and incident-response expectations
