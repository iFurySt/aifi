# Storage settings

## Goal

Expose local data-directory disk use, SQLite content categories and a descending
file inventory with a bounded native reveal capability in Settings → Storage.

## Scope and decisions

- Go owns read-only SQLite page accounting, including indexes and free/overhead.
- Node inventories regular files under the configured data directory without
  following symlinks. Totals use file lengths; WAL/SHM are counted once as files.
- Keep physical files separate from logical SQLite page allocation: committed WAL
  pages may not yet be checkpointed into the main file.
- Electron reveals only existing inventory files/root inside the data directory;
  Web shows metadata and permits copying paths without native shell access.
- Refresh on entry/user request, retain successful data on refresh failures, and
  paginate the returned file inventory. Do not poll/scan with general status.
- Preserve existing unrelated work and workspace reset behavior.

## Validation

Go store/service accounting tests; host inventory/symlink/path/concurrency tests;
TypeScript checks and relevant suites; production builds; isolated actual Electron
UI checks for sorting, refresh/error states, reveal dispatch and narrow layout.

## Progress

- [x] Read repository guidance and inspect existing storage/runtime boundaries.
- [x] Implement contracts, accounting and host capabilities.
- [x] Build responsive Storage UI.
- [x] Validate and update docs/history.

## Outcome

Completed 2026-10-17. TypeScript and 122 tests passed; all Go race tests/vet
passed. Isolated production builds, real-Go Electron Storage checks and bundled
desktop smoke passed. Reviewed light/dark/narrow screenshots and the file list.
No schema changes, collection requests, Finder launch during tests or personal
data-directory writes. Reports/screenshots are ignored under `.artifacts/storage-ui/`.
Native Windows/Linux shell integration remains unverified.

Follow-up: collapse `stock-logos/v2` into a directory row, preserve recursive
byte/file totals and sort order, and open that directory through the same native
capability. Added host and actual Electron checks for the roll-up.

Second follow-up: retain the renderer-session inventory across navigation, rebase
visible pages atomically after background refresh, expose progress through the
Refresh icon, and remove redundant page copy. Verify delayed re-entry frame by
frame and restart the actual local desktop so its main process loads grouping.

Third follow-up: remove the standalone path row and group all small files into
top-level directory remainders; extract individual files only above 50 MB. Test
the exact boundary, recursive extraction, root remainder and disjoint totals.
