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
  snapshots, and cached CLI reads. Its internal directory/store packages are
  shared by commands; future scheduling/transport can compose the same packages.

Dependency direction: applications compose ui; ui consumes core and platform.
Core never imports React or Electron. Renderer code has no Node or unrestricted
filesystem access. Workspace state stays local. Directory collection/settings run through the Go
host; model, price/fundamental and broker adapters remain future work.

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
pages share this state. Stocks uses symbol/tab hash routes, deterministic local
OHLCV/statement fixtures, and empty structures for unsupported datasets. Quotes
and positions are examples, and chat responses are illustrative. These contracts
are separate from live directory settings/scheduling below. Market charts and
financials remain fixtures; directory scheduling and paged directory reads are implemented.

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

## Future Model Access and Identity

The local research runtime may offer ChatGPT plan usage through the official
open-source OAuth flow as an optional model access path alongside user-supplied
API keys and other providers. Keep application identity, inference permissions,
and brokerage authorization separate. The plan route needs its own capability
adapter; it does not support every ordinary API feature. Website identity-only
login and a company-operated hosted service require separate eligibility
decisions. No authentication runtime is implemented. See
[ChatGPT sign-in and plan usage](design-docs/chatgpt-auth-and-plan-usage.md).

## Stock Data Foundation

The first live collector is implemented in apps/cli: two official Nasdaq Trader
files, validated source blobs, atomic SQLite directory snapshots, sync outcomes,
and cached reads. App hosts now start a private-stdio Go service with a configurable
directory schedule, durable requests, bounded retry and existing sync leases.
SQLite v2 preserves v1 data and adds revisioned settings/encrypted credential blobs.
Electron uses a narrow IPC bridge; local Web uses an authenticated same-origin
loopback bridge. Node encrypts credentials before Go storage; status never returns
saved plaintext. The shared renderer manages sources/sync settings, while market
bars and SEC adapters remain unimplemented. Stocks reads real cached directory names,
exchange codes and membership; quotes/profiles/financials remain samples.
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
cloud implementation can satisfy the same domain contract or preserve the bridge
and delegate host reads to cloud transport. The UI does not choose SQL/URLs/auth.
See [directory read contract](design-docs/stock-directory-reads.md).

The proposed [stock collections design](design-docs/stock-collections.md) moves
the Stocks selector toward All US listings, S&P 500, Nasdaq-100 and the existing
watchlist. Built-in universe/index lists are system-maintained and not user-editable;
watchlist contents remain user-owned. Named personal groups and additional markets
are deferred. Scoped reads/index snapshots are planned, not implemented.

## Decorative Company Assets

An independently injected StockLogoRepository serves stock avatars. Node host
verifies cached directory membership through Go, resolves a bundled/locally cached
reviewed company catalog first, then falls back to exact-symbol FMP images. Bounded
public PNGs use a private device cache; a validated background manifest refresh
runs at most daily. Valid disk images return before background refresh; a bounded
renderer session cache reuses data URLs and supports immediate avatar remounts.
A bounded disk-only batch port warms renderer images before each directory page
is presented; slow provider retrieval stays separate. Only data URLs reach the renderer. Directory/list/financial
contracts and CSP stay separate. See [logo boundary](design-docs/stock-logos.md).
