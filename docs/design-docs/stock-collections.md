# Stock Collections And Market Scope

Status: proposed, 2026-10-14. This records the next Stocks navigation/data design;
the current app still offers only the Nasdaq Trader directory source.

## Product Decision

The Stocks dropdown should choose a stock collection, not a data provider.
Keep market, collection, exchange, provider and sorting as separate concepts.
Initial scope is securities listed in the US; issuer domicile may be elsewhere
(for example ADRs). Hong Kong and Japan remain future markets.

| Concept | Example | Surface |
| --- | --- | --- |
| Listing market | US; later HK, JP | Current US context; future market selector |
| Collection | All US listings, S&P 500, Nasdaq-100, AI, My watchlist | Stocks dropdown |
| Exchange filter | All exchanges, NASDAQ, NYSE | Optional filter within a collection |
| Additional filter/sort | Industry, symbol, market cap, volume | List filters/sort, when real data exists |
| Provider | Nasdaq Trader, future reference/index sources | Settings → Data sources |

Neither NYSE nor NASDAQ is an index. Nasdaq Trader supplies listings across
exchanges. S&P 500 and Nasdaq-100 membership require separate datasets; the two
directory files do not identify index membership.

S&P 500 is an index of leading large US companies selected under its methodology,
not a simple market-cap Top 500. Nasdaq-100 covers large non-financial companies
listed on Nasdaq; it is not the US-wide Top 100 and is not exclusively technology.
Company count and security count can differ because of share classes. Always
display the actual resolved security count, not a hardcoded 500 or 100.
Sources: [S&P overview](https://www.spglobal.com/spdji/en/indices/equity/sp-500/),
[S&P eligibility](https://www.spglobal.com/spdji/en/landing/investment-themes/the-500/),
[Nasdaq-100 overview](https://indexes.nasdaq.com/Index/Overview/NDX).

## Recommended Options

| Group | Options | Priority / prerequisite |
| --- | --- | --- |
| Browse | All US listings | First; existing candidate directory |
| Indexes | S&P 500, Nasdaq-100 | First; verified membership snapshots |
| Personal | My watchlist | First; reuse the current saved watchlist |
| Themes | AI, Semiconductors, Cloud software | First small curated batch; explicit reviewed membership |
| Personal | Named custom lists; create/manage lists | Next; local persistence and symbol validation |
| Indexes | Dow 30, Russell 1000/2000 | Later; add only with working membership sources |
| Industries | Technology, Financials, Healthcare, Energy, etc. | Later; sourced classifications |
| Screens | Market-cap Top 100/500, dividend, volume, earnings-week lists | Later; real metrics/events and explicit rules |
| Accounts | My holdings | Later; broker/import connectivity |

Keep the first dropdown compact: All US listings, two indexes, My watchlist,
three themes, and eventually Manage lists. Use group labels and one active check
mark; allow pinning/reordering later. Do not show long explanations or provider
names in this menu. Do not add inactive markets or a large disabled roadmap.

Preserve the current default All scope until real index membership is available;
remember the user's last collection. S&P 500 and Nasdaq-100 should be convenient
alternatives for focused research. All currently means the imported candidate
scope, excluding ETFs/test issues, not complete verified common-stock coverage.
It still includes securities with unknown types, including warrants and units.
Use `All US listings` until type enrichment can support a narrower stocks-only
view; later add an explicit security-type filter rather than silently hiding rows.

## Interaction

- Retain the `Stocks ▾` heading. Show the active collection as a short secondary
  label, e.g. `S&P 500`, and the filtered loaded-snapshot count beside it.
- Selection resets list pagination/scroll and applies the current search within
  the chosen collection. Preserve bottom-scroll incremental loading.
- Switch collections without resetting the selected stock's detail tab. A stock
  outside the new scope can remain in the detail panel; never fabricate membership
  just to keep it visible in the list.
- Sidebar search is scoped. The existing stock-header/workspace search remains
  global within the current market, so an index view does not hide all other stocks.
- Membership missing, stale, unresolved or failed-to-refresh states are distinct
  from an empty collection. Retain a last-good snapshot and offer retry/source
  details on demand. Do not substitute an alphabetic first 100/500 rows.
- Distinguish full source membership from locally resolved coverage; unresolved
  members remain recorded and visible in collection details rather than silently
  presenting a partial local list as a complete index.

## Scenario Combinations

First, themes are reviewed named lists, not generated investment portfolios or
automated trading advice. Version their definition, membership evidence and review
date. Users can copy a theme into a personal list and edit it without mutating the
published definition. Keep company branding and theme membership independent.

Then support saved rules through one collection evaluator:

| Scenario | Rule | Dependencies |
| --- | --- | --- |
| Large-cap semiconductors | S&P 500 AND Semiconductor classification | Membership + industry evidence |
| AI research candidates | AI curated list OR Cloud software curated list | Reviewed themed lists |
| My Nasdaq focus | My watchlist AND NASDAQ exchange | Saved symbols + current directory |
| Earnings to watch | My watchlist AND earnings within the next 7 days | Real earnings calendar + market timezone |
| Income screen | Explicit dividend-yield threshold plus eligibility filters | Real dated dividend and price data |

Expose simple intersection/union first; advanced rules can follow. Each definition
must have explicit AND/OR semantics. Top-N screens also require a date, sort key,
tie-break and a company-versus-security ranking rule. Missing metrics mean unknown,
not zero. Do not calculate these screens from the existing UI sample data.

## Data Foundation

Keep the live directory as the base universe. Add independently replaceable
collection definitions/membership reads, composed in the host and served by the
existing narrow Web/Electron transport. Go continues to own SQLite. A future
cloud implementation should satisfy the same domain read port.

Proposed objects/tables, not a migration in this task:

- `CollectionDefinition`: stable id, market, kind (`all`, `index`, `curated`,
  `user`, `rules`, future `holdings`), short label, owner, version and definition.
- `CollectionSnapshot`: collection id, source/provenance, as-of/effective dates,
  fetched time, source hash, revision, validation outcome and membership count.
- `CollectionMember`: snapshot id, market-qualified source symbol, resolved
  listing id if available, validity interval, optional source-provided weight.
- `CollectionRepository`: list/detail/query with collection id, market, filters,
  ordering and snapshot-aware pagination. Avoid fetching the entire universe into
  React just to intersect lists. Directory exact lookup remains independently useful.

Reuse existing provider symbols/aliases; never infer a company by removing share
class, warrant or unit suffixes. Current directory listing ids are source-bound,
not a complete long-lived cross-provider security identity system. Preserve raw
member symbols and unresolved identities for later authoritative enrichment.

Collections are browsing scopes, not ingestion commands. Selecting All does not
enqueue price/fundamental downloads for every security. Later collection-level
collection jobs require a separately enabled schedule, deduplication across
overlapping lists, quota accounting and per-dataset freshness controls.

Public memberships can live in Go's SQLite snapshots. Personal lists stay local;
the first My watchlist adapter reuses the current workspace state. A future move
to SQLite requires an explicit versioned migration, not a silent split of saved
state. Public catalog refreshes must not transmit personal memberships.

## Membership Sources And Refresh

Prefer an accessible official constituent feed or a supported provider with
matching entitlement. Verify a complete payload, update/effective dates, symbol
mapping and access before enabling an index option. The official overview pages
confirm index meaning but are not proof of a keyless bulk membership API.

ETF holdings are an optional explicitly named proxy collection, not silently
the index itself. SPY's official page exposes a daily holdings download and
separately shows fund/index data. QQQ's official holdings page exists, but its
full holdings did not load in the inspected text view; no complete fetch was
verified in this planning task. Fund holdings can include cash or differ in timing
and weights. If used, label `SPY holdings` / `QQQ holdings` and retain that provenance.
Sources: [SPY holdings](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy),
[QQQ holdings](https://www.invesco.com/qqq-etf/en/about.html).

Allow reviewed dated membership snapshots/imports as a local-first starting point
if no usable automatic feed is available; show their as-of date and source. Do not
claim a hand-maintained seed is a current complete index without verification.

Recommended automatic check interval: daily for index memberships, independent
of directory sync. Honor announced effective dates rather than applying future
changes early. Each public dataset gets configurable settings/manual sync and
last-good retention using the existing scheduler pattern. Never hardcode monthly
or annual refresh based only on regular reconstitution schedules; changes can
occur between them. Curated themes change on review/published revision; personal
lists update immediately on local edits. Screens refresh only as their real input
datasets become available. Historical snapshots are necessary before backtesting.

## Delivery Order

1. Replace the source-choice concept with an All US scope and exchange filters;
   keep provider controls in Settings. Establish collection contracts and snapshot
   reads, and integrate the existing watchlist without changing its storage format.
2. Verify and import S&P 500/Nasdaq-100 membership; add these working options with
   real counts, provenance, refresh settings and offline/stale behavior.
3. Add a small reviewed theme set and named custom lists; support explicit set
   intersections/unions after the base reads are stable.
4. Add security types, industries, real metrics and rules before dynamic screens.
5. Add HK/JP scopes later: market-qualified symbols, separate calendars/timezones,
   currency, providers and market-specific indexes. Do not derive listing market
   from issuer nationality, ticker format or currency alone.

No runtime/UI changes or new ingestion jobs are implemented by this planning task.
