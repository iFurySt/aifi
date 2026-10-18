# Retain Stocks lists across navigation and separate menu highlights

## Requests
Fix repeated slow “Loading stocks…” on Stocks switches. Give settings links and
shared dropdown options a small gap; hover should match selected fill without a
border.

## Cause and change
The committed feed was owned by a mounted sidebar and reset on each remount.
An interim completed-state cache still discarded unfinished local reads when its
view unmounted. Both could repeat directory and cached-logo preparation work.
Repository-scoped DirectoryFeedCache now retains its controller, loaded pages,
scroll and pending read. Returning to a fresh view paints its snapshot immediately
and does not query again. A one-minute local head check retains last-good rows;
manual Retry bypasses freshness. Scope/query/watchlist keys remain isolated;
matching real rows can preview a narrowed search. At most 32 idle views are kept,
with subscribed/pending views protected. SQLite remains durable and providers are
never collected by navigation. Grouped cached-logo preparation is preserved.

Core feeds can restore a presentation snapshot and atomically rebase the visible
range, preserving unchanged rows. Sidebar scroll is captured before detachment,
even before a final scroll event arrives. Row memoization limits incidental work.
Settings and Select rows now have 2px gaps; Select active fill has no inset border.

## Verification
- TypeScript and cache/feed tests passed; production Web/Electron build passed.
- New Strict Mode App gate covers pending reads completed off-page, three warm
  revisits with zero new reads/no loading frames, scoped reuse, saved scroll,
  fresh focus and failed-refresh Retry. It fails on the original hooks.
- Existing continuity, responsive and Select interaction gates passed; Select
  assertions verify row separation and identical active/selected borderless fill.
- Clean scoped snapshot passed TypeScript, cache/feed and both affected UI gates.
- Real App restarted and returned 50 rows on three consecutive Settings→Stocks
  switches without loading/error. Native popup review confirmed separated fills.
- A read-only independent SQLite check took about 36ms for one Nasdaq-100 page;
  it is diagnostic evidence, not a whole-app latency guarantee. Concurrent storage
  work is outside this commit and was preserved.

## Main files
packages/ui/src/directory-feed-cache.ts; stock-directory-context.tsx;
components/StockSidebar.tsx; components/select.css; styles.css;
packages/core/src/directory-feed.ts; scripts/check-stock-list-reentry.mjs.
