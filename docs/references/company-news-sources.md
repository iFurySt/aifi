# Company news sources

Reviewed 2026-10-19.

## FMP access

The [personal pricing page](https://site.financialmodelingprep.com/pricing-plans)
lists Financial Market News in Starter and higher personal subscriptions; Basic
does not include that category. A personal API key is not inherently ineligible:
endpoint entitlement depends on the subscribed plan. The documented ticker
endpoint is [Search Stock News](https://site.financialmodelingprep.com/developer/docs/stable/search-stock-news),
`/stable/news/stock?symbols=AAPL`. A single bounded request using the configured
local key returned HTTP 402 on the review date. No key, request URL containing a
key or provider response body is recorded here. The application keeps FMP as an
explicit optional source rather than treating a saved key as proven access.

## Rallies observation

The public [AAPL summary](https://rallies.ai/research/AAPL/summary) displays Digest
as a prose summary linking to a Rallies-hosted article. The inspected
[article page](https://rallies.ai/news/apple-expected-to-unveil-smart-home-products-featuring-updated-siri-ai-41586734b30e1eed)
contains structured prose and related stories without an upstream news-provider
credit/source link. The public pages/assets inspected did not establish its
upstream supplier. Do not claim FMP, Reuters, Benzinga or Yahoo powers Rallies
without evidence. AIFi neither copies this prose nor depends on Rallies endpoints.

## Yahoo public ticker RSS

The direct [AAPL feed](https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL&region=US&lang=en-US)
returned HTTP 200 and ten dated news items without cookies, authorization or an
API key. The legacy `finance.yahoo.com/rss/headline?s=AAPL` URL redirects to this
host; the collector uses the direct endpoint and continues rejecting redirects.
The feed is a limited current window, not a full archive or a guaranteed API.
Public accessibility is not a promise of redistribution rights or service levels.

The collector accepts only the fixed HTTPS host/path/query, validates channel
title and ticker link against the requested exact Yahoo symbol (dot → hyphen),
and bounds XML to 2 MiB/200 items. It rejects DTD/entity declarations, invalid
feeds and mixed/tampered identity. Valid items require a title, parseable
publication date and HTTPS Yahoo Finance URL; future-dated, unsafe and duplicate
items are discarded. Feed descriptions become bounded plain-text snippets.
No full article, image or linked page is downloaded. Preserve the original XML
as immutable source evidence and normalize timestamps to UTC.

## Application contract

Yahoo news shares the existing Yahoo provider budget and fair rotating worker;
new installs enable it on a daily cadence. Legacy disabled choices remain off.
An enabled legacy FMP choice remains FMP. Sync settings exposes source/interval
and enable/disable; missing data for a disabled dataset says Sync is off.
Existing saved news remains readable when sync is disabled or a request fails.
Source failures never become fabricated stories.

Digest shows stored headlines, publication time, short source-provided snippets
and allowlisted original links. This is not labeled AI-generated synthesis.
Collection → atomic SQLite persistence → local read remains mandatory. Normal
navigation, refresh and focus never download news. See the implementation and
regressions in `market/yahoo_news.go`, store/engine news tests and
`pnpm smoke:news` for shared React/Settings/empty-state/link/layout verification.
