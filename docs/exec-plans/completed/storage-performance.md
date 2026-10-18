# Storage performance and availability

## Goal

Make Storage open reliably as the collected SQLite store grows, without blocking
local reads or hiding the file inventory behind optional database diagnostics.

## Investigation and scope

- Reproduce the existing per-page dbstat/join query and metadata inventory against
  the real growing store using read-only queries; record timings, never contents.
- Replace costly SQL work with bounded aggregate accounting and a separate reader
  if measurement supports it. Avoid adding longer timeouts as the solution.
- Decouple file metadata from database-category failures. Preserve last-good
  content and make first entry usable even when database details are unavailable.
- Reuse expensive results across short revisits; measure file scan cost before
  choosing concurrency/caching changes. Keep 50 MB grouping and native path bounds.
- Preserve all unrelated ongoing work. No collector, checkpoint, vacuum or data
  deletion is part of the fix.

## Validation

Exact category/index/free-page tests, query-plan/performance regression with a
large synthetic store, concurrent writer/read tests, degraded-host/UI tests,
TypeScript and appropriate suites/builds, isolated actual Electron gate and a
read-only timing check on the real store. Update docs/history with measured limits.

## Progress

- [x] Read repository guidance and trace the complete request chain.
- [x] Reproduce bottlenecks and select implementation.
- [x] Implement and test efficient accounting and availability behavior.
- [x] Verify native app and document results.

## Findings

- Approximately 4 GB store: old per-page join/group query timed out at 8 seconds;
  DBSTAT aggregate mode also proved too slow for foreground use.
- File scan of about 7,000 files: approximately 300 ms. Cold category metadata:
  2 ms; cached metadata: below 1 ms; exact background accounting: approximately
  26 seconds. No migrations/source collection were run by the profile.
- Implemented a separate query-only reader, coalesced cancellable background
  work, atomically persisted ten-minute snapshots, schema/shrink invalidation,
  error backoff, independent file inventory and metadata-only active-view polling.

## Outcome

Completed 2026-10-18. TypeScript/current workspace tests, store/service race tests,
Go vet, builds and isolated native UI checks passed. Actual app inspection showed
file totals/listing before optional categories; completed category metadata was
persisted with matching totals and private permissions. Exact cold scans remain
page-count-dependent bounded background work; they are no longer a request or
availability dependency. Native Windows/Linux shell launch remains outside this
macOS verification.
