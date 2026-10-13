# Stock Directory Source Selection

Reviewed 2026-10-13. This is the first live directory collection milestone,
separate from price/fundamental ingestion and the current renderer's fixtures.

## Decision

Start with Nasdaq Trader's official bulk symbol directory over HTTPS. Use
Massive reference enrichment later for security types/identifiers; use SEC for
company/filing linkage. No provider key is required for the initial directory.

| Source | Shape / coverage | Role |
| --- | --- | --- |
| [Nasdaq Trader definitions](https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs) | Documented pipe-delimited Nasdaq-listed and other-exchange-listed files; symbols, security names, exchange/category, test/ETF flags and provider conventions. Updated throughout the day. | Implemented base snapshot source. |
| [Massive All Tickers](https://massive.com/docs/rest/stocks/tickers/all-tickers) | Authenticated paginated reference API, included in Stocks plans; type, exchange, optional CIK/FIGI, active/date filters. | Later authoritative type/identity enrichment; actual personal-key access still needs a probe. |
| [SEC APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Company metadata and submissions include tickers/exchanges; CIK identifies the filing entity. | Later company/filing join; not the exchange listing authority or a guaranteed complete security universe. |
| [Financial Datasets](https://www.financialdatasets.ai/pricing) | Key/account-based hosted service used by two reference projects; coverage and dataset entitlement are vendor-specific. | Optional future adapter, not required for this keyless directory milestone. |

This deliberately uses two public data-file endpoints, not an undocumented
Nasdaq website screener API or an HTML scrape:

```text
https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt
https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt
```

The files publish an end-of-file creation marker, useful for rejecting truncation
and recording source age. Its raw timestamp has no explicit UTC offset in the
field documentation; do not silently convert it into a UTC availability instant.
Current otherlisted has eight header/data columns but a legacy seven-field
creation trailer. The parser accepts that shape or the full-width trailer.
The live otherlisted file also contains exchange code F, absent from the inspected
field page. Preserve alphabetic provider codes without inventing exchange names
or MIC mappings; do not discard otherwise valid rows when the enum evolves.

## Findings From The Three Pinned Projects

- **OpenBB**: Nasdaq `utils/helpers.py` implements `get_nasdaq_directory` over
  HTTPS and `parse_directory` that removes the creation row. Its SEC equity search
  is a company/CIK lookup. AIFi borrows the provider/normalization separation;
  its original Go parser also validates trailer, row width, flags, duplicate
  symbols, download bounds, and source provenance. No source was copied.
- **Dexter**: the market-data tool describes `get_stock_tickers`; its shared
  finance client uses Financial Datasets, API-key headers, pagination and caching.
  Vendor-available tickers are not automatically the exchange listing universe.
- **AI Hedge Fund**: its Financial Datasets client uses the same hosted service
  for company facts/prices, with timeouts and infrastructure/absent-data handling.
  This supports keeping directory, company facts, and prices as separate datasets.

Pinned revisions and paths: [reference checkouts](local-reference-checkouts.md).

## Actual Verification

Public requests on 2026-10-13 returned HTTP 200 for both files:

| File | Bytes | Security rows | Published creation marker |
| --- | --- | --- | --- |
| nasdaqlisted.txt | 349,424 | 5,629 | 1012202621:31 |
| otherlisted.txt | 543,178 | 7,667 | 1012202621:31 |

13,296 is a raw security-row count, not a verified common-stock count. The default
candidate view excludes test issues and ETFs; all other security types remain
`unknown`. `ETF=N` does not exclude warrants, preferreds, units, or debt.
No name-based heuristic is treated as authoritative type classification.

All source rows and provider symbol aliases are retained, including test issues
and ETFs. Missing current membership means absent from this snapshot, not a
proven delisting. Listing IDs match source/symbol/exchange within this collector;
rename/reuse continuity requires later authoritative identity enrichment.

Raw responses, SQLite stores, and live-probe output stay outside tracked source.
No paid dataset, user key, private account, or upstream application was accessed.

Related: [runtime commands](../../apps/cli/README.md),
[pipeline](../design-docs/us-stock-data-pipeline.md), and
[directory plan](../exec-plans/completed/stock-directory-foundation.md).
