## [2026-10-15 12:53] | Task: Prepare logos before rows enter view

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex local workspace

### User Query

> Scrolling still shows letters before company logos, despite local caching.

### Changes Overview

- Fixed avatar observation to use the actual inner stock-list scroll root with
  a 240px lookahead. Window-root margins could not expand that ancestor's clip.
- Separate unresolved neutral tiles from confirmed unavailable letter fallbacks.
- Decode and sample optional white-mark contrast before presenting a new image.
  Weak preparation caches share work by the bounded repository's existing logo
  objects, including cached remounts; no second unbounded image store is added.
- Added focused UI preparation tests to the normal test command. Host persistence,
  provider traffic limits and local data/read contracts remain in place.

### Design Intent

Disk persistence avoids downloads but does not by itself prepare offscreen rows or
make asynchronous image decoding synchronous. Prepare within the actual scrolling
surface and use a distinct loading presentation. Uncached first-time images can
still require network time; a neutral tile accurately represents that state.

### Validation

- `make ci` passes: 52 tests, TypeScript/builds and Go vet/race checks.
- Actual isolated offline Electron smoke passes.
- Chrome Default / iFurySt through Open Browser Use verifies the production avatar
  inside a real inner scroller. A row 180px outside the viewport starts early and
  has its image ready when scrolled into view.
- Delayed-read mutation checks show zero temporary letter flashes; missing assets
  use letters, and a prepared white mark gets contrast before its first image frame.
- Paired native IntersectionObserver probes reproduce the cause: window root
  reports false while the inner-scroll root reports true for the same target.
- Browser fixture reads are controlled 80ms/1s values, not a remote-speed benchmark.
  Ignored screenshots/results preserve this distinction.
- Primary assets were rebuilt and the actual native app restarted/visually checked
  with real stock images. The existing Chrome preview was restored after QA.

### Files Modified

- `packages/ui/src/components/StockAvatar.tsx`
- `packages/ui/src/stock-logo-image.ts` and tests
- `package.json` test scope
- Logo/frontend/quality/release documentation and execution plan
