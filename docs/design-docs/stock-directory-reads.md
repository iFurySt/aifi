# Stock Directory Reads

Status: implemented in shared Web/Electron UI, 2026-10-13.

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
- Stocks heading opens a source selector; Nasdaq directory is the only current
  option and is checked. No footer attribution label or unavailable source choice.
- Sidebar reads 50 rows per page; company suggestions use 20, workspace search 12.
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

Readers debounce search by 180ms, discard superseded responses, and refresh every
60 seconds/on window focus while mounted to discover background imports. Query
changes reset paging. Refresh errors retain the same query's cached real rows and
show Retry; new failed queries never substitute sample companies. Empty imports
and unmatched searches have distinct short messages. Native offline smoke checks
that the empty store cannot show the former five-symbol fixture list.

Header names and exchange labels come from exact cached directory reads. Quotes,
About profiles, charts, peers and financial statements still use explicitly
marked samples for five targets; other symbols show no market/fundamental data.
The other research tabs remain placeholders. Watchlist/Portfolio demo quotes are
outside this directory-read change.

## Future Cloud Implementation

Implement the same repository contract, preserving nullable lookup, bounded
pagination, literal search, snapshot semantics and source fields. Select it at
application composition instead of modifying components. For Electron, cloud
auth/network ownership can remain in main behind the existing narrow bridge;
main can delegate directory reads to a cloud adapter instead of the local Go
service. Local settings/collection can remain independent.

No cloud backend, provider-selection UI, ambient remote URL, auth token storage,
remote renderer permission or permissive CORS is added now. A future integration
must explicitly compose authentication and host/CSP policy with its adapter.
