# Shared loading skeletons

## Goal
Replace data-loading prose with one theme-aware, subtle shimmer system throughout
the renderer. Preserve cached content during revalidation and keep errors/empty
results, sign-in/sync operations and AI generation distinct from data loading.

## Scope
- Shared primitives for blocks, status groups and rows; matching stock chart/table
  layouts, initial settings/account/storage/usage reads, search, pagination,
  watchlist/peer values, model discovery and decorative avatar reads.
- Native light/dark/narrow review, reduced-motion support, screen-reader status
  labels and no animated or focusable fake controls.
- Data APIs, source collection, real accounts and data semantics stay unchanged.

## Work
- [x] Audit all async renderer reads and visible Loading/Calculating strings.
- [x] Implement shared primitives and migrate each data-loading surface.
- [x] Verify delayed → success/empty/error and cached revalidation without flashes.
- [x] Review isolated light/dark/narrow/reduced-motion screenshots and actual App.
- [x] Update design/docs/history, validate scoped snapshot, commit and push.

## Validation
TypeScript and focused UI integration using deferred local repositories and a
throwaway Electron profile. Existing Stocks reentry, account and storage gates.
No artificial delay or new provider fetch is added to production paths.

## Outcome
Shared UI loading states implemented. Deferred fixture transitions, four existing
UI gates and TypeScript/build checks pass; native renderer refreshed. Usage
loading integration is present in the shared checkout alongside that independently
developed feature. Scoped-snapshot validation is recorded in the task history.
