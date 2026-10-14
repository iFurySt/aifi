## 2026-10-14 11:00 | Task: Stock scrolling and logos

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Replace page controls with loading on scroll, clarify the Nasdaq/NYSE directory
> source, and investigate company avatars.

### Changes Overview

- Directory feed appends bounded batches instead of replacing pages.
- One request per feed; query changes/disposal discard stale responses.
- New snapshots rebase; refreshes on the same snapshot preserve loaded rows.
- Failed batches retain existing rows and retry the same offset.
- Separate injected logo read port, lazy avatars and bounded private PNG cache.
- Letter fallback for unavailable images, dark backdrop for white marks.
- Source menu identifies Nasdaq Trader, whose two files cover multiple exchanges.

### Design Intent

Keep repository offset paging behind the shared read contract while exposing a
natural scrolling UI. Logos are a separate optional decorative capability.

### Files Modified

- `packages/core/src/directory-feed.ts`
- `packages/ui/src/stock-directory-context.tsx`
- `packages/ui/src/components/StockSidebar.tsx`
- `packages/host/src/stock-logos.ts`
- `packages/ui/src/components/StockAvatar.tsx`
- `docs/design-docs/stock-logos.md`
- `docs/references/stock-logos.md`
- `docs/design-docs/stock-directory-reads.md`

### Validation

Feed tests cover concurrency, query races, disposal, snapshot changes, refresh,
error/retry and empty/no-progress pages. Host/platform tests cover coalescing/cache/offline/fallback, PNG validation,
concurrency, shutdown and narrow transport bounds. Native UI confirms 50→100
rows on scroll and reset to one AAPL result; Chrome desktop/mobile checks pass: incremental scrolling, preserved prefix,
search reset/empty, data-only images, contrast retention and no overflow.
make ci passes with 31 TypeScript tests, Go vet/race and all builds; actual macOS
smoke passes. Directory and asset reads remain independently bounded.

### Delivery

Changes landed in two feature commits; main build and live Web directory checked.
Final native preview restart is pending Mac unlock; isolated native checks passed.
