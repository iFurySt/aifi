## [2026-10-18 09:35] | Task: Efficient and resilient Storage inspection

### Execution Context

- Agent ID: `root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Storage keeps calculating and then fails to update. Fix it and make the
> calculation efficient.

### Changes Overview

- Reproduced the old page-by-page DBSTAT/schema-join query timing out against a
  roughly 4 GB working database. File inventory was incorrectly blocked by this
  optional diagnostic.
- Moved exact category accounting into one coalesced, cancellable background
  worker using a dedicated query-only pool. Schema mapping happens once; page
  accounting streams without a SQL join/group materialization per page.
- Interactive requests read cheap metadata and last-good aggregates. Validated
  snapshots persist privately and are reused for ten minutes across restarts;
  schema/shrink changes invalidate them and failures back off.
- File totals/listing run independently, even with unresolved/failed SQL. Optional
  details update through a cheap metadata-only port while the view is active;
  stale replies cannot replace a newer inventory and leaving stops polling.
- Kept directory/50 MB grouping, cached route re-entry, native reveal and private
  credential boundaries. No source collection, vacuum, checkpoint, data deletion
  or storage schema migration was added.

### Design Intent

Exact logical SQLite allocation visits database pages, so moving it to aggregate
SQL alone did not make it suitable for an interactive request. Fast file metadata
supplies usable total/list rows first; exact accounting is independent background
work with a timestamped durable cache. It never occupies the collector's primary
connection or the service dispatch loop. A category failure cannot hide files.

### Validation

- TypeScript and all 325 current workspace tests passed.
- Store/service race suites and Go vet passed; added durable reopen/schema
  invalidation, writer isolation, last-good fallback and query-only tests.
- Opt-in read-only real-store profile: cold metadata approximately 2 ms, cached
  metadata less than 1 ms, exact cold background accounting approximately 26 s.
  A separate file-only profile of about 7,000 files took approximately 300 ms.
  These observations are not universal latency guarantees. Profiling persisted
  its cache in a temporary test folder and never ran migrations/collection.
- Production builds and isolated real-Go Electron Storage checks passed, including
  native actions before delayed SQL completes, optional diagnostic failure and
  recovery, stable paging/re-entry, reduced-copy UI and light/dark/narrow layouts.
- The rebuilt actual app displayed approximately 7 GB of local data and its file
  list immediately while database details updated independently. The completed
  native aggregate cache had matching total/category bytes and private mode.
- Final desktop main/preload compilation passed. A subsequent full shared-tree
  build hit an unrelated in-progress Codex bundling version check (SIGKILL); the
  isolated Storage production build and Electron gate above passed.
- Documentation and diff checks passed. Existing unrelated work was preserved.

### Files Modified

- `apps/cli/internal/store/storage.go`, `storage_cache.go`, `storage_cache_test.go`, `store.go`
- `apps/cli/internal/service/service.go`
- `packages/core/src/data-service.ts`, `storage-usage.ts`, `storage-session.ts`, `storage-session.test.ts`
- `packages/host/src/storage-usage.ts`, `storage-usage.test.ts`, `runtime.ts`
- `packages/platform/src/data-service.ts`
- `packages/ui/src/pages/StorageSettings.tsx`, `packages/ui/src/styles.css`
- Storage Electron gate/fixture and architecture, frontend, reliability, quality,
  design, release and execution-plan documentation.
