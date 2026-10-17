# Whole-directory research backfill

Request: fill research data across the complete current stock directory.

Implemented a standalone, resumable `data research backfill` collector and a
local record-level progress audit. Missing-only requests retain successful data,
active leases, retry delays, source selection and disabled datasets. Scheduler
first-pass priority prevents daily refreshes/retries from starving unvisited
companies. No navigation/read path acquires provider data.

Added official SEC nightly archive imports for financial facts and recent
submissions, reusing existing normalizers and atomic fenced writes. Downloads
are private, bounded, process-locked, cancellable and resumable with validated
HTTP ranges/version validators. ZIP members require exact CIK filenames and
matching identities; nothing is extracted from archive paths. Unsupported/missing
members retain the normal API fallback and last-good snapshots.

The real full-directory run was started. Collection completion remains tracked
in [the active plan](../../exec-plans/active/full-stock-backfill.md); starting a
worker or counting an empty snapshot does not constitute full data coverage.

Validation: Go store/provider/engine/command race suite; download restart/range,
identity/traversal/size bounds, missing-only requests, lease isolation, first-pass
fairness and empty-result audit regressions. Windows/Linux market-package cross-compilation also passed. Live progress
checkpoints and unresolved coverage are recorded in the active plan.
