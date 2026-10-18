## 2026-10-18 12:25 | Task: Remove stock-list read bottlenecks

### Execution Context
- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query
> Stocks keeps showing Loading stocks for a long time on entry; use local caches
> and investigate why a stored directory query is slow.

### Changes Overview
- Added a bounded query-only SQLite directory pool and consistent read snapshots,
  outside the collector's single connection, including stock detail reads.
- Split bounded directory/research RPC dispatch from the ordered general worker; retained
  request IDs, serialized responses, overload/cancellation/EOF behavior.
- Warm the selected local list at app boot and reuse the existing session feed;
  bounded optional logo preparation to 80ms, with late artwork warming continuing.
- Added writer-contention, RPC queue/ordering and stalled-decoration regressions.

### Design Intent
SQLite already supplies durable cached data. Remove queue/connection/decorative
waits before adding another durable copy. Keep normal page reads offline-capable,
keep good rows/scroll on re-entry, and do not start source collection from reads.

### Files Modified
- Go store directory reads and service RPC dispatch.
- Shared App/directory warmup and local logo preparation.
- Directory/store/service/renderer regression checks.
- `docs/design-docs/directory-read-latency.md` and execution plan.

### Validation
Read-only Go probe: 50 Nasdaq-100 rows, 83–89ms warm / 335ms first;
Apple view, 18–21ms warm / 216ms first. No migration/collection/write ran.
Validation commands and final desktop observations are recorded in the execution plan.
