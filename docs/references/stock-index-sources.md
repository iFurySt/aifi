# Stock index membership sources

Verified 2026-10-15. These are real constituent snapshots, not alphabetic Top-N
lists or ETF holdings substituted for an index.

| Collection | Source | Snapshot date | Security count |
| --- | --- | --- | --- |
| S&P 500 | [datasets constituents CSV](https://github.com/datasets/s-and-p-500-companies/blob/main/data/constituents.csv) | Observed 2026-10-15 | 503 |
| Nasdaq-100 | [Nasdaq full JSON response](https://api.nasdaq.com/api/quote/list-type/nasdaq100) | Source date 2026-10-14 | 101 |

S&P dataset is Wikipedia-derived, not an official licensed S&P feed. The
[maintainer](https://github.com/datasets/s-and-p-500-companies#license) releases
the data under [ODC-PDDL-1.0](https://opendatacommons.org/licenses/pddl/1-0/).
Only factual ticker symbols plus source/hash/date metadata are bundled. The
Nasdaq API returned rCode=200, offset=0, totalrecords=101 and 101 unique rows;
price/market-cap fields are discarded. Its quote-date field is recorded as a
source snapshot date, not a guarantee of effective-date index history. Nasdaq's
analogous `sp500` path returned an error and is not used.

S&P's observed date is collection time, not an official effective date. The
CSV had 503 unique symbols; both complete lists reconciled to the current local
Nasdaq Trader candidate directory without unresolved symbols in the validation
sample. Future imports retain unresolved symbols and report local coverage.

Raw-source SHA-256 values, fixed URLs and timestamps are versioned in
`apps/cli/internal/store/index-seed.json`. `scripts/update-stock-index-seeds.py`
retrieves the fixed sources (or captured input files for offline review), checks
bounds/uniqueness/full Nasdaq pagination, and prepares a reviewable seed diff.
Review material additions/removals against index announcements before committing;
a row-count check alone is not proof of membership accuracy. Runtime performs no
index-source network calls or user membership writes in this initial slice.

Automated index refresh, failure outcomes and independent configurable schedule
remain follow-ups. Existing directory sync does not claim to refresh these seeds.
