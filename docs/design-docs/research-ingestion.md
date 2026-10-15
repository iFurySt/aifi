# Local stock research ingestion

Status: implementation, 2026-10-15. Actual provider coverage requires configured
keys/contact and successful source responses. No live completeness claim follows
from a passing fixture test or the existence of the directory.

## Product behavior

Stocks and Watchlist read collected data; AAPL/MSFT/NVDA and every other imported
candidate follow the same contracts. No price/profile/financial fixture fallback
remains in these pages. Portfolio positions and illustrative agent replies remain
examples. Missing data, contact/key requirements and source access failures are
explicit. Six research tabs remain available even when their datasets are empty.

Settings has dedicated API keys, Data sources, Sync and Storage categories.
Massive and optional FMP keys are encrypted locally; Alpaca credentials remain a
reserved alternate-provider slot, not an implemented price adapter. SEC needs an
identifying app/contact string, not an API key. Optional FMP datasets are disabled
by default: users enable the datasets their account actually supports. No paid
subscription is purchased by the application.

## Providers and access

| Dataset | Implementation | Access / initial cadence |
| --- | --- | --- |
| Listing directory | Existing Nasdaq Trader files | No key; existing daily schedule |
| Raw daily OHLCV | Massive daily grouped market summaries | Key; EOD, configured interval; up to 730 calendar-day backfill |
| Company identity/profile | Massive ticker overview; SEC exchange/ticker-to-CIK map | Key/contact; weekly company profile, daily shared map |
| Filings | SEC submissions recent window | Contact; daily; recent window only |
| Financial facts | SEC Company Facts selected standard US-GAAP/DEI concepts | Contact; weekly; last seven years; raw source preserves other concepts |
| Splits/dividends | Massive market-wide reference snapshots, all pages | Key; daily |
| Insider transactions | SEC Form 4/4-A XML from stored submissions; immutable documents reused | Contact; daily; latest 40 filings, derivative status and transaction codes retained |
| Institutional ownership | FMP stable extract-analytics/holder, paginated | Optional key/endpoint entitlement; weekly; latest elapsed quarter |
| Congressional trades | FMP stable senate-trades + house-trades | Optional key/entitlement; daily; reported amount ranges retained |
| Analyst data | FMP stable grades + price-target-consensus | Optional key/entitlement; daily; vendor-defined consensus |
| News headlines | FMP stable news/stock | Optional key/entitlement; daily; recent provider response window |

Primary specs checked during implementation:
[Massive market batches](https://massive.com/docs/rest/stocks/aggregates/daily-market-summary),
[ticker overview](https://massive.com/docs/rest/stocks/tickers/ticker-overview),
[Massive plans](https://massive.com/pricing?product=stocks),
[SEC APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces),
[FMP stable endpoints](https://site.financialmodelingprep.com/developer/docs).
The documented Massive Basic plan is 5 calls/minute, two years of EOD history.
Real account entitlements must be validated; FMP ownership/ratings/congress are
not assumed to be included with a free key. SEC access previously returned 403
from this host; a real configured contact/network response is the validation gate.

## Persistence and scheduling

Go owns SQLite v4. Research jobs, raw bars, immutable gzip source evidence,
normalized snapshots, source links, heads, CIK aliases and budgets persist there.
Settings/ordinary reads never contact a provider. A future cloud adapter must
synchronize into this same persistence boundary before the UI reads its results.

On app launch the engine reconciles jobs for every current directory candidate;
it repeats after directory/mapping/config changes and at least hourly. A company
is not hard-coded into the collector. Newly listed candidates receive jobs on the
next reconciliation. Old data is retained; automatic deletion is not inferred
from directory absence. Candidate directory membership does not prove common
stock type or SEC reporting coverage.

Prices use one whole-market request per date. Splits/dividends also use shared
market-wide snapshots with indexed per-symbol SQLite reads; daily refresh does
not make two requests per listing. Newest sessions and the three
initial development targets are prioritized before expensive enrichment. A
previous-New-York-date watermark avoids unfinished sessions. Weekends are skipped;
empty provider holiday responses are evidenced. No exchange-grade calendar or
real-time market status is claimed. Default old-session repairs run monthly;
recent sessions use the configurable daily cadence.

One worker per provider runs with a 10-minute context and 15-minute fenced lease.
All HTTP calls reserve a SQLite-backed provider minute/day slot, even across
multiple hosts/processes using the same DB. Defaults: Massive 5/min, SEC 240/min,
FMP 4/min and 200/day; settings permit lower or account-specific higher limits.
Daily counters currently use UTC days. Provider 429/Retry-After applies a shared
cooldown; actual provider quota rules can be stricter than this local budget.
Transient failures back off 1–64 minutes. Not-yet-available instruments/facts
retry on at least a daily/dataset cadence; 404 does not permanently disable a
new issuer that may publish data later. Invalid credentials block the provider;
endpoint access errors block that dataset. Credential/contact updates unblock
eligible work. Disabled datasets remain disabled for manual requests too.

Manual sync persists eligible requests, including with automation paused. Before
subsequent HTTP requests workers re-check current pause/dataset settings. Crash
recovery reclaims expired leases and rejects stale worker commits. Source reads
occur outside write transactions; normalized data, evidence links, raw bars and
job success commit atomically. Failure preserves the previous readable snapshot.

Institutional pagination stages completed pages privately for 24 hours. A fresh
first-page fingerprint scopes reuse; changed first pages invalidate the old page
set. Retry/resume can reuse source pages without publishing partial holdings.
Source timestamps are retained per page; this is not an atomic vendor-time feed.
The final snapshot appears only after an empty terminal page is observed.

## Domain reads and financial semantics

`StockResearchRepository.get(symbol)` is injected into the shared UI. Platform
uses `research.read`; Web/Electron transports stay local. `research.status`,
`research.settings` and `research.sync` are separate administrative capabilities.
The renderer receives bounded normalized records/source URLs, never evidence
blobs or plaintext secrets. Detail reads cap activity rows at 200 and filings at
250 and expose total activity counts. Full source data remains in SQLite.

Raw OHLCV is preserved. Once a complete action snapshot exists, the domain layer
computes split-adjusted history (not dividend-adjusted total returns) using only
splits effective by the last stored session. Without actions the chart labels
unadjusted prices. The closing date is always visible. YTD uses the last available
prior-year close; indicators are absent when history is insufficient.

Financial facts preserve decimal source strings, units, tags, actual start/end,
filing dates and accession IDs. The current normalized view keeps the latest
restatement for a concept/period while immutable raw sources retain prior
versions. It is a latest-information view, not a point-in-time backtest API.
Quarter cash flows can be derived only from compatible cumulative periods with
the same start. Annual totals are never divided by four. Weighted EPS is not
subtracted to invent a quarter. TTM requires four contiguous quarterly periods.
Valuations/margins use explicitly matching periods/units where available.
Market cap uses the provider's company-level weighted share reference, not a
single share class's outstanding count; its reference date remains available.
Company Facts is not a complete dimensional/custom financial statement parser;
IFRS, business/geographic segments, future earnings estimates/calendar and short
interest still require additional dataset-specific work. No missing value is zero.

Shared action snapshots retain two years of events and publish their per-symbol
rows atomically. Earlier per-listing action jobs retire without deleting evidence.

Universe inserts use bounded 500-job transactions and an indexed manual issuer-scope
lookup per reconciliation. New listings/dates do not inherit an older manual request while automation is
paused. Dual-host startup must not wait behind a per-row full-queue scan;
the 12,000-job reconciliation/open regression exercises this boundary.
