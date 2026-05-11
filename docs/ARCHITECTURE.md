# Architecture

This file is the top-level map for AIFi: an agent-first investment research
workspace where reusable AI skills collect, normalize, critique, and synthesize
market information into decision-ready research.

## Intended Repository Shape

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

## Core Domain Objects

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

## Boundary Rules

- Put business logic in reusable packages before spreading it across apps.
- Keep infrastructure and runtime orchestration explicit and versioned.
- Avoid hidden cross-package coupling; document allowed dependency directions once the stack is real.
- When the architecture changes, update this file in the same task.
- Keep source collection, evidence normalization, reasoning, and presentation as
  separate layers so failures and hallucinations can be isolated.
- Require research artifacts to link back to evidence items; synthesis without
  provenance should be treated as draft-only.

## To Fill In For A New Project

- Primary product surfaces and runtime topology.
- Package layering and import boundaries.
- Data flow and persistence model for evidence, generated artifacts, and user
  decisions.
- Observability stack and local development model.
- Compliance posture for investment disclaimers, source retention, audit trails,
  and human approval points.
