## [2026-10-15 11:41] | Task: Reuse local stock logos immediately

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex local workspace

### User Query

> Company logos appear to load repeatedly; persist and reuse them locally so
> every visit does not request the remote provider.

### Changes Overview

- Confirmed private PNG persistence already exists. Fresh disk hits work across
  online restarts, but avatars previously started empty on every mount and stale
  or fallback cache paths could wait for provider reads.
- Validated disk images now return immediately; outdated/preferred-source reads
  refresh behind the displayed image with existing bounds/backoff/cancellation.
- The platform adapter shares in-flight calls and caches session results (128
  entries / 8 MiB data-URL characters). Success TTL is five minutes; missing
  results retry after 30 seconds, and bridge failures do not blank an old image.
- Optional synchronous repository peek supplies images on avatar initial render
  and cached symbol changes. No image data is added to workspace localStorage or
  IndexedDB; durable cache ownership remains in the host.

### Design Intent

Separate immediate presentation from refresh. Reuse local PNGs and lightweight
session hits while preserving catalog selection, source validation, directory
membership checks and replaceable read contracts. First-time uncached images
still require a bounded provider request.

### Validation

- `make ci` passes with 49 tests and Go vet/race checks.
- Regression coverage includes online disk-cache restart, immediate stale and
  queue-full hits, background source promotion, session TTL/size limits, duplicate
  reads and temporary bridge failures.
- Two host/session instances read six actual cached symbols with zero image
  requests; repeated same-session reads avoid additional local transport.
- Static renderer probe verifies cached AACOW is present in initial/remounted
  markup without effects or another local read.
- Isolated actual Electron offline smoke passes; its screenshot was reviewed.
  Native interaction tools were unavailable (Transport closed), so no manual
  navigation review is claimed.
- Implementation was pushed, primary assets rebuilt and the owned app restarted
  through the normal launcher. Public cache/render QA artifacts were preserved.

### Files Modified

- `packages/core/src/stock-logos.ts`
- `packages/platform/src/stock-logos.ts` and tests
- `packages/host/src/stock-logos.ts` and tests
- `packages/ui/src/components/StockAvatar.tsx`
- Logo/architecture/frontend/reliability docs, quality counts and release notes
