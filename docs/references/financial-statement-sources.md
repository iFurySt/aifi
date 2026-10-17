# Financial statement coverage and source choices

Reviewed 2026-10-17, against the public
[Rallies AAPL Financials page](https://rallies.ai/research/AAPL/financials).

## Observed gap

| Area | Rallies reference | Previous AIFi | Implementation direction |
| --- | --- | --- | --- |
| History | 20 quarterly columns and a Revenue/Net income trend | At most six columns, no financial trend | Up to 20 collected quarters or ten annual ends; selectable local series |
| Summary | 13 financial/valuation rows | Five income metrics | Financial overview, with safe computed margins/FCF |
| Income statement | 15 rows | Five | Costs, R&D, SG&A, tax, pretax income, basic/diluted EPS and weighted shares |
| Balance sheet | 28 rows | Four | Current/noncurrent breakdown, receivables, inventory, securities, debt and equity components |
| Cash flow | One visible reference row | Three | Operating/investing/financing flows, capex, FCF, D&A and share compensation |
| Comprehensive income | Nine rows | None | Standard OCI, currency, hedge and securities concepts where reported |
| KPI | Six issuer-dependent rows | None | Dividends, repurchases, purchase obligations and shares; custom KPIs remain a gap |
| Derived metrics | Seven including historical valuation | None | Same-period margins, current ratio and YoY growth; historical valuation stays unavailable |

Reference presence does not prove its values or definitions are correct. AIFi
keeps issuer source dates/units, and does not copy reference numbers as fixtures.

## Sources

[SEC Company Facts documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
describes a keyless endpoint containing standard, entity-wide XBRL concepts.
It excludes custom taxonomies and dimensional/segment facts. The existing local
identifying contact and rate budgets remain necessary. One issuer response can
supply many financial metrics; avoid separate requests per metric.

The existing Yahoo timeseries adapter remains a keyless alternative for fresh
installs. [yfinance's upstream implementation](https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/fundamentals.py)
is a reference for annual/quarterly standardized field names, not a new runtime
dependency or an official supported Yahoo API. Access/format may change. The
three ignored reference projects reinforce independent provider adapters rather
than a UI-to-provider shortcut; see [keyless research](keyless-company-research.md).

## Measured AAPL probe

Public source bytes were inspected locally and are not committed. The extended
independent Go parser normalized 1,981 SEC facts across 63 metrics from the
current AAPL response (about 510 KB of normalized payload). Previously, the local
snapshot had 426 rows across 12 metrics. Yahoo returned 90 populated series from
92 requested annual/quarterly fields, normalized to 405 observations across
45 metrics. Source coverage and these counts can change.

There are 64 allowlisted standard metric mappings, with 46 Yahoo fields. SEC
retains seven years of actual fiscal dates/filing identity; Yahoo typically gives
four annual/five quarterly vendor periods. Do not merge those different period
ends to manufacture a longer history. Existing source choice remains explicit.

## Interpretation and remaining gaps

- Cumulative cash flows become single quarters only with matching YTD start dates.
  Per-share values and weighted-average shares are never subtracted like cash flows.
- Ratios require same period/currency; missing operands and zero denominators stay
  missing. YoY uses actual year-apart observations with a positive comparison base.
- Capital expenditure, dividend and repurchase outflows use the positive-expense
  convention; net cash-flow signs remain intact. Tags remain available for audit.
- Similar names are not interchangeable: total capitalization is not total
  liabilities/equity, and nonoperating interest is not all nonoperating income.
- Custom manufacturing obligations, product/geographic revenue and non-GAAP KPIs
  require a future filing-instance/segment adapter. A generic purchase-obligation
  concept must not be labeled as manufacturing-only obligations.
- Historical P/E and price/sales need coherent historical prices, trailing values,
  shares and split basis; the current quote is not a substitute. Keep gaps explicit.
- The current financial presentation uses USD/USD-per-share/shares; non-USD and
  full IFRS normalization remain separate work rather than relabeled dollar data.

Snapshots carry a financial normalization version. Old successful snapshots are
woken through durable background jobs, with existing source selection, budgets,
pause flags and failed backoff. Reads retain last-good SQLite data while updating;
opening Financials never fetches provider data or starts a hidden sync.
