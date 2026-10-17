# Security

AIFi includes a local Web/Electron demo, a Go directory collector, and pinned
JavaScript/Go dependencies.
There is no hosted backend or broker connection. Desktop ChatGPT credentials
and requests are handled by a separate Node-host capability.
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
  are denied. Explicit links to allowlisted primary HTTPS research hosts open in
  the system browser without granting renderer navigation or network access.
  ChatGPT authorization and usage actions also open fixed official destinations
  from the main process, without accepting renderer-supplied URLs.
- Production Web CSP permits same-origin local requests/assets and denies frames;
  development also permits fixed localhost HMR. Electron intercepts resource
  requests: production files are restricted to built app assets, private key/DB
  files are denied, and market-provider requests stay in the Go host.
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

## Desktop ChatGPT Connection

The desktop host uses official dynamic registration, PKCE/state/nonce and signed
OIDC identity verification. Granted plan scope gates inference separately.
The dedicated IPC returns sanitized display state and text only. Credentials
stay in bounded AES-GCM encrypted files with a private device key, 0600 files
and atomic replacement, outside workspace storage. File transactions serialize
refreshes across runtimes. Sign out clears local tokens even when revocation
cannot be confirmed, with an explicit recovery message. Credentials and callback
URLs are never logged; remote error bodies are not exposed. Node host requests
use fixed HTTPS endpoints, verified TLS, rejected redirects and size/time bounds.
Renderer request permissions remain unchanged; Vite denies the credential subtree.
This file-key vault does not resist same-user filesystem access. See
[desktop connection](design-docs/chatgpt-desktop-connection.md) for scope, limits
and live-account verification status.

## Future Runtime Work

Before live provider access or infrastructure, extend this file with:

- authentication and authorization boundaries
- secret storage and rotation rules
- data retention policy for research archives and generated artifacts
- dependency and vulnerability scanning for the chosen stack
- deployment rollback and incident-response expectations

## Company Logo Assets

The Node host also owns one decorative public PNG adapter. Allowlisted stock.logo
accepts a symbol; the disk-only stock.logos.cached capability accepts at most
50 symbols with two concurrent batches and an 8 MiB data-URL response budget.
Both verify current directory membership through Go. Image downloads fetch only the fixed
FMP image path or reviewed Tactical Resources PNG upload path. Catalog metadata
is read only from the fixed company-logo-catalog GitHub URL, with bounded reads,
schema validation, exact aliases and approved image origins. Reviewed images must
match recorded checksums/dimensions; unreviewed entries do not become catalog
results. No key, cookie, user path or arbitrary endpoint reaches the provider. TLS remains verified, redirects are rejected, size/dimensions/MIME are
bounded, and PNGs are private local cache files. The renderer receives data URLs;
remote image/script permissions are not widened. See
[logo capability](design-docs/stock-logos.md) for limits and cache/shutdown behavior.

## Stock Collections

Directory read scopes are an allowlist. Only the personal watchlist scope accepts
up to 50 symbols; callers cannot replace built-in index members. Scoped SQL uses
bound parameters. Current reviewed index seeds are bundled and imported atomically
by Go; the renderer has no source URL, database-write or built-in mutation route.
Personal watchlist symbols travel only over the existing local IPC/loopback bridge,
never to the public constituent sources. Public index refresh is a maintainer
reviewed script/commit, not an arbitrary runtime endpoint.

## Research providers

The local Go collector reads the private vault key to decrypt saved Massive/FMP
credentials only in memory. Requests use fixed HTTPS provider hosts, reject
redirects, bound response bodies and sanitize provider/transport errors. Massive
auth uses a header; required FMP query credentials are removed from stored source
URLs. SEC requests require a user-supplied identifying contact. No raw provider
error body, credential or vault-read operation is exposed to the renderer.
Research evidence is gzip-compressed in SQLite; normal page reads contain bounded
normalized data and provenance, never raw evidence or secret blobs.

Yahoo daily prices use only the fixed public HTTPS chart host/path and an app
User-Agent. They require no key, cookie, browser account or credential retrieval.
Redirects and response limits remain enforced. Symbol mapping is bounded and
validated against the returned identity/currency/timezone. Yahoo's unofficial
endpoint and personal data-use terms are explicit in the ingestion design.

Keyless company collection additionally reads the fixed Yahoo public profile
page and fundamentals-timeseries path. It uses no cookies, crumb, login or
browser session. Public embedded JSON is parsed as data, never evaluated; page
HTML/scripts are neither persisted nor rendered. Identity, currency and period
values are checked; arbitrary embedded URLs are never fetched. Filings link to
SEC only after validating symbol/issuer/accession paths. Website fields are
normalized HTTPS strings, not additional renderer network permissions.

Storage settings exposes only local file metadata and SQLite category totals.
The bounded inventory skips symlinks. Desktop reveal accepts an inventory-relative
file/root, rechecks containment and ancestors, and delegates fixed native APIs
through trusted top-frame IPC. Web has no native callback. No file-read, SQL,
credential-content, delete or arbitrary command capability is added. See
[storage boundaries](design-docs/storage-usage.md).
