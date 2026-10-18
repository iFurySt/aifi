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

Follow-up, 2026-10-18: checking the overnight run found the official submissions
archive had 994,773 entries and was rejected by the initial 500,000-entry guard.
Raised the bounded allowance to 1,250,000 and added ZIP/ZIP64 count/central-size
preflight before `archive/zip` header allocation (128 MiB directory bound).
Sparse metadata fixtures exercise the real archive layout and reject oversized
declarations without generating a million test members. Offline verification
against the already-downloaded official ZIP validated 989,373 exact CIK members
and parsed Apple's 1,000 recent filings. Restarted the owned backfill worker to
reuse the completed download and resume missing-only imports. Full data coverage
remains unresolved; empty results and identity gaps stay separate.

The resumed submissions pass imported hundreds of additional issuers before a
generic store error stopped the bulk pass. Added sanitized recognition and retry
for SQLite BUSY/LOCKED (including extended codes), so temporary concurrent-writer
conflicts resume the missing-only pass instead of abandoning it. A real two-writer
SQLite regression verifies contention classification without exposing raw errors.
Provider/command race tests passed and the owned worker was restarted with the
retry handling; successful imported snapshots remain intact.
