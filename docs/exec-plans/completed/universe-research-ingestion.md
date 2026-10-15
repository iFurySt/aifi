# Whole-directory research ingestion

Status: implementation completed, 2026-10-15. Live source setup/coverage remains an explicit external gate.

## Goal and authorization

Replace stock research fixtures with durable sourced reads for every candidate in
the imported US directory. The user approved the staged order (prices/identity,
SEC financials/filings, actions/metrics, ownership/activity/ratings), and dedicated
external-key settings. Missing keys/entitlements must not invent data or stall
unrelated datasets. Actual live coverage depends on configured accounts/contact.

## Implementation checkpoints

- [x] SQLite research schema, immutable evidence, resumable universe jobs and leases.
- [x] Bounded provider clients: Massive EOD/reference/actions; SEC identity,
  submissions/facts; optional FMP ownership, congressional trades, ratings and news.
- [x] App-lifetime scheduler, global provider budgets/cooldowns, all-directory
  reconciliation, persisted progress and per-dataset settings.
- [x] Narrow local research read/settings/sync ports and protected credential use.
- [x] Replace Stocks fixtures across all tabs with sourced cached data and computed
  indicators/financial rows; preserve absence and incomplete coverage.
- [x] Dedicated API key settings and dataset coverage/schedule controls.
- [x] Offline/restart, malformed/partial providers, quota/auth failure, financial
  periods, universe expansion, transport and native renderer verification.
- [x] Update architecture/security/runtime/history/release records; stage commits.

## Decisions and limits

- All directory candidates are queued; no hard-coded AAPL-only implementation.
  Candidate listings include non-common instruments; coverage and unsupported
  records are explicit, not assumed to be SEC reporting companies.
- Massive market-day batches feed the whole universe. Background history uses
  dated jobs; metadata uses listing jobs. No per-view external requests.
- SEC mapping is a separate shared source. Issuer facts/filings are keyed by CIK,
  with ticker aliases retained. SEC financials are selected standard entity-wide
  concepts, not a full custom/dimensional XBRL statement reconstruction.
- Optional FMP stable endpoints provide normalized institutional/congressional /
  analyst data. Subscription access must be validated by the user's key; a free
  key does not guarantee these capabilities. Preserve page/window metadata.
- Credentials are encrypted at rest by Node; Go decrypts only inside the local
  collector using the same private file key. No plaintext read RPC exists.
- Provider errors are sanitized. Navigation reads SQLite only. Last-good data
  survives upstream errors, restart and offline reads.

## Verification

Use deterministic HTTP fixtures and temporary real SQLite stores. Prove no
network collection on reads, idempotent job claims, expired-lease recovery,
provider-wide rate/cooldown, cancellation, atomic persistence and correction
handling. Run Go race/vet, TypeScript tests/build, make ci and native smoke.
Do not claim successful live datasets without actual responses and credentials.

## Progress log

- 2026-10-15: inspected existing directory/runtime/vault/UI boundaries and current
  primary provider documentation. Existing research pages use generated fixtures.

- First backend checkpoint: fenced jobs, quotas, source snapshots, CIK mapping,
  market-day history, SEC facts/submissions/Form4 XML and optional FMP adapters.
  Fixture tests cover rollback/restart, leases, budgets, restatements, credentials,
  pagination denial and directory-wide reconciliation. Live keys remain absent.

- Domain checkpoint: replaceable stock-research repository, local read adapter,
  source status/config/sync methods, FMP credential allowlist, fiscal period and
  split/indicator calculations with domain tests. UI integration follows.

- UI checkpoint: all six stock tabs plus Watchlist consume persisted research;
  Financials includes corporate actions, reported earnings and source filing links.
  API key, source contact, history, dataset cadence, budget and progress controls
  exist. Verified Chrome desktop/mobile and native smoke without fixture fallbacks.
- Actual local directory inspection: 7,481 candidates; 522 market-day jobs; all
  candidate enrichment jobs exist. Market/FMP keys and SEC contact are absent;
  actual sourced price coverage is zero. This is a setup gate, not a success claim.

- Final verification: 81 current TypeScript/domain/UI tests, Go race/vet, repository
  CI/build and native smoke/interaction checks passed. End-to-end HTTP fixtures
  collect a non-demo symbol, commit bars/profile/actions/SEC data and reopen the
  SQLite store for offline reads without provider calls. Historical jobs outside
  the selected lookback retire without deleting evidence or blocking new sessions.
- Deliberate limits: no actual vendor key/contact was supplied; no live full-market
  backfill is claimed. Provider window/entitlement restrictions, segmented/IFRS
  statements, future earnings consensus/calendar, short interest and point-in-time
  historical queries are documented in the runtime specification.

- Scale correction: shared market-wide corporate actions replace per-listing
  daily calls; SEC accession XML reuses immutable evidence. This keeps the free
  EOD/reference path practical for the whole directory. Optional FMP throughput
  still depends on the user's plan and configured daily quota.
