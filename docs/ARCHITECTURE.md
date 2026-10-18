# Architecture

This file is the top-level map for AIFi: an agent-first investment research
workspace where reusable AI skills collect, normalize, critique, and synthesize
market information into decision-ready research.

## Local Application Topology

The first executable surface is a local Web/Electron workspace:

- apps/web mounts the shared React renderer through Vite.
- apps/desktop owns Electron main and sandboxed preload; production loads the
  Web app's built HTML and assets.
- packages/ui owns shared pages, components, and Tailwind design tokens.
- packages/core owns domain contracts independently of UI and host APIs.
- packages/platform adapts browser storage and allowlisted local data capabilities. Node-only packages/host owns child lifecycle,
  local transport and credential encryption; it never enters the renderer bundle.
- apps/cli owns the Go/Cobra collector: Nasdaq directory requests, SQLite
  snapshots, research jobs/providers, and cached CLI reads. Internal market, research,
  directory and store packages separate collection, scheduling and persistence.

Dependency direction: applications compose ui; ui consumes core and platform.
Core never imports React or Electron. Renderer code has no Node or unrestricted
filesystem access. Workspace state stays local. Directory collection/settings run through the Go
host. Desktop ChatGPT authorization and text inference run in the Node host;
research tool execution and broker adapters remain future work.

The shared Shell separates outer application chrome from the inset sidebar and
scrolling document panel. The outer rail owns application navigation; the inner
sidebar owns stock selection. Stored conversations stay selectable inside Chat.
Host metadata chooses native desktop versus browser headers. The desktop toolbar
uses browser route history with session bounds; window controls remain native. A narrow top-frame data IPC allowlist reaches the
app-owned Go child without exposing process/filesystem APIs.

## Repository Shape

- `apps/`: deployable applications or entry points, such as a research console,
  scheduled research runner, or portfolio review surface.
- `packages/`: shared libraries and contracts for skill definitions, source
  connectors, evidence stores, research artifacts, scoring, and report assembly.
- `infra/`: deployment, infrastructure, data stores, queues, secrets, and
  scheduled job definitions.
- `scripts/`: repository automation that agents can run directly.
- `skills/`: reusable AIFi research skills, one skill per subdirectory, with
  concise `SKILL.md` entry points and detailed references loaded on demand.
- `research/`: persistent research archive for target profiles, source
  evidence, raw files, generated artifacts, and reusable findings.
- `docs/`: the repository knowledge base and system of record.

## Product Shape

AIFi composes small research skills into larger workflows. For example, a user
asking "what is happening with Intel recently?" should trigger independent
collection and analysis steps for filings, earnings, news, market data,
competitive context, supply chain signals, analyst sentiment, risk factors, and
thesis synthesis. The final artifact should preserve the evidence trail instead
of only presenting a polished answer.

The product is investment decision support, not autonomous trading or regulated
financial advice. The system should make uncertainty, source quality, date
coverage, and unresolved questions visible.

## Local Demo Data Flow

The renderer loads a versioned workspace through packages/platform, validates it
through packages/core, and supplies it to page components through one context.
User actions update immutable state; changes persist locally. Core rules
validate agent prompts, ticker symbols, paused checks, and stored shapes. Seven
pages share this state. Stocks uses symbol/tab hash routes and source-backed local research reads, with
empty states for unavailable datasets. Watchlist uses stored closing prices.
Portfolio positions remain illustrative. Chat uses the connected ChatGPT plan;
legacy sample replies stay labeled. Directory/research
scheduling and settings are independent of page navigation.

## Intended Research Domain Objects

- `Skill`: a bounded AI-capable operation with declared inputs, outputs, source
  requirements, cost profile, and quality checks.
- `Workflow`: an ordered or graph-shaped composition of skills that produces a
  research artifact.
- `ResearchTarget`: a company, ticker, sector, macro theme, portfolio holding,
  or watchlist item under investigation.
- `EvidenceItem`: a sourced fact, quote, metric, filing excerpt, chart datum, or
  retrieved document fragment with timestamp and provenance.
