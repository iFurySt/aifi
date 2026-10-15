## 2026-10-15 | Task: Whole-directory local research collection

### Execution Context

- Agent ID: root
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Implement stock research data in the agreed order for every directory company;
> reserve dedicated settings for external API keys and keep collection local-first.

### Changes Overview

- Backend checkpoint: SQLite v4 research evidence/snapshots/bars, CIK aliases,
  dataset configuration, durable jobs, leases and shared provider request budgets.
- Bounded Massive EOD/reference/actions, SEC mapping/facts/submissions/Form4 and
  optional FMP institution/congress/analyst/news adapters.
- Every imported candidate receives jobs. Missing keys/contact and endpoint
  permissions remain distinct from successfully collected data.
- Second backend checkpoint: resumable institutional pages, source readiness,
  per-request pause checks, auth blocking, manual work with automation paused,
  dynamic interval recomputation and local research CLI diagnostics.
- Go race tests cover restart/fencing, source validation, pagination resume,
  financial restatements, source-secret redaction and all-directory job creation.
- Renderer wiring and final runtime verification are in progress under the plan.

### Design Intent

Collect asynchronously, commit before read, preserve last-good data and source
provenance. All-directory coverage is a measured queue, not a fixture ticker list.

### Files Modified

- `apps/cli/internal/market/`
- `apps/cli/internal/research/`
- `apps/cli/internal/store/research.go`
- `apps/cli/internal/store/schema.sql`
- `apps/cli/internal/service/service.go`
- `docs/exec-plans/active/universe-research-ingestion.md`
