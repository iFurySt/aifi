## [2026-10-17 16:07] | Task: Storage settings and file inventory

### Execution Context

- Agent ID: `root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Add Storage to Settings so users can see the space consumed by locally
> collected data, inspect files such as SQLite databases in descending size
> order, and locate the files/data folder in Finder. Image-heavy
> `stock-logos/v2` should appear as a directory rather than individual images.

### Changes Overview

- Replaced the old directory-only cache rows with data-folder totals, category
  meters, SQLite content allocation, timestamp and manual refresh.
- Go accounts for logical table/index/free pages; Node inventories regular file
  lengths and SQLite sidecars, logos, protected-account metadata and other files.
- Collapsed the v2 logo cache into one folder row with recursive size/file count,
  ordered with other files by size and opened as a directory.
- Added snapshot-based 50-entry pages and host-only native reveal validation.
  Desktop opens the root or reveals files; Web can copy paths.
- Kept successful results on refresh failures, excluded symlinks and bounded the
  inventory. No source collection, cleanup, checkpoint or schema migration occurs.
- Documented scope/counting rules and added a disposable real-Go Electron gate.

### Design Intent

File lengths and logical SQLite allocation are separate views: WAL can contain
several versions of committed pages before checkpointing. Their sizes should not
be added together. Native actions expose only inventory-relative paths through
existing trusted IPC; the renderer gets metadata rather than filesystem access.

### Validation

- `pnpm check`; `pnpm test`: 25 files / 122 tests passed.
- `go test -race ./...` and `go vet ./...` passed; store/service race suites also
  rerun after adding the read deadline.
- Production Web/desktop builds and `pnpm smoke:storage` passed in an isolated
  working-copy snapshot. Actual offline Go/Node host, descending inventory,
  stable paging, refresh continuity/recovery, native callback dispatch, Web copy
  controls and narrow/light/dark layouts verified; screenshots visually checked.
- Actual bundled Electron desktop smoke passed in that isolated snapshot.
- Documentation/hygiene checks and `git diff --check` passed.
- Native callbacks were recorded by the UI gate; it did not open Finder. Native
  Windows/Linux shell behavior still needs platform verification.

The final scoped commit was separately exported and verified against its own
base: TypeScript, 113 tests in 24 files, store/service race tests, Go vet,
production builds and the real-Go Electron gate all passed, including collapsed
logo-directory totals, omission of individual images and native folder dispatch.

### Files Modified

- `apps/cli/internal/store/storage.go`, `storage_test.go`
- `apps/cli/internal/service/service.go`, `storage_test.go`
- `apps/desktop/src/main.ts`
- `packages/core/src/storage-usage.ts`, `data-service.ts`, `index.ts`
- `packages/host/src/storage-usage.ts`, `storage-usage.test.ts`, `runtime.ts`
- `packages/platform/src/data-service.ts`
- `packages/ui/src/pages/StorageSettings.tsx`, `Settings.tsx`, `styles.css`
- `scripts/check-storage-ui.mjs`, `scripts/fixtures/storage-ui.tsx`, `package.json`
- Storage design, architecture, frontend, security, quality and release docs.

### Follow-up: entry continuity and concise copy

- The user reported ungrouped PNGs, redundant “Largest first” copy and slow blank
  reloads on every visit. Process/build timestamps confirmed the running desktop
  main predated the grouping build; refreshing the renderer cannot update it.
- Added a renderer-session inventory owner: cached data renders immediately on
  return, background updates coalesce, expanded pages rebase atomically, and
  leaving mid-request still populates the next visit. Errors keep the last view.
- Refresh keeps its label and exposes progress through its icon/accessibility
  label. Removed sort/subtitle/accounting paragraphs, visible scan-time caption
  and repeated “Data folder” labels; scan time remains in the Refresh tooltip.
- Added core session tests and delayed actual-Electron navigation/frame checks
  for immediate cached content, retained page range and background progress.

- Actual native inspection also found legacy PNGs in the logo-cache root. The
  entire `stock-logos` directory now rolls up, including legacy images, `v2` and
  catalog metadata, rather than leaving the old image files individually visible.

Follow-up validation: TypeScript and all 130 tests passed; production Web/desktop
builds and the updated actual-Electron Storage gate passed. The gate samples
frames during a delayed route re-entry, verifying cached rows remain throughout,
expanded pages survive revalidation and the updating indicator appears. Rebuilt
and restarted the real development app and visually confirmed a single complete
Logo-cache directory row, no individual images, and concise page copy.
