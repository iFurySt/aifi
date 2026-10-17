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
files. The UI reports a scan time, manual Refresh and a descending file list;
equal sizes use path ordering. `stock-logos/v2` is represented by one directory
entry with recursively summed bytes and its underlying regular-file count;
individual cache images are omitted. Other files remain individual entries.
`fileCount` counts actual regular files; `entryCount` counts displayed file/folder
rows and governs pagination. Empty logo-cache directories still appear. A moving collector can change file lengths while
a scan is in progress; refresh provides a new observation.

The separate Database contents breakdown uses Go-owned `dbstat` pages joined to
`sqlite_schema`, assigning both table and index pages to price history, research
snapshots, source evidence, directory/index data, or sync/settings. Unknown tables
fall into sync/settings. SQLite schema, free pages and remaining allocation are
reported as unused pages/overhead. This is logical SQLite allocation in a single
read snapshot; committed WAL pages may not yet be in the main file, and WAL may
hold several revisions of a page. Do not add logical database bytes to file bytes.
No checkpoint, vacuum, migration, cleanup or data deletion is performed.

## Capability boundaries

- `storage.database` is a private Go RPC returning only category sizes. The
  renderer cannot invoke it directly. Its read has an eight-second deadline.
- Node `LocalStorageUsage` inventories metadata asynchronously after the Go read,
  bounded to 100,000 entries, ten seconds of iteration and 2,048-character paths.
  Concurrent refreshes coalesce. Failures do not replace the previous snapshot.
- Public `storage.read` returns totals, categories, timestamp and the first 50
  files with a snapshot ID. `storage.files` reads successive 50-file pages from
  that inventory without rescanning. Refresh replaces the snapshot; stale page
  requests require a refresh. File contents and credential values never appear.
- `storage.reveal` accepts only a relative inventory file, the collapsed logo-cache directory, or the empty root path.
  Before file reveal, Node checks the current root, every ancestor and the file;
  traversal, absolute paths, symlinks, missing files and non-files are rejected.
  Electron main supplies `shell.showItemInFolder` for files and `shell.openPath`
  for directories, behind the existing trusted top-frame IPC checks. No shell command
  or unrestricted filesystem API enters the renderer. As with any native reveal,
  a concurrent same-user filesystem rename can race these metadata checks.
- Web uses the same authenticated loopback metadata capability, has no native
  reveal callback, and offers Copy path. Native macOS actions are Open folder
  and Show in Finder; other desktop hosts use Show in folder.

The UI retains successful totals/files throughout refresh and on errors. Scan
requests are independent of the Settings status poll. Existing Reset workspace
continues to reset demo workspace state, not collected research or local files.

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
