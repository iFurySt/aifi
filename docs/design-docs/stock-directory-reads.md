# Stock Directory Reads

Status: implemented in shared Web/Electron UI, updated 2026-10-15.

## Contract And Composition

Core defines `StockDirectoryRepository` with `search(DirectoryQuery)` and
`get(symbol)`. Search returns a bounded page, filtered count, offset, snapshot ID
and source-backed listing fields. Exact lookup returns the snapshot ID and a
nullable item. An empty snapshot ID means no successful import yet; a nonempty
snapshot with no item means the symbol is absent from current candidate membership.

App accepts a repository prop and injects it into shared directory context. Its
default is the platform local adapter. Pages/hooks import the domain port rather
than SQL, Electron IPC or external URLs. Tests can inject another implementation.

```text
Shared UI → StockDirectoryRepository → platform local adapter
  Electron: preload → trusted main → private Go RPC → SQLite
  Web: authenticated same-origin loopback → Node host → private Go RPC → SQLite
```

Go remains the SQLite owner. Main forwards allowlisted reads; it does not open a
second DB connection or collect Nasdaq data in the renderer. Cached reads do not
schedule downloads. Configuration/sync remains a separate existing capability.

## Search And Identity Semantics

- Limits: 1–200 rows, offset 0–100000, query up to 255 UTF-8 bytes. Host and Go
  both enforce request bounds; UI caps inputs at 80 characters.
- Symbol/security-name search treats SQL wildcard characters as literal text.
  Exact symbol matches lead results; remaining rows use deterministic source
  symbol/source/exchange ordering. Company form submit resolves exact symbols
  first, then the first name-search result. The datalist permits explicit choice.
- Search optionally accepts collection `all-us`, `sp500`, `nasdaq100` or
  `watchlist`. Only watchlist accepts up to 50 explicit uppercase symbols;
  built-in definitions cannot be overridden. Go applies scope before count,
  search, ordering and paging. Exact lookup remains global.
- Scoped pages return source/date metadata, full membership count, locally
  available count and unresolved source symbols. The opaque page snapshot token
  combines directory and collection identity, rebasing pagination when either
  changes. It is not a database identifier for a scoped page.
- Index snapshots are reviewed, dated bundled data imported into SQLite v3;
  they work offline and are updated through a reviewed repository change. See
  [collection design](stock-collections.md).
- Sidebar loads 50 rows initially and appends batches when its bottom sentinel
  enters the scroll viewport; company suggestions use 20, workspace search 12.
  Counts reflect the filtered candidate scope, not whole-market common-stock coverage.
- ETFs/test issues are excluded. Type remains unknown, including warrants,
  preferred securities, units or ADRs until explicit enrichment arrives.
- Names are original security names, not inferred company profiles. Exchange codes
  use documented display labels; unfamiliar codes remain unchanged. No MIC, CIK,
  canonical alias or company-identity claim is invented.
- Routes preserve source notation such as BRK.B or ABR$D. All symbols in the
  checked current snapshot fit the route grammar. Watchlist v1 keeps its existing
  stricter grammar; incompatible symbols can be viewed with Watchlist disabled.
- Stable listing IDs and snapshot IDs refer to existing source memberships.
  This is not a promise that ticker reuse identifies the same company forever.

## UI States

Directory feeds are session-owned rather than component-owned. Each repository,
logo repository, collection, trimmed query and (for watchlists) sorted membership
has an isolated view with loaded pages, scroll and a shared pending local read.
Leaving Stocks unsubscribes its UI without discarding an unfinished SQLite/logo
batch. Returning renders the completed snapshot synchronously; no reset to an
empty feed and no duplicate request are required. Reuse valid empty results too.
The session keeps up to 32 idle views; subscribed and pending views are protected.

New text searches debounce by 180ms; matching loaded rows from the same scope can
remain as a provisional preview until the complete local result arrives. Warm
queries/scopes restore their own completed pages. Watchlist edits retain matching
real rows and reconcile against the changed local membership. Built-in index
membership stays immutable.

The local directory head is checked at most once per 60 seconds per view during
normal mount/focus/timer activity. Stale snapshots remain visible during the
check; manual Retry is explicit and bypasses freshness. Only an uncached first
read or actual append displays loading. Last-good rows and scroll survive a
failed check. Background snapshot changes rebase the loaded range atomically.
Cached logo preparation stays grouped with the first page; revisiting a prepared
view does not repeat its cache authorization/decode work.

SQLite remains authoritative across app restarts; these bounded presentation
snapshots never collect a remote provider or replace durable local storage.
Header identities and research datasets also read local committed source data;
unavailable fields remain absent, with no fabricated quotes or statements.

`pnpm smoke:stocks-cache` uses the actual App under Strict Mode with delayed local
repositories. It verifies a first read completed while off-page, zero additional
reads and no empty/loading animation frames across repeated warm returns, saved
scroll, collection switching, fresh-focus deduplication and offline Retry.

## Future Cloud Synchronization

Keep the same repository contract: nullable lookup, bounded pagination, literal
search, snapshot semantics and source fields. A future cloud source synchronizes
through the host/collector into SQLite before consumers read it. Normal page reads
must keep using stored snapshots rather than directly request a remote listing
endpoint. Components stay unchanged because the domain read port stays injectable.
See [local data contract](local-data-contract.md).

No cloud backend, ambient remote URL, auth token storage, remote renderer
permission or permissive CORS is added now. A future integration must compose
sync/authentication and host policy explicitly.