- `ResearchArtifact`: a report, memo, dashboard section, alert, or investment
  thesis generated from evidence.
- `DecisionFrame`: a structured output that separates facts, interpretations,
  risks, open questions, and possible portfolio actions.
- `PortfolioExposureReview`: a structured artifact that connects a target or
  watchlist idea to portfolio context, concentration, liquidity, correlation,
  drawdown contribution, and user-controlled sizing considerations.

## Boundary Rules

Source data follows [collect → persist → local read](design-docs/local-data-contract.md):
asynchronous collectors commit structured datasets to SQLite; normal page reads,
filters and pagination never trigger remote collection. Go owns the durable store.

- Put business logic in reusable packages before spreading it across apps.
- Keep infrastructure and runtime orchestration explicit and versioned.
- Avoid hidden cross-package coupling; follow the dependency direction above.
- When the architecture changes, update this file in the same task.
- Keep source collection, evidence normalization, reasoning, and presentation as
  separate layers so failures and hallucinations can be isolated.
- Require research artifacts to link back to evidence items; synthesis without
  provenance should be treated as draft-only.

## Deferred Brokerage Connectivity

Future account connectivity should prioritize direct Schwab access for the
maintainer's portfolio and preserve Plaid as an optional aggregation path for
other self-hosted users. Portfolio data, market data, and order execution should
have separate capability boundaries. This is a recorded direction, not a
runtime implementation or first-wave commitment. See the
[Schwab and Plaid connectivity direction](design-docs/broker-connectivity-direction.md).

## Desktop Model Access and Identity

The desktop Node host implements official open-source ChatGPT OAuth, protected
account registrations, model discovery and bounded streaming text inference.
Electron exposes a separate allowlisted capability without tokens or remote
renderer access. Application identity, inference permission and brokerage access
remain separate. API-key providers and research tool execution are future work.
Web currently directs model connection to desktop. See
[desktop connection](design-docs/chatgpt-desktop-connection.md) for implementation
and live-validation status, and
[plan research](design-docs/chatgpt-auth-and-plan-usage.md) for feature restrictions.

## Stock Data Foundation

The first live collector is implemented in apps/cli: two official Nasdaq Trader
files, validated source blobs, atomic SQLite directory snapshots, sync outcomes,
and cached reads. App hosts now start a private-stdio Go service with a configurable
directory schedule, durable requests, bounded retry and existing sync leases.
SQLite v4 preserves prior directory/settings/credential data and includes reviewed
index snapshots, memberships and immutable source provenance.
Electron uses a narrow IPC bridge; local Web uses an authenticated same-origin
loopback bridge. Node encrypts credentials before Go storage; status never returns
saved plaintext. The shared renderer manages sources/sync settings, and research dataset controls. Stocks reads cached directory names,
exchange codes, membership and sourced research snapshots; unavailable datasets
remain empty and require configured source access.
The [design](design-docs/us-stock-data-pipeline.md) and
[implementation plan](exec-plans/active/us-stock-data-foundation.md) define the
remaining boundaries; see [directory commands](../apps/cli/README.md) and
[source selection](references/stock-directory-sources.md).

## Deferred Architecture Work
- Data flow and persistence model for evidence, generated artifacts, and user
  decisions.
- Observability stack and local development model.
- Compliance posture for investment disclaimers, source retention, audit trails,
  and human approval points.

See [app-owned service](design-docs/app-data-service.md) for lifecycle, transport,
credential boundaries, settings and remaining scope.

## Replaceable Stock Reads

Core `StockDirectoryRepository` defines search/get without host APIs. Platform
provides the local adapter; App injects it into shared UI context. Electron reads
through preload/main/private Go RPC, while Web uses the authenticated loopback
bridge. Main owns the service capability; Go remains the SQLite owner. A future
cloud source can synchronize into SQLite behind the same domain contract and
bridge. Ordinary page reads stay local. The UI does not choose SQL/URLs/auth.
See [directory read contract](design-docs/stock-directory-reads.md).

