## [2026-10-17 00:15] | Task: Keyless company research

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Find and connect keyless financial, announcement and company-detail sources;
> continue asynchronous collection and SQLite persistence.

### Changes Overview

- Added bounded Go adapters for Yahoo public company-page embedded JSON and
  fundamentals timeseries. No authenticated API, browser cookies or Python.
- Profiles retain description/industry/sector/website/country/employees; recent
  filing indices retain validated SEC primary document/index links. Filing bodies
  and complete historic archives are outside this adapter's coverage.
- Financial values retain explicit annual/quarterly vendor periods, decimal
  strings and units. Do not invent fiscal starts, filing dates or accessions.
  Normalize capital-expenditure cash outflow sign to the existing domain rule.
- All directory candidates receive company/facts/filing jobs. Rotate Yahoo
  datasets to prevent price backlogs starving enrichment; share validated public
  page responses for 24 hours with original source timestamps.
- Settings independently select each source; SEC/Massive adapters remain
  available. Company descriptions default to a short expandable preview.

### Design Intent

A fresh local install can collect useful company research without paid-source
setup. Keep Yahoo secondary/vendor data distinct from official SEC dates and
primary documents. Current direct SEC probes return 403; a truthful contact was
requested, with no fake identity or access-control bypass.

### Validation

- Actual AAPL/MSFT/NVDA each persisted company descriptions and 108 financial
  rows; respective recent filing index counts were 80/83/81 at review.
- Real Chrome financial page and app-owned service read persisted data.
- 84 TypeScript tests, Go race/vet, CI and isolated Electron interaction smoke.
- Regressions cover public-page identity/link rejection, cached page reuse,
  explicit annual/quarterly periods, source choice without merging, fair queues,
  offline reopen and preservation after a changed/invalid page refresh.

### Files Modified

- `apps/cli/internal/market/yahoo_company.go`, `yahoo_facts.go` and tests
- `apps/cli/internal/research/engine.go` and tests
- `apps/cli/internal/store/research.go` and tests
- `packages/core/src/stock-research.ts` and tests
- Stock/financial/settings UI and tests
- Architecture, frontend, reliability, security and research-source documents
