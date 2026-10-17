# Fund ownership coverage and sources

Reviewed 2026-10-17. Values below describe a source probe, not a bundled fixture.

## Reference and source choice

Rallies AAPL Funds has a selected-fund history, position label, reporting quarter,
and a wide table (16 curated managers, 14 quarterly columns in the inspected
view). Names, position changes and counts are data semantics, not reusable data.
Our old panel showed one FMP quarter in a generic table behind an API key.

| Source | Access | Coverage and tradeoffs | AIFi choice |
| --- | --- | --- | --- |
| Yahoo public `/quote/{symbol}/holders/` | No key/cookie | Top institutional and mutual-fund samples, aggregate ownership, true per-holder report dates, rounded change fractions. No full historical endpoint. | Default keyless collector, configurable weekly schedule; retain locally observed history. |
| FMP stable `institutional-ownership/extract-analytics/holder` | Key and endpoint entitlement | Paginated reported institutional holdings for a requested quarter. Existing optional adapter. | Keep selectable; do not assume free-tier permission or fabricate history. |
| Nasdaq public institutional-holdings | No key | Broader holder table and changes; exact period/date and value unit (thousands) matter. OpenBB ships an adapter. | Local probes failed (HTTP2 error, HTTP1 timeout); not enabled as an unverified fallback. |
| SEC Form 13F bulk | No API key, identifying contact/fair access | Official filings, ~$96 MB latest compressed archive; CUSIPs, options/share classes, amendments and manager overlaps require normalized ingestion. | Dedicated future global backfill, not a per-company page request. |

## Measured public sample

A complete public AAPL holders page returned HTTP 200 (~1.1 MB). Its embedded
JSON has 10 institutions and 10 mutual funds. The institutional sample is dated
2026-06-30; mutual-fund dates include 2026-05-31, 2026-06-30, 2026-08-31 and
2026-09-30. The provider's institutional ownership summary is 66.35% and its
institution count is 7,695. These aggregates are not computed from our 20 rows.
The institutions and funds overlap and are never added together.

Yahoo `pctHeld` and `pctChange` are fractions: normalize 0.0797 to 7.97%, not
0.0797%. `position` is shares; `value` is USD, with vendor valuation timing (not
assumed quarter-end 13F fair value). Never divide position by a rounded change
percentage to invent exact previous shares. Keep report date and fetch date
separate. A disappeared top-ten entry is unknown, never a proven exit.

## Persistence and safe history

The shared Go scheduler creates Funds work for every non-test/non-ETF directory
candidate. Yahoo remains subject to shared budgets, pause/settings, bounded page
requests, no-cookie identity validation and source staging. New installations
enable weekly keyless Funds. Existing enabled FMP configurations keep FMP;
existing disabled configurations remain disabled until the user enables them.

Each successful Yahoo payload retains at most 20 distinct observed report dates
and 2,000 rows from the same provider and symbol. Same holder/date observations
replace earlier versions; old observations keep their timestamps. Current sample
membership is explicit. Historical gaps stay gaps. Research reads allow this
bounded Funds history without the generic activity table's 200-row cap.

Normal page reads/filtering/selecting never collect. Atomic evidence/snapshot
commits precede presentation; store read failures or source failures retain the
last good snapshot. Returning after restart works offline. History is not
backfilled by copying adjacent periods or treating an absent manager as zero.

## Next complete 13F backfill

Run a global quarterly SEC import, not ~7,000 redundant archive downloads. Add a
reviewed CUSIP/security-class to directory mapping, manager CIKs, report vs filing
dates, amendment replacement/addition semantics and shared-investment-discretion
deduplication. Exclude put/call positions from common-share totals; distinguish
SH from PRN and validate the filing-era value units. Version the resulting
holdings/history store and expose the same read domain to Funds. Retain source
accessions and never infer real-time buys/sells from disclosed quarter ends.

## Primary references and repository lessons

- [SEC Form 13F datasets](https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets): quarterly as-filed XML-derived archives; latest shown archive 96.05 MB.
- [Nasdaq AAPL institutional holdings](https://www.nasdaq.com/market-activity/stocks/aapl/institutional-holdings): public owner/ownership surface.
- [yfinance holders parser](https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/holders.py): module vocabulary and fraction semantics; AIFi does not copy its authenticated quoteSummary transport.
- [Yahoo public AAPL holders](https://finance.yahoo.com/quote/AAPL/holders/): actual public data inspected without account credentials.
- Local OpenBB Nasdaq `institutional_ownership.py`: keyless ranking/filter model and thousands-value conversion; SEC `form_13FHR.py`/`parse_13f.py`: CUSIP, options and amendment boundaries.
- Dexter research skills mention institutional holders as an evidence input;
  ai-hedge-fund's paper-fund bookkeeping is a separate domain, not a holder source.
