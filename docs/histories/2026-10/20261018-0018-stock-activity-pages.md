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
