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
- packages/platform adapts browser storage and narrowly exposed desktop metadata.
- apps/cli reserves a possible Go/Cobra utility when a host binary is needed.

Dependency direction: applications compose ui; ui consumes core and platform.
Core never imports React or Electron. Renderer code has no Node or unrestricted
filesystem access. Mock state stays local; live research runners and provider
connections remain future work.

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
User actions update immutable state; changes persist locally. Core rules validate
agent prompts, ticker symbols, paused checks, and stored shapes. Demo quotes and
positions are static, and chat responses are illustrative. These contracts are
separate from the future evidence/workflow domain below. No scheduler exists.

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

## Deferred Architecture Work
- Data flow and persistence model for evidence, generated artifacts, and user
  decisions.
- Observability stack and local development model.
- Compliance posture for investment disclaimers, source retention, audit trails,
  and human approval points.
