# Whole-directory stock backfill

## Goal

Collect every currently configured dataset for every current directory candidate,
persist it in SQLite, and distinguish actual records from empty responses,
unattempted work, retries and unavailable sources. An enqueued job is not coverage.

## Scope and constraints

- All current non-test, non-ETF directory candidates, not only index constituents.
- Existing provider selection, credentials, dataset switches, budgets and fenced
  leases remain authoritative. No paid upgrade or synthetic data.
- Resume from durable jobs; leave fresh snapshots and failed-job backoffs intact.
- A standalone collector can continue this explicitly requested backfill while
  the desktop is closed. Ordinary UI reads remain local and network-free.
- Investigate SEC's documented nightly bulk archives before adding a large
  download dependency; public access and bounded storage must be verified first.

## Validation

Store regressions cover missing-only requests, source/disabled/blocked isolation,
lease preservation, fair first-pass ordering and honest empty-response counts.
CLI/engine tests cover cancellation and progress. Run real collection against the
existing private store and record before/after aggregate coverage without secrets.

## Progress

- [x] Baseline: 7,484 candidates; prices 2,017, profiles 575, facts 1,677,
  filings 1,721, analyst 421 and earnings 348 stored snapshots. Empty snapshots
  have not yet been subtracted from these counts.
- [x] Prevent recurring refreshes and repeated failures from starving first visits.
- [x] Add resumable whole-directory backfill command and record-level progress.
- [x] Verify and run the collector; update real coverage and source constraints.
- [ ] Full directory resolved: records collected or explicit verified source gaps.

## Decisions

- 2026-10-18: Keep free-source quotas; reaching a quota waits for its reset and
  does not count as completion. Keep this plan active until coverage is resolved.
- 2026-10-18: SEC's official archives are accessible (facts about 1.41 GB,
  submissions about 1.57 GB). Actual downloads are slow; private resumable
  downloads run alongside normal collection rather than blocking it. Both the
  3 GiB archive bound and 32 MiB member bound remain enforced. No paths from ZIPs
  are extracted. Record-level audit exposed 68 empty facts observations and
  229 empty insider observations in the initial checkpoint; these are not
  reported as populated data.

## Verified rollout checkpoint

At the 2026-10-18 local rollout checkpoint (00:39 local), standalone workers
were running against the real SQLite store. Compared with standalone startup:

| Dataset | Populated observations at startup | At checkpoint |
| --- | ---: | ---: |
| Prices | 2,043 | 2,091 |
| Company profile | 584 | 594 |
| Financial facts | 1,609 | 1,892 |
| Filings | 1,722 | 2,009 |
| Analyst | 445 | 479 |
| Earnings | 371 | 412 |
| Peers | 1,019 | 1,065 |
| Tracked institutional holdings | 29 | 33 |

These are populated observations, not complete field/history coverage. The
archives were still downloading (roughly 13/15 MiB); no bulk-import success is
claimed at this checkpoint. Normal collectors continue concurrently. There are
515 unmapped SEC securities. A live public Yahoo profile check for Agilent (A)
returned “Profile Information Not Available” and no quote-summary profile JSON;
this is a source gap, not proof that all failed profiles have the same cause.
News remains disabled and requires a separately configured entitled source.

The own-change snapshot passed `go test -race` for store, market, research and
command packages; Windows amd64 and Linux amd64 market-package cross-compilation
also passed. Tests include validated-range resume, private cache reuse, ZIP
identity/path/size validation, missing-only requests, shared-market jobs,
lease fencing, first-pass fairness and empty-result reporting.

Operational progress is emitted each minute by `data research backfill --run`.
The explicitly launched process survives closing the desktop; on machine reboot,
rerun `data research backfill --run --sec-bulk` to resume. No OS login service was
installed. This plan remains active: full coverage has not been achieved yet.
