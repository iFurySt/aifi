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
- Source menu identifies Nasdaq Trader, whose two files cover multiple exchanges.

### Design Intent

Keep repository offset paging behind the shared read contract while exposing a
natural scrolling UI. Logos are a separate optional decorative capability.

### Files Modified

- `packages/core/src/directory-feed.ts`
- `packages/ui/src/stock-directory-context.tsx`
- `packages/ui/src/components/StockSidebar.tsx`
- `docs/design-docs/stock-directory-reads.md`

### Validation

Feed tests cover concurrency, query races, disposal, snapshot changes, refresh,
error/retry and empty/no-progress pages. Logo investigation and UI checks pending.