The [stock collections design](design-docs/stock-collections.md) defines All US
listings, S&P 500, Nasdaq-100 and the existing watchlist. Scoped read contracts
and SQLite snapshots are implemented. Bundled, reviewed dated index membership
works offline; source refresh currently requires a reviewed repository update.
Built-ins have no membership-write operation; watchlist symbols remain in existing
workspace storage. The shared selector remembers personal viewing state separately from the unchanged
workspace schema. Search and incremental reads stay inside the selected collection.

## Decorative Company Assets

An independently injected StockLogoRepository serves stock avatars. Node host
verifies cached directory membership through Go, resolves a bundled/locally cached
reviewed company catalog first, then an explicit best-effort PNG availability
supplement, then exact-symbol FMP images. Provisional image observations remain
separate from reviewed issuer identity. Bounded
public PNGs use a private device cache; a validated background manifest refresh
runs at most daily. Valid disk images return before background refresh; a bounded
renderer session cache reuses data URLs and supports immediate avatar remounts.
A bounded disk-only batch port warms renderer images before each directory page
is presented; slow provider retrieval stays separate. Only data URLs reach the renderer. Directory/list/financial
contracts and CSP stay separate. See [logo boundary](design-docs/stock-logos.md).

## Research collection implementation

SQLite v4 adds immutable compressed evidence, research snapshots, source-basis daily bars,
CIK aliases, dataset settings, durable fenced jobs and shared provider budgets.
The app-owned Go service now runs bounded Yahoo/Massive/SEC/FMP workers independently
of reads. Every directory candidate gets enrichment jobs; market-date jobs cover
the full market. Yahoo is the default keyless daily-price source, with explicit
split-adjusted series and full-directory per-listing jobs; Massive is selectable.
Company details, standardized annual/quarterly financials and recent filing
indices also default to Yahoo public sources. Each has its own source selector;
company-page JSON is shared privately for up to 24 hours. Jobs rotate across
these datasets rather than waiting behind the initial price backlog.
Analyst consensus/grades and GAAP earnings/calendar also use public Yahoo analysis
JSON, staged independently from company profiles. Quotes retain regular-session
and post-market observations separately; completed-session scheduling and source
timestamps govern freshness. Other datasets with missing credentials/contact leave work pending. Optional FMP
datasets are disabled by default and may require paid endpoint permissions.
Go can decrypt existing AES-GCM blobs using the private host vault file solely
for collectors; no plaintext retrieval RPC is exposed. Cached research read/status/config/sync methods connect all six stock tabs and
watchlist prices; API keys have their own Settings category.
See [implementation plan](exec-plans/completed/universe-research-ingestion.md).

See [research ingestion](design-docs/research-ingestion.md) for implemented
providers, source windows, job budgets, financial semantics and remaining limits.

## Local Storage Inspection

Go provides cached SQLite page/category accounting through a dedicated read-only
pool and cancellable background worker, outside the service request loop. Small
aggregate snapshots persist across restarts. Node independently inventories file
metadata inside the app data directory and serves descending, snapshot-paged lists;
optional SQL diagnostics never block or fail the file overview.
The shared Storage settings shows both file totals and logical database contents;
Electron main owns a validated native reveal callback. Web offers path copying.
See [storage usage](design-docs/storage-usage.md) for counting rules and limits.

## Reported Stock Activity

Politicians adds a selectable keyless CongressInvests worker under the shared
job/budget/staging contract, retaining optional FMP. Insider jobs use configurable
40/120/240 SEC recent filings with issuer/document checks, typed event semantics
and reported post-transaction holdings. Analyst `outlook:3` jobs refresh Yahoo
consensus/recommendations and per-event targets. These versioned generations
retire obsolete queued work while preserving last-good snapshots. Activity pages
filter and chart only SQLite reads, including after offline restart.

Interactive stock reads now have a separate query-only SQLite pool and bounded
directory/research RPC lanes. App boot warms the selected cached list; optional
logo preparation has an 80ms artwork budget. See
[directory read latency](design-docs/directory-read-latency.md) for boundaries and checks.
