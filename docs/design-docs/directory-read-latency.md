# Interactive directory reads

The stock directory is already persisted in SQLite. A fast SQL statement can
still appear slow if it waits for a collector connection, an unrelated RPC or
optional artwork. Keep those dependencies out of the interactive path.

## Storage and protocol

- `Store.db` remains the single serialized writer/collector connection. A separate
  four-connection `mode=ro`, `query_only` pool serves directory list, exact lookup
  and membership checks plus source-backed stock views. Each list uses one deferred transaction for index head,
  directory head, coverage, count and rows, so a response is one committed snapshot.
- Stdio keeps a general FIFO worker for existing operations and a two-worker
  directory-only lane. Research reads use one separate worker with a 16-request
  queue, leaving capacity for directory reads; directory/general queues each hold
  at most 32 requests; overload is an explicit
  retryable response. IDs correlate out-of-order directory replies; the encoder
  is synchronized. Each accepted request has a 15-second deadline including queue
  time. EOF drains accepted work; cancellation releases workers and input.
- Only `directory.list/get/contains` and `research.read` bypass the general lane. Other operations
  retain order and are not given additional write concurrency. No provider fetch
  or schema/collection work happens in the read pool.

Research views also read aliases, provider configuration, panels and coverage
inside one deferred transaction on this pool. `ReadOnly: true` on the writer DSN
was insufficient: that connection uses `_txlock=immediate` for collector safety.
Keep pure presentation reads off that DSN entirely.

## Renderer

`DirectoryFeedCache` retains collection/query pages, scroll and in-flight reads
across sidebar mounts. App boot warms the currently selected empty-query list,
including when Chat/Settings opens first. It uses the same injected repository
and cache as the sidebar; unrelated watchlist edits do not warm built-in scopes.
Warm navigation renders retained rows synchronously and quietly revalidates after
60 seconds. SQLite remains the only durable directory; a second persisted browser
copy is not introduced.

Local cached logos normally prepare/decode as one page before publication. Their
optional step has an 80ms budget, including IPC and decoding. A stalled cache cannot
hold the directory spinner indefinitely. The late task continues warming shared
artwork; directory errors and asset errors remain separate. This budget does not
start provider collection or cancel a committed directory read.

## Evidence and checks

An initial SQL-only probe returned 50 Nasdaq-100 rows in 18–20ms warm / 307ms
first read. The complete Go store functions (including heads, coverage, totals and
row decoding) later measured 335ms first / 83–89ms warm for that page and 216ms
first / 18–21ms warm for the Apple research view (11 datasets, 500 bars). The probe
opened only the query-only pool against the current store; it ran no migrations,
collectors or writes. These are local read measurements, not an end-to-end startup
promise or provider timings.

- Store race checks hold an uncommitted writer while list/index/watchlist/get and
  membership/research reads finish; they reject dirty rows and writes on the read pool and
  observe a later committed head.
- Protocol tests hold a slow general operation while directory and research reads reply, verify
  mutation FIFO/response IDs, bound overload, cancellation and EOF behavior.
- `pnpm smoke:stocks-cache` boots on Settings, warms a local read while artwork is
  stalled, then samples warm Stocks navigation frames, scroll, scope and failures.
- `stock-logo-page.test.ts` covers fast prepared pages and a never-resolving cache.
  `pnpm smoke:interactions` checks broader async DOM/scroll continuity when available.
