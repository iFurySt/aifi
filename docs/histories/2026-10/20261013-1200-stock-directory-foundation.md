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
