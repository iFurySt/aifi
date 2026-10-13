## [2026-10-13 12:00] | Task: Stock directory collection foundation

### Execution Context

- Agent ID: `root`
- Base Model: `GPT-6`
- Runtime: `Codex desktop`

### User Query

> Start the collection foundation with SQLite and stock-directory requests.
> Research suitable APIs using the three archived projects and primary web docs.

### Source Selection Milestone

- Chose documented Nasdaq Trader bulk files for the keyless initial directory.
  Massive reference remains future type/CIK/FIGI enrichment; SEC is a later
  company/filing linkage, not the authoritative listing universe.
- Inspected pinned OpenBB directory/SEC helpers, Dexter market-data client/tool,
  and AI Hedge Fund's company/price client without executing or copying them.
- Both official public requests returned 200: 5,629 Nasdaq rows and 7,667 other
  listed rows. Recorded source creation markers and the legacy trailer shape.
- Documented candidate-versus-common-stock coverage, opaque provider aliases,
  original-source attribution, and the bounded implementation plan.

### Design Intent

A successful full, validated directory snapshot must be atomic. Preserve source
provenance/history and last good data through failure; avoid claiming listing
identity or security types that the source does not establish.

### Files Modified

- `docs/references/stock-directory-sources.md`
- `docs/exec-plans/active/stock-directory-foundation.md`

### Runtime Milestone

- Added pinned Go/Cobra/CGO-free SQLite dependencies and a small request/parser,
  transactional store, and CLI command separation under apps/cli.
- Implemented manual sync/list/status, immutable source hashes/snapshots, listing
  IDs and provider aliases, atomic head replacement, source-generation/shrink
  guards, and bounded request/body/context limits.
- Added durable sync outcomes and a bounded lease: concurrent sync fails clearly,
  expired runs can be reclaimed, and stale owners cannot write. Automatic
  scheduling and the broader multi-dataset job queue remain unimplemented.
- Live source quirks: accepted the documented legacy trailer width; retained new
  alphabetic exchange code F without an invented name/MIC. Other non-ETF types
  remain unknown, rather than classifying by company-name heuristics.
- Extended local/GitHub CI with pinned Go setup, gofmt/vet/race tests and a
  CGO-disabled build. Updated CLI, architecture, security/reliability, frontend
  boundary, provider/design plans, README, and release notes.

### Validation

- Public sync imported 13,296 original security rows, 7,488 candidates, and
  28,630 source-convention aliases. Cached AAPL/MSFT/NVDA queries succeeded.
- Repeated sync reused the snapshot. SQLite integrity/foreign-key checks passed;
  source bytes and normalized membership commit together. Initial DB: 17.6 MB.
- Authored fixture/local-server tests cover malformed/truncated/oversized/HTML
  responses, HTTP 403/429, cancellation, checksum rejection, rollback, stale
  sources, large shrink, literal search, history/reappearance, and crash/lease
  recovery. No CI test calls a live provider.
- make ci passed: repository gates, eleven frontend tests/builds and Go vet/race
  checks/pure-Go build. macOS CLI executed; Linux/Windows builds passed without
  claiming their native runtime was tested.
- A configured Go module proxy returned 502 during dependency verification; using
  the official proxy resolved it with checksum verification still enabled.

### Remaining Scope

The renderer still uses samples. Directory-to-UI reads, stronger type/identity
enrichment, price/fundamental collection, automatic scheduling, retention, and
transport are future milestones; no provider secrets or renderer privileges were
introduced. SQLite data and live evidence are excluded from tracked source.
