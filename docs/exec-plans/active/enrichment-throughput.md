# Company, analyst and institutional enrichment throughput

## Goal

Resolve source failures and request amplification in whole-directory enrichment,
continue collecting real data, and report coverage without counting empty results
or queued jobs as populated datasets. Preserve collect → SQLite → local reads.

## Findings

- At the first checkpoint profiles had 1,422 `invalid_company_page` failures and
  analyst jobs 426; Yahoo's public Agilent profile itself lacked profile data.
  Anonymous Nasdaq public company/target endpoints returned real matching data.
- Institutional collection used one symbol-to-CUSIP query plus sixteen manager
  history queries per symbol: roughly 127,000 requests for 7,484 candidates.
  Its shared profile/history cache requested 7/30-day TTLs but the store discarded
  all staging after 24/48 hours.
- A validated manager's complete report endpoint contains every symbol/CUSIP
  position. Shared report collection can replace per-symbol remote histories.

## Milestones

- [x] First-class, attributed and budgeted Nasdaq fallback for failed Yahoo
  company/analyst jobs, also rescuing first jobs queued for ten minutes; preserve
  good Yahoo snapshots and user source choices.
- [x] Cache/normalize whole institutional reports once, reuse local symbol
  lookups and immutable shared evidence, preserve option/identity/absence checks.
- [x] Honor source-specific cache lifetimes and retain resumable work.
- [x] Regression tests, real source samples and live worker rollout.
- [x] Record measured before/after coverage and remaining upstream gaps.
- [ ] Verify the first complete shared institutional company window and measure
  post-warmup publication throughput before declaring rollout complete.

## Validation and constraints

No tokens/accounts or paid plans are added. New requests use fixed endpoints,
bounded parsing, shared budgets/backoff and persisted source provenance. Source
identity, class/CUSIP ambiguity, options, missing reports and real zeros must stay
distinct. Ordinary reads remain network-free, and failed collection cannot erase
last-good data. Verify restart reuse and actual writes, not only fixture parsers.

Nasdaq quotas remain local configurable request budgets, not a claim of a
published provider entitlement. No completeness or real-time-data guarantee.

## Rollout checkpoint

The implementation passes provider/store/engine/CLI race regressions, TypeScript,
core research/funds checks, a production web build and isolated light/dark/narrow
select interaction checks. New tests cover fallback gating/primary races and
pauses, target validation, immutable evidence references/offline reopening,
restart cache reuse, invalid-cache repair, options/principal exclusion, report
absence, unknown tickers, changed CUSIPs and cross-manager identity conflicts.

The standalone collector is running the new adapter. Real Nasdaq profile and
target snapshots have been published for previously failing companies (including
Agilent, Accenture, Analog Devices, Arch Capital and ADM). The institutional
adapter is still building its first shared historical window. Collected reports
are real validated data, but are not yet a fully published company window. Initial
cache construction, source gaps and coverage counts remain under observation;
this plan and the whole-directory rollout stay active.

Warm report indexes have both report-count and total-position bounds. The newest
unambiguous ticker/CUSIP anchors every manager, preventing older managers from
introducing a different security at a reused ticker. Only validated responses
enter the seven-day source cache; a malformed old stage is refetched rather than
poisoning every subsequent company. Warm materialization yields 50 ms per company,
while actual HTTP still passes the unchanged configured provider budget.

## Measured checkpoint

At 2026-10-18T01:58:08.063128Z UTC, the 7,484-candidate local audit reports:

| Dataset | Before (01:43 UTC) | Checkpoint populated | Nasdaq backup |
| --- | ---: | ---: | ---: |
| profile | 929 | 1060 | 121 |
| analyst | 867 | 897 | 25 |
| funds | 139 | 143 | 0 |

The institutional checkpoint is still mostly the old collector's published
snapshots. Do not attribute that small increase to the new batch throughput:
its shared historical reports are still warming and no complete v2 company
window had been published at this checkpoint. Fifty-one actually downloaded
reports (20,017 eligible common-share rows) passed the opt-in parser regression;
additional reports continue to stage durably. Empty tracked-manager responses
are counted separately and do not imply no institutional ownership.

Nasdaq now also rescues a never-attempted primary job after ten queued minutes,
so the remaining whole-directory backlog need not wait for a Yahoo failure
before any data can appear. Good primary heads, source choices, pauses and
independent budgets remain protected. Verify a complete shared company window
and post-warmup throughput before closing this rollout.
