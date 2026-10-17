# Politicians, Insiders and Analyst source coverage

Reviewed 2026-10-18. Reference Rallies layouts are design evidence, not a source
of copied records or portraits. All acquisition runs in Go, commits to SQLite,
and remains independent of navigation, filtering and paging.

## Politicians

The reference has top buyers, recent activity and a source-backed trade table.
It also presents exact-looking amounts and dollar gains. Public congressional
filings disclose amount ranges and usually not share counts, so AIFi preserves
ranges and charts disclosure counts. It never treats a range maximum as an
executed amount or estimates dollar gains. Any price move uses stored exact-date
split-adjusted daily closes, identifies the end date and is not a portfolio return.

| Source | Live finding | Decision |
| --- | --- | --- |
| CongressInvests public API | Keyless 500/day/IP; current House and Senate records with official report links and pagination. AAPL probe returned 88 source rows since 2024. Some OCR/normalized lines may overlap. | Selectable `congress` provider; 6/minute, 450/day default; up to 20 × 100 rows per symbol, six-hour staged pages, exact ticker/date/link validation. Exact duplicate records coalesce; ambiguous filing/date/amount lines remain marked and excluded from chart/ranking counts. |
| LuxAlgo market-trackers public CC0 dumps | Probe contained 175 Congress records, with manifest dated 2026-09-07, despite the broader advertised scope. | Useful schema/provenance reference; not adopted as a complete/fresh history source. |
| Capitol Gains | Free official/security index with counts, not a transaction dump. | Not suitable for this transaction collector. |
| Capitol Trades | Reference probe was rate limited. | Not adopted as a hidden fallback. |
| Bargo public API | Three-month, low-volume keyless window and attribution/redistribution restrictions. | Not adopted for directory-wide historical ingestion. |
| FMP | Existing key/entitlement-based Senate and House adapters. | Retained as an optional selected source; existing enabled selections preserved. |

CongressInvests coverage is an intermediary sample, not complete disclosure
history. Executive-branch filings are not covered. Names and owner fields are
shown only as supplied; no identity/party/portrait is inferred. Missing owner or
unsupported enrichment stays blank. Invalid/cache-loading/inconsistent paginated
responses do not replace the last good snapshot. Every listing has a queued job,
but completion is constrained by public budgets and provider coverage.

Normal reads return up to 2,000 activity records from SQLite; tables initially
show a bounded 200-row view. Source details retain collection time and vendor
update/coverage. Settings exposes provider choice and independent budgets.
Explicit dataset sync queues only the requested selected source.

## Insiders

Existing SEC Form 4/4-A collection is keyless with an already configured contact.
This phase will retain raw transaction codes and distinguish non-derivative
market purchases/sales from awards, exercises, tax withholding and derivatives.
The reference chart and table guide presentation, not code classification.

## Analyst

Existing keyless Yahoo analysis collection provides consensus targets, current
recommendation distribution and recent firm grade history. Target opinion and
recommendation counts can differ. Missing individual analyst names/targets must
stay unavailable unless an inspected source actually supplies them.

## Primary references

- [CongressInvests API documentation](https://github.com/dianahub/congressinvests-api): public routes, paging, refresh/limits and original disclosure links.
- [US House financial disclosure portal](https://disclosures-clerk.house.gov/FinancialDisclosure): official reports.
- [Senate electronic financial disclosures](https://efdsearch.senate.gov/search/): official reports.
- [LuxAlgo Market Trackers](https://github.com/LuxAlgo/market-trackers): public-source schema and provenance design; code MIT and dumps CC0.
- [Capitol Gains data documentation](https://capitolgains.info/data): aggregate index coverage and source-use constraints.
- [Bargo Congress API documentation](https://www.bargo.ai/free-apis/congress): keyless rolling-window limits and terms.
- [SEC ownership forms](https://www.sec.gov/submit-filings/forms-index): Form 4/4-A source semantics.
- Local OpenBB FMP government-trade adapters informed optional source vocabulary;
  Dexter/AI Hedge Fund do not provide an equivalent complete keyless Congress API.
