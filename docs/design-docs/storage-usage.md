# Local storage usage

Implemented in Settings → Storage, 2026-10-17. This view reads local metadata;
opening it, refreshing it or paging files never invokes a source collector.

## What is counted

The overview sums regular file lengths recursively inside `AIFI_DATA_DIR` (or the
host's default data directory). It excludes the application bundle and the
browser/Electron profile's workspace/localStorage, browser cache and OS metadata.
Symlinks and special files are skipped. These are file lengths, not filesystem
allocated-block measurements or the computer's available capacity.

File categories are SQLite (`aifi.sqlite`, WAL/SHM/rollback journals), company
logos (`stock-logos/`), account/settings (`chatgpt/`, vault key), and all other
files. The UI offers manual Refresh and a descending file/folder list; the scan
time is in the Refresh tooltip. Equal sizes use path ordering.

Only individual files strictly larger than 50 × 1,024 × 1,024 bytes appear as
file rows. All smaller files (including exactly 50 MB) roll into their top-level
data-directory folder, recursively. Root-level small files share one **Data
folder** row. Each standalone large file is excluded from that directory's size
and file count, so summing all rows equals the total without double counting.
Folders containing only standalone large files are omitted; genuinely empty
folders can remain as zero-size rows. `fileCount` counts underlying regular files;
`entryCount` counts displayed rows and governs pagination.

There is no standalone absolute data-path row or Open folder button above the
list. Each directory row opens its folder; each large file can be revealed in
Finder. Web retains per-row path copying. A moving collector can change lengths
while a scan is in progress; refresh provides a new observation.

Database contents is an independent, exact-but-cached diagnostic. Its category
sizes are from the timestamp in the heading tooltip; they are not added to file
bytes. A first scan fills in asynchronously while total usage and files are
already usable. Optional SQL failures affect only this section, retaining any
last-good category values instead of hiding the inventory.

Go streams `dbstat` pages and maps the small SQLite schema to categories once,
without the former per-page schema join/materialized GROUP BY. Table and index
pages go to price history, research snapshots, source evidence, directory/index
data, or sync/settings. Free pages and remaining allocation are overhead. One
read transaction supplies consistent logical page counts; committed WAL pages
may not yet be in the main file, and WAL may contain several revisions of a page.
See [SQLite DBSTAT](https://www.sqlite.org/dbstat.html). Exact accounting still
visits database pages, so it never runs synchronously in the service request loop.

The accountant has a dedicated **read-only, query-only** pool: one worker plus a
cheap metadata reader. It does not occupy the collector connection. Work coalesces,
is cancellable between streamed pages, and has a 60-second background budget.
Metadata/status reads have a one-second deadline. Successful totals are atomically
saved as private `storage-accounting.json` metadata (version/schema/timestamp/sizes,
no rows or secrets), validated on reopen, and reused for ten minutes. Schema
changes or a smaller logical database invalidate the cache. An expired snapshot
remains visible during revalidation; failures back off for one minute. Shutdown
cancels the worker before closing its reader. No checkpoint, vacuum, migration or
data deletion is performed by inspection.

## Capability boundaries

- `storage.database` is a private Go RPC returning only category sizes. The
  renderer cannot invoke it directly. It returns cheap metadata/cached sizes and
  starts independent background work if needed.
- Node `LocalStorageUsage` inventories file metadata without waiting for SQL,
  bounded to 100,000 entries, ten seconds of iteration and 2,048-character paths.
  Concurrent refreshes coalesce. Filesystem failures do not replace the previous
  snapshot; disappearing subdirectories are skipped. SQL failures never reject
  the file inventory.
- Public `storage.read` returns totals, categories, timestamp and the first 50
  files with a snapshot ID. `storage.details` reads only the small database
  diagnostic snapshot, without rescanning files. `storage.files` reads successive 50-file pages from
  that inventory without rescanning. Refresh replaces the snapshot; stale page
  requests require a refresh. File contents and credential values never appear.
- `storage.reveal` accepts only a relative inventory file or directory, or the empty data-root path.
  Before file reveal, Node checks the current root, every ancestor and the file;
  traversal, absolute paths, symlinks, missing files and non-files are rejected.
  Electron main supplies `shell.showItemInFolder` for files and `shell.openPath`
  for directories, behind the existing trusted top-frame IPC checks. No shell command
  or unrestricted filesystem API enters the renderer. As with any native reveal,
  a concurrent same-user filesystem rename can race these metadata checks.
- Web uses the same authenticated loopback metadata capability, has no native
  reveal callback, and offers Copy path. Native macOS actions are Open folder
  and Show in Finder; other desktop hosts use Show in folder.

A renderer-session `StorageSession` retains totals and expanded file pages across
Settings visits. Re-entry renders that snapshot synchronously and starts a
coalesced background scan, indicated by the Refresh icon (with reduced-motion
support and an accessible updating label). While optional database accounting is
pending, active views quietly recheck only its metadata every 1.5 seconds. Leaving
the page stops those checks; a late result cannot replace a newer file snapshot.
Leaving the page does not cancel the
cache update. Refresh atomically rebases the previously visible page range;
failures preserve the last complete result. Only an uncached first visit shows
Calculating storage. The cache is in memory and does not survive app restart.
Scan requests are independent of the Settings status poll. Explanatory paragraphs,
"Largest first", repeated root-folder labels and the visible scan-time caption
are omitted from the page; technical accounting rules stay in this document. The
legacy demo workspace reset control and its confirmation dialog are removed. Both file and
database category bars and their legends use descending byte order, with the
largest category at the left. Category colors remain stable when sizes reorder,
and segment tooltips identify the matching label and size. The compact icon-only
refresh action sits beside the total; it retains an accessible label, update
spinner and timestamp tooltip. There is no separate This device heading.

## Verification

Store tests verify overflow/index/free-page accounting and category totals;
service tests ensure no provider calls or native capabilities in Go. Host tests
cover WAL/other file totals, pagination, refresh coalescing, metadata-only output,
invalid paths, symlink exclusion/replacement and retained successful snapshots.
`pnpm build && pnpm smoke:storage` uses an isolated renderer/profile and temporary,
offline Go data directory, checking actual accounting, descending files, paging,
native callback dispatch, failure recovery, narrow layout and light/dark themes.
Screenshots/reports are ignored under `.artifacts/storage-ui/`. Native shell
callbacks are recorded during this gate; it does not open the user's Finder.

When checking this feature in the development desktop app, rebuilding main/preload
files does not update an already-running Electron main process. A process started
before a build still uses its loaded host scanner. Restart the app and verify the
visible directory row; refreshing/reloading only the renderer is insufficient.

## Performance evidence

Read-only profiling of an approximately 4 GB working store reproduced the old
query failing its 8-second deadline. Aggregate-mode DBSTAT alone was also slow,
so moving the same scan into foreground code was rejected. File metadata for
about 7,000 regular files took roughly 300 ms. The replacement cold database
metadata request took 2 ms and a cached request less than 1 ms; the exact first
background scan took about 26 seconds and was not on the UI critical path. These
are observed local timings, not cross-machine guarantees.

`AIFI_STORAGE_PROFILE_DIR=<data-directory> go test ./internal/store -run
TestStoragePerformanceRealStore -count=1 -v` runs an opt-in read-only profile from
`apps/cli`. It does not migrate/start collection and writes its cache to a temporary
test folder. Normal tests cover cache reopen/schema invalidation, writer isolation,
last-good fallback, exact totals, and read-only enforcement. The native UI gate
injects delayed/failed database details and proves files appear first and remain
usable through diagnostic failures and recovery.
