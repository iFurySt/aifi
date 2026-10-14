# Security

AIFi includes a local Web/Electron demo, a Go directory collector, and pinned
JavaScript/Go dependencies.
There is no hosted backend, model credential handling, or broker connection.
Local future market-provider credentials can now be configured.

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
  preload bridge exposing metadata and allowlisted data actions only.
- New windows, navigation/redirects away from the app, and permission requests
  are denied.
- Production Web CSP permits same-origin local requests/assets and denies frames;
  development also permits fixed localhost HMR. Electron intercepts resource
  requests: production files are restricted to built app assets, private key/DB
  files are denied, and remote provider requests stay in the Go host.
- Local storage contains demo research state, not credentials. Do not add tokens
  to this storage adapter; future secrets need a separate protected capability.
- Saved data is validated before use and rendered as text, without raw HTML.
- Browser and desktop data remain separate; reset replaces only AIFi's state.

## Directory Collector

The CLI issues read-only requests to two fixed official Nasdaq HTTPS endpoints;
redirects cannot leave those hosts or downgrade TLS. Requests/bodies are bounded.
No dynamic external endpoint or saved plaintext credential is exposed to the renderer.
Public source fields remain data, stored with original attribution and hashes.
Parameterized SQLite queries and escaped literal search prevent query injection.
The DB is outside tracked source, with restrictive permissions for newly created
files/directories. Source data and SQLite sidecars must not be committed.
Directory collection adds no broker access or cloud calls. Go has no TCP listener;
Electron owns a private stdio child and narrow IPC. Local Web exposes only a bounded,
same-origin loopback bridge with exact Host/Origin/session/method checks.

Provider credentials are encrypted in the Node host with AES-GCM and a private
0600 local key before SQLite persistence. Metadata reads expose only configured
fields. No plaintext retrieval route exists; keys are absent from localStorage,
child arguments, URLs and logs. This file vault does not protect against same-user
filesystem access; back up the private key with the DB when needed. Vite denies
key, SQLite and artifact files, and Electron file access is asset-scoped.
See [service design](design-docs/app-data-service.md) for boundaries and follow-ups.

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

## Company Logo Assets

The Node host also owns one decorative public PNG adapter. Allowlisted stock.logo
accepts a symbol, verifies current directory membership, and fetches only the fixed
FMP image path or reviewed Tactical Resources PNG upload path. Catalog metadata
is read only from the fixed company-logo-catalog GitHub URL, with bounded reads,
schema validation, exact aliases and approved image origins. Reviewed images must
match recorded checksums/dimensions; unreviewed entries do not become catalog
results. No key, cookie, user path or arbitrary endpoint reaches the provider. TLS remains verified, redirects are rejected, size/dimensions/MIME are
bounded, and PNGs are private local cache files. The renderer receives data URLs;
remote image/script permissions are not widened. See
[logo capability](design-docs/stock-logos.md) for limits and cache/shutdown behavior.
