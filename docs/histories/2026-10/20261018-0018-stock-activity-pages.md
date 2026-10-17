# Stock activity research pages

## Request

Continue the same source-backed local-first approach for Politicians, Insiders
and Analyst, in that order, following the Rallies reference pages.

## Politicians phase

Added a keyless CongressInvests adapter, exact ticker/date/official-link validation,
bounded staged pagination, source budgets/settings, directory jobs and scoped
manual sync. Existing FMP source choices and pauses remain available. SQLite
reads retain up to 2,000 activity records and progress excludes inactive sources.

The page now has top disclosed buyers, a signed count/cumulative timeline,
actor/chamber/type/range/search filters and source-linked transaction details.
Disclosed amount ranges remain ranges. Suspected duplicate source lines are
marked and excluded from chart/ranking counts; no exact transaction value or
dollar gain is invented. Price movement requires stored split-adjusted bars.

Parser, source-security, staged-request, domain/date/range, local-store/provider
isolation and isolated desktop/mobile interaction checks accompany the changes.
The execution plan tracks subsequent Insiders and Analyst work and final live QA.


Live Politicians collection stored AAPL 87 normalized rows, MSFT 95 and NVDA 56.
The API probe's 88 AAPL rows normalize to 87 after an exact duplicate coalesces.
Go parser/store/service/research race tests, TypeScript, 157 unit tests and the
isolated Political desktop/mobile interaction checks passed. Data landed as
`ec9f890`; the page remains a separate reviewable commit.


## Insiders phase

Expanded bounded SEC backfill to configurable 40/120/240 recent ownership filings,
with issuer/type/accession-path checks and durable staged XML retry. Kept reported
post-transaction holdings, direct/indirect ownership, owner identity, 10b5-1 and
amendment details. Matching original/amended events are excluded from totals when
replacement semantics are uncertain. Ordinary local reads remain network-free.

Added a reference-style signed value/cumulative chart, price/share/value/holdings
table, trade/other/derivative/amendment scopes and local date/name/type filters.
Only non-derivative P/S records with matching acquisition/disposition direction
contribute to purchase/sale chart totals; absent prices are not zero.


## Analyst phase

Persisted Yahoo per-event current/prior targets, target actions and publication
times, four recommendation snapshots and up to 500 grade events. The versioned
job generation refreshes old snapshots rather than leaving the richer page behind
an old source contract. Kept unknown individual names and zero target sentinels
unavailable. Current target opinions and recommendation populations stay separate.

Added a five-axis recommendation radar, consensus/target summary, firm/action/
search/date filters, target deltas and signed upside versus the latest stored
price. The shared activity chart now has responsive readable axes, bounded
tooltips and zero at the top for all-sale windows.


## Final validation

Live collection and a new offline service process read these committed SQLite
snapshots (Politicians / all Insider events / Analyst grade events): AAPL
87 / 346 / 500, MSFT 95 / 143 / 500, NVDA 56 / 628 / 500. All Insider rows retain
reported shares-after. Current targets are supplied on 485 / 491 / 494 grade
events respectively; four recommendation samples and consensus are additional
records. Default date/trade filters intentionally show fewer events.

A staged-only independent checkout passed TypeScript, 141 unit tests, Web and
Electron builds, Go format/vet/race/build checks and the combined 14-category
activity interaction smoke. Actual Chrome desktop/390px views and the native App
show source-backed charts/tables, including AAPL's current target of $360 for the
latest JP Morgan event. Offline reads preserved the same datasets. Documentation,
design rules, release notes and the optional activity CI gate were updated.

Concurrent model-runtime work was preserved. Its current working-tree desktop
build is blocked by a missing Codex package, and its type check has separate
runtime errors; the independent staged implementation passes both checks. The
shared Web assets were rebuilt and the running native UI refreshed successfully.
