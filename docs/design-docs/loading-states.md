# Data loading states

Data reads use the shared `Skeleton`, `SkeletonGroup` and `SkeletonRows` in
`packages/ui/src/components/Skeleton.tsx`. `StockLoading` preserves the chart
columns and responsive section order; the other stock tabs use the same inset
content container as their ready state. `DashboardSkeleton` covers summary and
activity layouts. No provider collection is triggered by these placeholders.

- Show a skeleton only for the first read without usable data. Keep cached rows,
  charts, account identity and storage inventory visible during revalidation.
  Pagination appends placeholder rows while retaining the existing range.
- Match the rough shape of the content. Use neutral blocks, not invented values,
  fake chart series or focusable placeholder controls. Decorative logo reads fall
  back to initials after absence/failure rather than shimmering indefinitely.
- A completed empty result is an empty state; a failed read is an error/retry
  state. Neither is a skeleton. Filters must not show another account or period's
  cached totals as if they belong to the new selection.
- The shared CSS owns the subtle 1.8-second shimmer and theme colors. Respect
  `prefers-reduced-motion: reduce` with static blocks. Loading regions have an
  accessible name and busy state; individual shapes are `aria-hidden`.
- Loading a model list uses the shared Select's `loading` prop. Empty choices
  stop loading. Sign-in, saves, synchronization and AI generation retain their
  explicit operation controls/progress instead of impersonating a data read.

The isolated `node scripts/check-loading-skeletons.mjs` gate uses deferred local
fixture reads for all six stock tabs, list/search, Watchlist, settings, accounts,
model discovery, storage, pagination and optional Usage integration. It checks
success/empty/error transitions, cached refresh, narrow/light/dark layouts and
reduced motion without real accounts or source requests. Existing stock-reentry,
account, select and real offline storage gates cover the surrounding behavior.
