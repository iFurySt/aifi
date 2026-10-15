# Immediate Cached Stock Logos

## Goal

Reuse downloaded company logos across page navigation and app restarts, returning
local images immediately while refreshing outdated sources in the background.

## Scope

- Preserve the existing private PNG/catalog disk cache and read-only logo port.
- Add bounded per-repository renderer session caching/coalescing and an optional
  synchronous cache peek so remounted avatars do not start with letters.
- Return validated stale/fallback disk images before background source refresh;
  maintain catalog preference, negative backoff, bounds and shutdown behavior.
- Do not persist image data in workspace localStorage or add remote renderer URLs.

## Risks

Stale source selection, lost background errors, unbounded renderer memory,
retrying null responses too often, and apparent cache misses after restart.

## Milestones

- [x] Inspect existing cache and avatar mount/refresh behavior.
- [x] Implement immediate local/session hits with focused regression coverage.
- [x] CI, isolated native smoke, real cache/network-count verification and docs.
- [x] Commit/push, rebuild primary checkout and restart the app.

## Verification Results

- `make ci`: 49 TypeScript tests, repository gates, builds and Go vet/race pass.
- Offline native smoke in the isolated checkout passes; screenshot reviewed.
- A disposable copy of six real cached symbols (AAPL, AACOW, AACG, TREO, AACO,
  AACOU) survives two online-host/session creations: 24 consumer reads, 12 local
  transport reads, zero image-provider calls. Catalog refresh was disabled for
  this image-cache probe; its existing daily checks remain separate.
- Renderer static first-paint/remount probe includes the cached AACOW image both
  times without running effects or performing a second local read.
- Native manual interaction tools returned Transport closed, so this task uses
  the repository's actual Electron smoke plus cache/render probes for validation.

## Delivery

Implementation pushed and primary checkout rebuilt. The previous owned app
process was stopped and the updated app launched through `pnpm desktop`; the
new process uses the primary bundle. Native interaction tooling remained
unavailable, so no post-restart manual UI observation is claimed. Cache/render
probes and isolated native smoke evidence were preserved in ignored artifacts.
