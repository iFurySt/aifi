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
