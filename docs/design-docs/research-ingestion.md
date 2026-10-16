# Local stock research ingestion

Status: implementation, 2026-10-17. Daily prices, company details, standardized
financials and recent filing indices default to keyless Yahoo sources; other
datasets retain separate setup gates. No live completeness claim follows
from a passing fixture test or the existence of the directory.

## Product behavior

Stocks and Watchlist read collected data; AAPL/MSFT/NVDA and every other imported
candidate follow the same contracts. No price/profile/financial fixture fallback
remains in these pages. Portfolio positions and illustrative agent replies remain
examples. Missing data, contact/key requirements and source access failures are
explicit. Six research tabs remain available even when their datasets are empty.

Settings has dedicated API keys, Data sources, Sync and Storage categories.
Sync independently selects price, company, financial and filing sources; old
settings gain keyless defaults without a SQLite schema migration.
Massive and optional FMP keys are encrypted locally; Alpaca credentials remain a
reserved alternate-provider slot, not an implemented price adapter. SEC needs an
identifying app/contact string, not an API key. Optional FMP datasets are disabled
by default: users enable the datasets their account actually supports. No paid
subscription is purchased by the application.

## Providers and access

| Dataset | Implementation | Access / initial cadence |
| --- | --- | --- |
| Listing directory | Existing Nasdaq Trader files | No key; existing daily schedule |
| Daily OHLCV (default) | Yahoo Finance public chart endpoint | No key; unofficial personal-research source; split-adjusted, up to two years, closed sessions only |
| Raw daily OHLCV (optional) | Massive daily grouped market summaries | Key; EOD, configured interval; up to 730 calendar-day backfill |
| Company identity/profile (default) | Yahoo public company page embedded JSON | No key/cookie; weekly profile; bounded description, sector/industry, country, website, employees |
| Company identity/profile (optional) | Massive ticker overview; SEC exchange/ticker-to-CIK map | Key/contact; weekly company profile, daily shared map |
| Filing index (default) | Yahoo public company page recent SEC filings | No key/cookie; daily, secondary limited index with validated primary SEC links |
| Filings (optional) | SEC submissions recent window | Contact; daily; recent window only |
| Financial facts (default) | Yahoo fundamentals timeseries | No key/cookie; weekly; standardized annual/quarterly periods, usually 4 years / 5 quarters |
| Financial facts (optional) | SEC Company Facts selected standard US-GAAP/DEI concepts | Contact; weekly; last seven years; raw source preserves other concepts |
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

Yahoo prices use one two-year chart request per candidate, filtered to the configured
history window, with 24-hour default refresh. Massive remains selectable in Sync
settings and uses one whole-market request per date. Only the selected price
provider runs price jobs; reads prefer that provider and can retain an existing
other-provider series when it has no stored data. Series are never mixed.
Yahoo workers rotate profile → filings → facts → prices before claiming work,
so an initial price backlog cannot starve company research. Each dataset retains
its own enabled flag and cadence. Company page responses are shared privately
for at most 24 hours between profile/filing jobs, preserving original fetch time;
only validated committed dataset snapshots appear in normal reads. Source
selection is rechecked before requests. SEC filings can still feed the insider
dependency when Yahoo is selected for the visible filing index.

Massive splits/dividends also use shared
market-wide snapshots with indexed per-symbol SQLite reads; daily refresh does
not make two requests per listing. Newest sessions and the three
initial development targets are prioritized before expensive enrichment. A
previous-New-York-date watermark avoids unfinished sessions. Weekends are skipped;
empty provider holiday responses are evidenced. No exchange-grade calendar or
real-time market status is claimed. Default old-session repairs run monthly;
recent sessions use the configurable daily cadence.

One worker per provider runs with a 10-minute context and 15-minute fenced lease.
All HTTP calls reserve a SQLite-backed provider minute/day slot, even across
multiple hosts/processes using the same DB. Defaults: Yahoo 20/min and 10,000/day, Massive 5/min, SEC 240/min,
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

