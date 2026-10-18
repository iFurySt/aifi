## 2026-10-18 09:58 | Task: Repair enrichment sources and whole-directory throughput

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6 based Codex
- Runtime: Codex desktop, local repository

### User Query

> Investigate low company profile, analyst and institutional coverage, improve
> collection and continue filling the whole stock directory.

### Changes Overview

- Added a fixed-endpoint, no-key Nasdaq profile/target consensus backup with
  identity/range validation, independent configurable budget and actual provenance.
  Eligible failed Yahoo work or a first attempt queued for ten minutes enables it;
  good primary data, alternate source choices, pauses and leases remain protected.
- Replaced sixteen per-symbol manager histories with shared complete 13f reports,
  bounded parsed indexes and immutable archived evidence references. One newest
  unambiguous CUSIP anchors all managers; options, principal balances, changed
  identities, missing reports and confirmed absences remain distinct.
- Fixed the store/consumer TTL mismatch, validated reports before caching,
  repaired invalid stages, retained offline/restart reads and allowed warm local
  materialization to yield 50 ms instead of sleeping one second per company.
- Added bounded startup SQLite contention retries and nonfatal progress contention;
  missing public Yahoo pages now retry on the dataset cadence instead of minutes.
- Updated Sync budget/source labels, coverage accounting, source/security/reliability
  documentation and the active rollout plan. The independent worker is running
  the new code and continues writing only through SQLite.

### Validation

Isolated own-change Go race suites and vet; TypeScript and core research/funds
regressions; production web build; isolated light/dark/narrow select interactions.
Tests cover fallback timing/pauses/races, source identities and targets, immutable
references, offline reopening, cache restart/TTL/invalid-response repair, unknown
source tickers, options/principal exclusion, changed CUSIPs and cross-manager
ambiguity. Fifty-one downloaded reports / 20,017 common-share rows also passed
an opt-in local parser regression without further network access.

### Operational Limits

Whole-directory completion is not claimed. Nasdaq supplies target consensus,
not individual grades/five-level distributions; the institutional source remains
a sixteen-manager sample. Its first full shared history cache is still warming;
no complete v2 company window was published at the recorded checkpoint. Actual
populated counts and remaining validation live in the
[active rollout](../../exec-plans/active/enrichment-throughput.md). Successful
sources and empty observations remain separate, and reads never trigger collection.
