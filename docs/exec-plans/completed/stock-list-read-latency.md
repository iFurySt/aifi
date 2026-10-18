# Stock list local-read latency

## Goal
Render retained stock lists immediately and make uncached directory reads independent
of collector writes, slow unrelated RPCs and optional logo preparation. Apply the
same isolation to the stock detail read discovered during native verification.

## Evidence and scope
The renderer already retains per-repository/per-collection feeds during navigation.
Initial reads still use the collector's sole SQLite connection and a serial RPC
loop; decorative cache/decode has no latency bound. Direct read-only Nasdaq-100
queries on the current store measured roughly 18–20ms warm, with a 307ms cold read.
No provider collection or real-account changes are needed.

## Decisions
- Keep SQLite authoritative. A separate query-only connection pool reads committed
  directory/index snapshots; retain a single serialized writer.
- Use a small independent directory RPC lane; keep mutation ordering in the general
  lane, serialize output, bound queued work and cancel workers on shutdown.
- App boot warms the selected list; existing session feed caching remains. Bound only optional logo preparation;
  fast local logos still decode together, delayed assets continue in the background.
- Consider durable presentation duplication only if the measured read path still
  cannot meet interactive latency after these dependencies are removed.

## Work and validation
- [x] Trace cache, SQLite, IPC and logo path; measure direct local reads.
- [x] Implement independent committed-snapshot reads and bounded RPC dispatch.
- [x] Bound decorative preparation and cover delayed/stalled cache behavior.
- [x] Run store/service race tests and actual renderer navigation regressions.
- [x] Review a task-scoped snapshot, rebuild/restart App, record measured result.

## Risks
Read transactions must be deferred/query-only, not BEGIN IMMEDIATE; all fields
within a response must come from one committed snapshot. Requests must stay
bounded, correlated by ID, and preserve write ordering. Cached views and failures
must retain rows, scope, scroll and latest-intent behavior.

## Native follow-up
The directory passed three Settings → Stocks return checks and a renderer reload.
That reload exposed stock details still waiting on the writer: `ResearchRead` used
`ReadOnly: true` on a DSN configured for BEGIN IMMEDIATE and read config/aliases
from the writer first. Move all its presentation reads into one query-only
transaction and a separate bounded RPC worker, preserving directory capacity.

## Results
- `pnpm check` and 18 targeted feed/cache/logo/platform checks passed in a clean
  task-scoped snapshot; `pnpm smoke:stocks-cache` sampled 35 warm-return frames,
  with zero new fresh re-entry reads and no empty/loading frame.
- `go test -race ./internal/store ./internal/service ./internal/research` passed in
  both working tree and a clean task-scoped snapshot, including the research path.
- The broader working-tree `pnpm smoke:interactions` passed 69 sampled frames.
- Complete Go read-only probe on the current store: directory 335ms first / 83–89ms
  warm; Apple view 216ms first / 18–21ms warm. No store migration or write ran.
- Rebuilt the Go service and renderer and restarted the real App. Three Settings →
  Stocks returns retained 50 Nasdaq-100 rows without Loading stocks. After the
  research-reader follow-up, fresh App startup and renderer reload both showed
  the list, company profile and price chart at the next native observation, with
  no unavailable/timeout error. UI-tool latency is not an application benchmark.
- SQLite stays authoritative across restart; session list/scroll caches remain
  bounded and isolated. Truly uncached startup may briefly load while the host
  starts; it no longer queues the read behind a collector or unrelated RPC.
