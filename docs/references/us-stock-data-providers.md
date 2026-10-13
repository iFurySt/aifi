# US Stock Data Sources

Reviewed: 2026-10-13. Scope: a personal, local, open-source workspace using daily
closing data. Prices and entitlements can change; account probes are separate
from reading public documentation.

## Recommended Combination

| Dataset | First choice | Why | Verification |
| --- | --- | --- | --- |
| Exchange-listed security directory | Nasdaq Trader + Massive reference enrichment | Two keyless directory downloads; provider types/CIKs resolve ambiguous instruments. | Nasdaq downloads succeeded; Massive requires a user key. |
| Daily OHLCV, three development targets and later whole market | Massive Stocks Basic | Free, 5 calls/minute, 2 years, EOD; grouped daily endpoint includes all Stocks plans. | Official pricing/endpoint confirmed; account entitlement not yet tested. |
| Company identity, filing metadata, basic financial facts | SEC submissions + Company Facts | Public primary-source data with no API key. | Documentation confirmed; this environment returned HTTP 403. |
| Alternative historical prices | Alpaca Basic, explicit SIP historical feed | Free historical API 200 calls/minute; recent 15 minutes restricted. | Documentation confirmed; account/feed permissions not yet tested. |

Massive's [pricing](https://massive.com/pricing?product=stocks) is for individual
use. Its [daily market summary](https://massive.com/docs/rest/stocks/aggregates/daily-market-summary)
returns a market-wide OHLCV response for one date, with optional OTC inclusion.
Its adjustment flag covers splits, not dividend total return. The
[custom bars](https://massive.com/docs/rest/stocks/aggregates/custom-bars) endpoint
supports per-symbol history. Free access does not include a paid flat-file feed
or mean that every fundamentals/news product is free.

The [reference ticker API](https://massive.com/docs/rest/stocks/tickers/all-tickers)
has instrument types, optional CIK/FIGI identifiers, activity/date filters, and
pagination up to 1,000 records per page. Preserve its source symbols rather than
rewriting punctuation globally.

[SEC APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
provide submissions and standardized, entity-wide XBRL facts; custom/dimensional
facts are not a complete normalized three-statement feed. Nightly bulk archives
are available. SEC does not support browser CORS. Its
[developer guidance](https://www.sec.gov/about/developer-resources) caps aggregate
access at 10 requests/second. AIFi will use a lower shared limiter and an honest,
user-configured identifying User-Agent. A 403 stops access; do not bypass it.

[Alpaca documentation](https://docs.alpaca.markets/us/docs/about-market-data-api)
and its [feed FAQ](https://docs.alpaca.markets/us/v1.4.2/docs/market-data-faq)
distinguish live IEX data from historical SIP data. Set `feed=sip` explicitly
and end the request outside the restricted latest 15 minutes. Never combine
IEX-only volume with consolidated market volume under one unnamed series.

## Other Personal Free Options

| Provider | Published free offering / boundary | AIFi role |
| --- | --- | --- |
| [Twelve Data](https://twelvedata.com/pricing) | Basic 8 API credits/minute, 800/day; credit weights depend on endpoint/symbol. | Small watchlists; not the default per-symbol whole-market collector. |
| [Alpha Vantage](https://www.alphavantage.co/support/) | Ordinary free key: 25 requests/day. Official support also mentions unlimited requests for verified open-source/educational projects; approval is not automatic. | Small experiments; investigate an open-source grant later. |
| [FMP](https://site.financialmodelingprep.com/faqs) | Free 250 requests/day; endpoint/history/ticker restrictions must be checked against the actual key. | Optional normalized fundamentals; no blanket free-universe assumption. |
| [Finnhub](https://finnhub.io/) | Publicly offers a free stock API; exact current endpoint/plan entitlements remain unverified in this review. | Possible quote/news/profile supplement; do not assume free historical candles. |
| [Financial Datasets](https://docs.financialdatasets.ai/introduction) | Hosted, key-based data service used by Dexter and AI Hedge Fund. No current universal free entitlement established here. | Adapter inspiration or an optional user-funded provider. |
| [yfinance](https://github.com/ranaroussi/yfinance) | Unofficial Yahoo access; maintainers describe research/personal use and Yahoo's separate rights. | Optional experimentation only; not the reliable/licensed default ingestion path. |

Twelve's [credit rules](https://support.twelvedata.com/en/articles/5615854-credits)
confirm the daily reset, and [usage guidance](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage)
separates individual/internal use from commercial display and redistribution.
Source-code licensing does not grant redistribution of provider datasets. Each
person running AIFi supplies their own account/key; data and credentials stay
outside the source repository. A later hosted commercial service needs its own
provider agreements.

## Public Endpoint Probe

Read-only probe on 2026-10-13; no personal key, cookie, proxy, or account inspected.
Raw downloads and checksums are kept in ignored `.artifacts/stock-design/`.

| Endpoint | Result | Observation |
| --- | --- | --- |
| [nasdaqlisted.txt](https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt) | HTTP 200 | 5,629 rows; 5,621 non-test; 4,328 non-test/non-ETF. |
| [otherlisted.txt](https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt) | HTTP 200 | 7,667 rows; 7,638 non-test; 3,160 non-test/non-ETF. |
| SEC ticker mapping, AAPL/MSFT/NVDA submissions, AAPL Company Facts | HTTP 403 | Network/identification access must be resolved before claiming live SEC ingestion. No retry with disguised identity. |
| Massive authenticated market data | Not requested | User key needed; no successful account-entitlement claim. |

Both directory trailers reported `1012202621:31`. Counts are raw rows, not a
validated common-stock universe: non-ETF rows still include warrants, preferreds,
units, and other instruments. Reconcile identities and types before publishing
a coverage count. See [official directory field definitions](https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs).

## What The Three Checkouts Teach

Inspect-only, pinned at the revisions in [checkout snapshots](local-reference-checkouts.md).
No upstream application code was executed or copied.

- **Dexter**: `src/tools/finance/api.ts` centralizes Financial Datasets calls,
  paginated response assembly, request caching, and source URLs. Its stock tools
  separate snapshots from historical bars. Keep those boundaries; add bounded,
  host-validated pagination and credential redaction rather than copying URLs
  containing secrets into evidence.
- **OpenBB**: SEC `utils/ratelimit.py` demonstrates a shared process limiter;
  provider fetchers separate query, extraction, and normalized data. Its Nasdaq
  provider uses website endpoints without credentials, which is not proof of a
  stable public API contract. Prefer documented market-data endpoints for AIFi.
- **AI Hedge Fund**: `hedge_fund/data/client.py` separates infrastructure errors
  from absent data and applies filing-date filters for point-in-time queries.
  `cached.py` caches successful results and treats unclosed daily windows as
  refreshable. AIFi will persist jobs and revisions instead of relying on an
  in-memory loop or treating history as immutable forever.

Upstream links: [Dexter API](https://github.com/virattt/dexter/blob/534f6be455523c5926eba72bdaf4f914555be5c9/src/tools/finance/api.ts),
[OpenBB SEC limiter](https://github.com/openbq-org/OpenBB/blob/ae0268771f761b036996d81bd21522ce79d95415/openbb_platform/providers/sec/openbb_sec/utils/ratelimit.py),
[AI Hedge Fund client](https://github.com/virattt/ai-hedge-fund/blob/78b779c1389e2d1452dc29606d2c4126d859b964/hedge_fund/data/client.py).
