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
- Frontend checkpoint: all stock tabs and Watchlist use replaceable local reads;
  removed generated stock fixtures; added company actions, period-aware financial
  tables, SEC document links and source timestamps/empty states.
- Dedicated API key management plus dataset scheduling/history/quota/coverage UI.
- Real directory inspection queues every one of 7,481 candidates; 522 market-date
  jobs. Missing keys/contact correctly report zero sourced price coverage.
- Native smoke and Chrome desktop/mobile checks passed. Final CI/interaction
  checks and source setup gates are recorded in the implementation plan.

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

### Verification And Remaining Setup

- Repository CI, TypeScript tests/build, Go vet/race and actual Electron smoke pass.
- Chrome Default desktop/narrow-screen settings and six-tab layout checked.
- HTTP-fixture-to-SQLite-to-offline-read integration passes for a non-demo symbol.
- The local 7,481-candidate directory is queued; no market/FMP key or SEC contact
  is configured, so actual sourced price coverage remains zero. No full live
  coverage claim is made. Provider/source-window limits are in the runtime doc.

- Final scale adjustment: corporate actions use one shared market snapshot,
  normalized per-symbol action rows and no per-listing daily refresh requests.
  Immutable SEC Form 4 XML is reused; expired price jobs are retired before keys
  configured later can trigger out-of-window collection.

- Real dual-host startup exposed a quadratic pending-manual lookup while
  re-enqueuing an existing universe. Hoisted it out of per-job values and indexed
  pending manual work. A 12,000-job reconciliation/reopen regression covers
  simultaneous host startup without changing the user's workspace or source data.

- Multi-class company market-cap calculations use the provider's company-level
  weighted share count, with the reference date available in the UI. New York
  zone rules are embedded in the Go binary for standalone host portability.

- Manual issuer expansion now derives from explicitly requested listing jobs.
  Newly added listings and future price sessions cannot inherit an old manual
  request while automation is paused; no manual-scope scan runs per insert.

- Missing vendor data retries conservatively rather than permanently blocking a
  newly listed issuer. Credential master-key filenames are ignored even when a
  user chooses a repository-local custom data directory.
