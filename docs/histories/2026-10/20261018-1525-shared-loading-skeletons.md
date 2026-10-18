## [2026-10-18 15:25] | Task: Shared loading skeletons

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Replace loading text with shimmer or breathing skeletons wherever data loads.

### Changes Overview

- Introduce shared blocks, accessible loading groups, rows and dashboard shapes
  with theme-aware shimmer and a static reduced-motion alternative.
- Cover the directory/search, all six stock tabs, Watchlist/peer prices, company
  and fund logos, account/model discovery, data/sync settings and storage reads.
  The pending local Usage feature in the shared checkout also uses the primitives
  and retains totals during same-filter refresh, keyed by account/period/timezone.
- Preserve ready data during background refresh; append pagination placeholders.
  Resolve to real content, empty/error states or logo initials on completion.
- Add deferred Electron coverage for successful/empty/failed reads, cached refresh,
  optional database details, pagination, responsive layouts and reduced motion.

### Design Intent

Loading has one quiet visual vocabulary. Placeholder content cannot be mistaken
for real values or controls. Errors, empty results, sign-in/sync actions and AI
progress keep their own semantics. Source APIs and real account state are unchanged.

### Validation

- TypeScript and Web production build pass in the shared checkout.
- Deferred loading integration gate passes, including optional Usage integration.
- Stock reentry/cache, account management, shared Select and offline real-store
  storage gates pass. Native AIFi renderer refreshed and real stored data reviewed.
- Scoped snapshot independently checked before commit; unrelated concurrent
  account/chat/Usage runtime work excluded from this change.

### Files Modified

- `packages/ui/src/components/Skeleton.tsx`, `skeleton.css`, `StockLoading.tsx`
- Shared avatars, Select, directory/search/peer components and data-reading pages
- `scripts/check-loading-skeletons.mjs`, `scripts/fixtures/loading-skeletons.tsx`
- Existing stock-list and storage UI gates
- `docs/design-docs/loading-states.md`, frontend/design guidance and execution plan
