# Keyless company research sources

Reviewed 2026-10-17. These are actual local network probes, not guarantees of
ongoing availability or complete listing coverage.

| Source | Probe | Decision |
| --- | --- | --- |
| Yahoo public company profile page | HTTP 200; public embedded JSON has company identity, description, industry, sector, website, employee count and recent SEC filings | Implement bounded extraction without executing scripts or calling authenticated APIs |
| Yahoo public analysis page | HTTP 200; embedded JSON includes target consensus, current recommendations, recent grades, GAAP EPS history/estimates and calendar | Implement independent daily analyst/earnings jobs sharing one staged response |
| Yahoo fundamentals timeseries | HTTP 200 without key/cookies; annual/quarterly standardized metrics | Implement with vendor period metadata; retain missing filing/start dates |
| Yahoo direct quoteSummary | HTTP 401 | Do not implement a direct API or browser-cookie/crumb flow |
| SEC submissions/companyfacts/ticker map | Initial HTTP 403 with project URL; HTTP 200 after a user-supplied identifying contact was configured locally | Official adapter live-validated; contact value stays outside the repository |
| Nasdaq company profile/filings API | Requests timed out | Do not present as a working default |
| Apple Newsroom RSS | HTTP 200 | Company-specific press-release feed; not a universe-wide filings adapter |

## Upstream references

- [Yahoo public AAPL profile](https://finance.yahoo.com/quote/AAPL/profile/):
  published `application/json` Svelte fetch records include company data and a
  recent filing index. We read the published document, follow no embedded API
  URLs, and retain the selected embedded response with the public page URL.
- [yfinance fundamentals implementation](https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/fundamentals.py)
  documents the annual/quarterly timeseries approach. The Go collector is an
  independent small implementation; it adds no Python/browser dependency.
- [yfinance upstream/data-use notice](https://github.com/ranaroussi/yfinance):
  unofficial public APIs, research/personal-use context, Yahoo data terms.
- [SEC accessing EDGAR](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)
  documents free public submissions/XBRL APIs, declared User-Agent/contact and
  fair-access requirements. These are different from authenticated filing
  submission APIs used to send filings to EDGAR.

The ignored reference checkouts reinforce provider separation: OpenBB's SEC
company-filings adapter handles issuer-specific filings; Dexter's financial
statement tools use a FinancialDatasets key, not a generally keyless source;
the ai-hedge-fund checkout also has a provider protocol. None is vendored or
executed as a runtime dependency.

## Financial meaning

Yahoo's `asOfDate` is its vendor-standardized period end. It can differ from the
issuer's exact 52/53-week fiscal date; do not label it as an SEC report date.
Annual `12M` and quarterly `3M` rows remain separate even at the same end date.
No fiscal start, filing date, accession, form, fiscal year or fiscal quarter is
invented. Source decimal strings/units are preserved; capital expenditure cash
outflows change sign to the existing positive-expense convention, without abs().
The endpoint commonly supplies four annual and five quarterly observations;
missing fields/currencies remain gaps rather than zeros. Latest standardized
values are not point-in-time backtest evidence.

The filing index is secondary coverage. Validate symbol, filing ID and issuer
paths, then link to SEC's primary document/index. Do not download filing bodies
or imply report dates, acceptance timestamps, amendments or every historical
filing are complete. Newsroom press releases and SEC filings are distinct.

## SEC follow-up validation

On 2026-10-17 the user supplied an identifying contact, saved through local app
settings only. The contact is intentionally absent from versioned documents.
Ticker mapping, AAPL submissions and AAPL Company Facts returned HTTP 200.
The local user configuration now selects SEC for facts/filings; fresh installs
still default to keyless Yahoo until source setup is chosen. The running Go
collector persisted official AAPL/MSFT/NVDA facts (426/455/396 normalized rows)
and recent filings; local reads selected SEC while keeping existing Yahoo data.
The renderer caps returned recent filing rows at 250; this is not total archive
coverage. Prices/company profiles retain their existing Yahoo selection.

## Analyst, earnings and quote checks

[Yahoo AAPL analysis](https://finance.yahoo.com/quote/AAPL/analysis/) was
HTTP 200 on 2026-10-17 without key, cookies or direct quoteSummary access.
Read the published embedded response as data; never execute page scripts or
follow authenticated embedded endpoint URLs. As with profile collection,
upstream format changes and availability remain risks; preserve last good data.

AAPL returned 39 target-price analyst opinions and 44 current recommendation
ratings; these represent different coverage. GAAP EPS actual/estimate pairs
cover four recent quarters; non-GAAP records are separate and not ingested.
Vendor calendar dates can change, including dates whose estimated flag is false.
Do not treat consensus or schedules as issuer-confirmed announcements.

Public quote data distinguishes regular and post-market prices. The existing
chart adapter incorrectly excluded today's completed bar before this change;
it now uses observed session end plus ten minutes, with a post-close refresh.
A price on another site can refer to an extended session or another observation
time; matching a screenshot's number is not a data-quality test.