Each bar series preserves its source basis: Massive raw, Yahoo split-adjusted
OHLCV (not dividend-adjusted `adjclose`). Yahoo windows replace the prior symbol
window atomically because new splits can restate old history. The renderer never
adjusts an already split-adjusted series again. Raw Massive OHLCV is preserved. Once a complete action snapshot exists, the domain layer
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
IFRS, business/geographic segments, peer relationships, future earnings estimates/calendar and short
interest still require additional dataset-specific work. No missing value is zero.

Shared action snapshots retain two years of events and publish their per-symbol
rows atomically. Earlier per-listing action jobs retire without deleting evidence.

Universe inserts use bounded 500-job transactions and an indexed manual issuer-scope
lookup per reconciliation. New listings/dates do not inherit an older manual request while automation is
paused. Dual-host startup must not wait behind a per-row full-queue scan;
the 12,000-job reconciliation/open regression exercises this boundary.

## Keyless source validation

On 2026-10-16, host HTTP probes and the real Go service successfully collected
AAPL, MSFT and NVDA: 501 closed daily bars each, latest session 2026-10-15.
Chrome rendered AAPL from SQLite. This is actual initial coverage, not a claim
that all directory entries have data. All 7,482 current candidates have Yahoo
jobs; coverage grows asynchronously, bounded by the shared budget. At 20/minute,
a complete first pass takes hours and may take longer after failures/cooldowns.
Class-share dots map to Yahoo hyphens; unsupported warrants/preferred/units and
other unmatched symbols remain explicit gaps, without guessing a parent price.

Yahoo is an unofficial public endpoint with no API availability contract.
The [yfinance upstream](https://github.com/ranaroussi/yfinance) documents its
public-API approach and personal-use context; no Python dependency is required
by our bounded Go adapter. Data use remains governed by Yahoo's terms. No user
browser cookies, login, client secrets or browser impersonation are used.
Stooq's CSV URL returned browser verification in this host probe and was not
added as a working source. HTTP 401/403 on Yahoo apply a shared 15-minute minimum
cooldown rather than incorrectly asking for a key or blocking every listing.
Normal 429/Retry-After handling also applies; last-good data stays readable.

SEC remains keyless but needs an honest identifying contact; its direct
financials, filings and insider adapter remain unvalidated on this device.
Corporate actions, ratings, funds, politician trades and news retain separate
setup gates. The additional keyless company collectors are described below.

Coverage status collapses daily bars to distinct symbols before joining the
current candidate directory. This avoids a per-session × listing join as prices
accumulate. A 20,000-bar/1,000-candidate regression exercises the status boundary.

## Keyless company research

[Source probes and financial semantics](../references/keyless-company-research.md)
record Yahoo public page/timeseries access and unsuccessful alternative probes.
Public page extraction executes no scripts and follows no embedded URL. It keeps
only the matching public embedded JSON response as compressed evidence with the
page URL, not the page's ads/scripts. A malformed, throttled, challenged or
identity-mismatched page cannot replace the last good snapshot.

Facts retain explicit `annual`/`quarterly` vendor periods; they have no invented
fiscal starts or SEC filing metadata. The domain layer filters these periods
directly, while keeping the existing SEC duration/YTD derivation path separate.
Capital expenditure is normalized to the existing expense sign convention.
Financial footnotes/tooltips distinguish unavailable filing dates. Annual
balance columns can use explicit vendor annual observations.

On initial live validation, AAPL/MSFT each persisted 108 financial rows and
80/83 recent filing index entries respectively, plus descriptions/industries.
NVDA also persisted 108 financial rows, its profile and 81 filing index entries. These are initial
measured samples, not a claim that all listings have coverage. Every candidate
gets jobs for all four Yahoo datasets. At 20/min and 10,000/day, a universe-wide
first pass spans multiple running days and can take longer after failures.
Snapshots survive restart; normal tab reads still never fetch providers.
Long company descriptions default to a short preview with an explicit expand.
