# Local Data Collection And Reads

Status: repository rule, 2026-10-15. Applies to existing and future structured
source datasets: directories, constituents, prices, company facts, filings,
news and other collected research inputs.

## Required Flow

```text
Provider / future cloud sync source
  → bounded asynchronous collector
  → validate / normalize / commit to SQLite
  → local snapshot read through Go
  → shared Web/Electron UI and research consumers
```

- Collection and presentation are separate operations. Navigation, scrolling,
  pagination, filtering, focus and ordinary reads must not fetch a structured
  dataset from a provider or bypass persistence with a freshly fetched response.
- Persist validated source data and provenance before exposing an updated
  snapshot. Keep source, source date, fetched time and version/hash as appropriate.
  Use atomic replacement/upserts so readers see complete committed versions.
- Run source checks asynchronously with configurable schedules, explicit manual
  sync, bounded requests, deduplication and retry/backoff. Read freshness is not a
  request to recollect. A read-only missing/empty result never starts a hidden sync.
- Readers use stored data immediately, including after restart and while offline.
  Keep the last good snapshot on collection failure. Report missing/stale coverage
  without inventing data or erasing good records. A failed persistent write cannot
  be reported as a successfully stored fresh snapshot.
- Go owns SQLite. The renderer uses an injected read contract; Electron IPC and
  Web's authenticated loopback HTTP are local reads, not provider API calls.
  Local SQL pagination is still allowed; the UI need not hold the entire universe
  in memory. Small local rechecks can discover background imports quietly.
- A future cloud source feeds the same synchronization/persistence boundary.
  Replacing a provider or transport must not silently turn page reads into live
  remote collection. Preserve the replaceable domain port and local-first default.

Binary artwork/documents may use private local files with provenance/references
rather than duplicate large blobs in UI storage. Existing decorative logos have
a bounded cache-first acquisition path; that asset loader is not a template for
structured financial-data reads. Credentials remain in their protected host
boundary, never plaintext collection rows or browser storage.

## Current Directory Evidence

`directory.list/get/contains` dispatch to SQLite reads; only directory sync or
scheduled collection invokes the directory fetcher. The directory and reviewed
index snapshots already survive restart. Read regressions reopen the actual
store with an unavailable provider and exercise paging, scoped search and exact
lookup without any fetcher calls. Index seed refresh remains a reviewed repository
update until its asynchronous collector is implemented.

A local paged read can show an inset append status. A periodic head check retains
visible rows and must not announce “Loading more” as if a page were appended.

## Check New Integrations

Prove persisted/offline restart reads, zero provider calls during ordinary reads,
atomic updates, last-good behavior, source timestamps and bounded sync/retry.
Document schema changes and scheduling ownership with the implementation.
