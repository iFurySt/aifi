## 2026-10-15 18:03 | Task: Present cached stock logos with directory batches

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Scrolling still exposes many blank avatars that fill one at a time. Fix the cause.

### Changes Overview

- Added a disk-only, bounded logo batch capability shared by Web and Electron.
- Go verifies current candidate membership in one parameterized snapshot query;
  single logo reads use the same lightweight check instead of full profile reads.
- Each sidebar page warms and decodes cached assets before publishing its rows.
  Next-page loading starts earlier; uncached avatars immediately show a letter.
- Preserved provider queue limits, image validation, future repository injection,
  directory generation checks, and independent market-data contracts.

### Design Intent

The previous near-viewport observer could not outrun slow cold provider requests.
Neutral pending tiles hid letters but retained the actual asynchronous delay.
Batch local asset preparation fixes delayed cached-image insertion after restart
and across page boundaries. First-time unknown artwork remains asynchronous; it
must not block the directory or appear as blank waiting tiles.

An initial batch implementation issued 50 directory lookups and measured about
2.2 seconds. Replacing those with one Go query reduced the first two measured
50-row cache batches to roughly 80–120 ms on the real directory/cache sample.

### Validation

- 58 TypeScript tests, Go membership/service tests and repository CI.
- Production renderer/native smoke; real Chrome Default scrolling with public
  directory/cache copies and production shared components. No private credentials
  or vault keys copied into the isolated test profile.
- DOM insertion probe checks cached images on first render and rejects blank
  avatars; actual cache assets are used rather than short simulated HTTP delays.
  Across 200 rows (beyond the 128-entry renderer cache), 131 entered with images,
  with zero blank tiles and zero late cached-image insertions. The four local
  cache batches measured approximately 26–94 ms in the final run.

### Files Modified

- `apps/cli/internal/store/store.go`, `apps/cli/internal/service/service.go`
- `packages/core/src/stock-logos.ts`, `packages/core/src/data-service.ts`
- `packages/host/src/runtime.ts`, `packages/host/src/stock-logos.ts`
- `packages/platform/src/stock-logos.ts`
- `packages/ui/src/stock-logo-page.ts`, `packages/ui/src/stock-directory-context.tsx`
- `packages/ui/src/components/StockAvatar.tsx`, `StockSidebar.tsx`
- Related regression tests and architecture/frontend/security/reliability docs.

### Delivery

Implementation `9e3ba5f` pushed to main. Primary builds were refreshed and the
normal AIFi app restarted with its existing user data. Native visual review
confirmed real cached images in the sidebar. Existing Chrome preview restored;
ignored validation metrics/screenshots preserved before worktree cleanup.
