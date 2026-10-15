# Stock Collections And Market Scope

Status: scoped reads and SQLite snapshots implemented 2026-10-15; shared selector
is the next delivery slice. Scope remains indexes and the existing watchlist.
Current index data uses reviewed bundled snapshots with visible source dates;
automatic index ingestion/scheduling remains deferred.

## First Version

Make `Stocks ▾` choose a browsing collection instead of a directory provider.
Support only US-listed securities for now; issuer domicile can be elsewhere.

| Option | Membership | User permissions |
| --- | --- | --- |
| All US listings | Existing imported directory candidate scope | Select/search only; cannot rename, delete or edit membership |
| S&P 500 | Verified index membership snapshot | Select/search only; cannot rename, delete or edit membership |
| Nasdaq-100 | Verified index membership snapshot | Select/search only; cannot rename, delete or edit membership |
| My watchlist | Existing locally saved watchlist | Keep the fixed entry; users can add/remove their own saved securities |

The first three are system-owned built-in lists. Updates come from the maintained
source/collector, never from user edits. The fixed My watchlist entry is not an
editable system index: its contents remain user-owned, preserving current behavior.
Future user-created named groups may be created, renamed, edited and deleted;
they must not overwrite or share mutable membership with a built-in list.

Do not add themes, ranking screens, set-combination rules, group-management UI,
pinning controls or additional markets in this first version. Exchange filters
can follow separately; NYSE/NASDAQ labels on individual stocks remain available.

S&P 500 is a defined index, not simply market-cap Top 500; Nasdaq-100 covers large
Nasdaq-listed non-financial companies, not the US-wide Top 100. Security counts
can differ from company counts because of share classes. Display real membership
counts rather than hardcoding the numbers in the names.
Sources: [S&P overview](https://www.spglobal.com/spdji/en/indices/equity/sp-500/),
[S&P eligibility](https://www.spglobal.com/spdji/en/landing/investment-themes/the-500/),
[Nasdaq-100 overview](https://indexes.nasdaq.com/Index/Overview/NDX).

## Interaction

- Keep a compact dropdown with the four working options and one active check mark.
  Show the selected scope and actual filtered count concisely near the heading.
  Provider names belong in Settings, not in the collection selector.
- Start with All and remember the user's last selection. Selecting another list
  changes personal viewing state, never the built-in definition or membership.
- Selection resets sidebar pagination/scroll; preserve bottom-scroll loading and
  search within the selected collection. Detail tabs need not reset.
- Global stock search can still open a US listing outside the active collection.
  Do not silently add it to that collection.
- Indexes appear as working choices only after a complete, validated membership
  source is available. Never substitute the alphabetic first 100/500 stocks.
- Keep last-good memberships on sync failure. Distinguish an empty watchlist,
  unavailable index data and unresolved source symbols; do not present a partial
  local join as complete index coverage.

All currently refers to the imported candidate universe excluding ETFs/test
issues. Other security types remain unknown and can include warrants or units;
it is not yet a verified common-stock-only universe.

## Minimal Data Work

Reuse the existing directory, Go scheduler, SQLite owner and narrow Web/Electron
transport. Add a collection id to the relevant read contract so the UI can request
All, S&P 500, Nasdaq-100 or My watchlist without embedding provider logic. Preserve
the replaceable local/cloud read boundary.

Use stable, distinct built-in ids. Initially only index snapshots and membership
rows need new storage: index id, source, as-of/effective date, fetch time, hash and
member symbols/resolved listing ids. Retain source symbols that do not resolve in
the local directory. Do not invent identity by stripping symbol suffixes.

No generic rule engine, collection-permission framework or personal-group tables
are needed yet. Built-in reads expose no user membership-write operation. Future
user-group mutation handlers must reject system-owned ids at the host boundary,
not merely hide edit buttons. Sync-setting changes may control source refresh;
they do not turn system lists into user-editable groups.

My watchlist continues using its current local workspace persistence. Do not
silently migrate it to SQLite as part of index work. A later named-group feature
can add its own storage/migration when required. Public source refresh must not
send personal watchlist/group members to a provider.

## Index Sources And Sync

Nasdaq Trader's directory does not contain index membership. Verify an accessible
official constituent feed or supported provider's complete payload before adding
each index adapter. Overview pages alone do not establish a free bulk API.
Reviewed dated snapshots/imports can provide a local starting point if they have
verified completeness, provenance and an explicit as-of date.

ETF holdings can be examined as supporting sources but must not silently become
a purported official index list. SPY exposes a daily holdings download and
separate fund/index data; QQQ's full holdings were not successfully retrieved in
the earlier text-view research. Validate any feed and reconciliation before use.
Sources: [SPY holdings](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy),
[QQQ holdings](https://www.invesco.com/qqq-etf/en/about.html).

Check index membership daily by default with configurable scheduling/manual sync,
independent of directory refresh. Apply announced changes on their effective date,
validate before replacing a snapshot, and preserve the previous valid snapshot
on failure. Collection selection does not schedule price/fundamental acquisition
for every member.

## Delivery Order

1. Verify S&P 500/Nasdaq-100 sources and implement their bounded ingestion plus
   SQLite snapshots using the existing collector patterns.
2. Add scoped reads and the compact selector: All, the two usable indexes, and
   the existing editable watchlist. Verify counts, incremental loading, offline
   behavior and the absence of built-in mutation paths.
3. Later add user-managed named groups alongside protected built-ins; defer
   themes, screens, exchange filters and HK/JP markets until their data is ready.
