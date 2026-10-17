# Stock Data Coverage Audit

Audit date: 2026-10-18 (Asia/Taipei). Prices sampled from the October 16 US session.

## Findings

- ADBE and BABA were still on October 15 bars. Their profile jobs had failed; a SEC filing profile supplied only sparse metadata.
- TSLA, JPM, XOM and KO had no local Yahoo bars/profile at the initial check. These were queued, not a missing API key.
- The full-directory queue and free-provider budgets had not completed initial collection. Index membership was not used for queue priority; three seed symbols had special priority.
- Line charts always used the positive color, including falling ranges.
- A fresh source fetch confirmed YTD/52-week definitions can differ from Rallies. Do not rewrite valid source values merely to match another vendor.

## Sample comparison

Rallies values below were read from its public Financials page during this audit.
They are comparison snapshots with different vendor/session semantics; Yahoo
values are regular-market prices with their own source timestamps.

| Symbol | Yahoo regular price | Rallies reference | Local issue before repair |
| --- | ---: | ---: | --- |
| [ADBE](https://rallies.ai/research/ADBE/financials) | $245.20 | $244.21 | October 15 price; profile failed |
| [AAPL](https://rallies.ai/research/AAPL/financials) | $343.46 | $342.68 | Current regular-session bars |
| [MSFT](https://rallies.ai/research/MSFT/financials) | $529.05 | $527.43 | Current regular-session bars |
| [NVDA](https://rallies.ai/research/NVDA/financials) | $214.13 | $213.70 | Current regular-session bars |
| [BRK.B](https://rallies.ai/research/BRK.B/financials) | $532.02 | $531.59 | Current regular-session bars |
| [BABA](https://rallies.ai/research/BABA/financials) | $109.11 | $109.37 | October 15 price; profile failed |
| [TSLA](https://rallies.ai/research/TSLA/financials) | $354.72 | $352.44 | No bars/profile yet |
| [JPM](https://rallies.ai/research/JPM/financials) | $339.72 | $339.25 | No bars/profile yet |

After bounded repair, all ten sampled symbols have October 16 local bars and
Yahoo company profiles. ADBE now displays $245.20 regular close, -$6.47 (-2.57%),
sector, description and $95.43B reported market cap. Its 1Y decline is red.
Revenue $25.97B, net income $7.28B and gross margin 89.3% agree with Rallies
at displayed precision. Rallies reports different market cap, price, YTD and
52-week high; these remain source/definition disagreements, not silently matched.
Yahoo bars/meta both report ADBE 52-week high $363.70; YTD uses the previous
year’s last close ($349.99), producing -29.94%. Rallies reports $453.26 and -26.05%.

## Local coverage at audit checkpoint

Universe: 7,484 current non-test/non-ETF directory symbols. Counts mean
a persisted snapshot for the configured source, not complete fields, current
quotes, a complete institutional census, or a verified common-stock universe.

| Dataset | Stored symbols |
| --- | ---: |
| analyst | 390 |
| earnings | 316 |
| facts | 1,654 |
| filings | 1,702 |
| funds | 37 |
| insiders | 1,629 |
| peers | 960 |
| prices | 1,979 |
| profile | 562 |

792 stored price series were older than the newest locally observed session.
Coverage changes as the app-owned worker continues. Remaining gaps include queued
initial work, transient network/public-page failures, unsupported symbols,
unmapped SEC issuers, and source entitlements. BABA SEC facts remained unavailable
at this checkpoint; institution-history jobs for several samples were still queued.
News was disabled at the start of this audit; no invented values replace gaps.

## Repair and repeatability

- Explicit `data research sync --symbols ADBE,BABA` queues only current-directory symbols and mapped issuer jobs for enabled configured sources (maximum 50).
- Explicit manual jobs lead automatic work; current protected index members and their shared SEC issuers lead the alphabetical universe. Existing budgets, leases, source switches and blocked entitlements remain enforced.
- The whole-directory queue remains enabled; no collector is triggered by opening a page.
- Run `python3 scripts/audit-stock-coverage.py --db /path/to/aifi.sqlite` to repeat the read-only coverage audit. Raw evidence/reports stay in ignored `.artifacts/stock-data-audit/`; no credentials or private paths belong here.
