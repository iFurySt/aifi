# Company Logo Sources

Reviewed 2026-10-14 for the local Stocks UI.

## Directory Coverage

[Nasdaq Trader definitions](https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs)
cover two files: nasdaqlisted and otherlisted. The latter includes NYSE and other
exchange codes. Nasdaq Trader is the directory provider, not an exchange filter.
Neither file includes company website URLs or logo images.

## Shipped Presentation Adapter

The original provider fallback reads fixed public PNG paths such as
[FMP AAPL image](https://financialmodelingprep.com/image-stock/AAPL.png).
Unauthenticated probes returned PNGs for AAPL (1,974 bytes), MSFT (938 bytes) and
KO (19,990 bytes); a nonexistent symbol returned 404. This is a best-effort public
image path, not a contracted or unlimited free market-data API. No quote/profile
API request, API key, or validated corporate identity is implied by a logo.

PNG requests stay in the Node host; the renderer receives only a bounded data URL.
Assets are fetched for visible avatars, cached privately for seven days, and are
not committed or bundled into the repository. This keeps the provider replaceable
and leaves room for a supported profile/branding API later. Commercial/hosted use
needs a separate provider eligibility/licensing decision, as with the rest of the
future hosted product. Do not turn this into a bulk logo mirror.

## Other Options Investigated

- [FMP quickstart](https://site.financialmodelingprep.com/developer/docs/quickstart):
  supported company profile APIs require API keys. Separate from the public PNG path.
- [Elbstream logos](https://elbstream.com/logos) (the former Parqet logos URL):
  advertises a free hotlink tier with visible attribution; self-hosting/caching is
  an enterprise feature. Actual keyless probes returned 403 in this environment.
- [Elbstream API docs](https://elbstream.com/docs): current authenticated API reference.
- [LogoKit pricing](https://logokit.com/pricing/): free tier requires attribution;
  API keys are required, and private caching is reserved for Enterprise.
- [apistemic pricing](https://logos.apistemic.com/pricing): keyless domain/LinkedIn
  lookups with attribution, but the directory does not supply verified domains.
  Do not infer company domains from names just to obtain an avatar.
- [NVSTly icons](https://github.com/nvstly/icons): the ticker image pack has a
  CC BY-NC-SA 4.0 license in ticker_icons/LICENSE. Current exact PNG filename
  coverage is 3,458 of our 7,487 candidates; not a complete current issuer catalog.

Logo availability and brand/ticker mappings can change. A decorative icon does
not prove historical issuer identity or source freshness. Use letter fallback
rather than inventing a company image or guessing aliases.

## Coverage And Catalog Follow-Up

The [2026-10-14 coverage audit](company-logo-coverage-audit.md) compares all current
candidate symbols with three GitHub collections, tests a bounded FMP sample and
records incorrect/missing mappings. The [catalog proposal](../design-docs/company-logo-catalog.md)
explains reviewed aliases, URL lists, optional images and Gist/repository choices.

Public follow-up: [company-logo-catalog](https://github.com/ifuryst/company-logo-catalog)
holds reviewed issuer aliases, source evidence and validation tooling.
AIFi bundles `catalog.json` and `app-fallbacks.json` v0.4.0 from commit
`57502b2b180afb2844f5ede422716aace751f485`, with the upstream MIT notice.
Their Git blobs are `7ceace0d3e8bd76096866127691d41201d6fa237` and
`86f3fba03873d42a7ac8abf99d1979332f2d3087`. These are URL metadata, not artwork.
Reviewed identity covers 47 issuers / 65 securities / 71 exact keys, with 45
issuer images. The 588-row supplement explicitly preserves provisional
name-group and repository availability levels instead of claiming identity review.

The [full 2026-10-18 audit](https://github.com/ifuryst/company-logo-catalog/blob/57502b2b180afb2844f5ede422716aace751f485/docs/availability-2026-10-18.md)
checks actual bytes and offline host reads for every current security: 7,108 of
7,484 have App-eligible PNGs; all S&P 500 and Nasdaq-100 members are covered.
[Remaining 376](https://github.com/ifuryst/company-logo-catalog/blob/57502b2b180afb2844f5ede422716aace751f485/data/audits/2026-10-18/unresolved.csv)
include 338 source gaps and 38 SVG-only candidates. Those are not reported as
usable PNGs. Source/decoder availability remains distinct from issuer verification.

The host checks two fixed GitHub manifests independently at most daily. Newer
bundled metadata supersedes old downloaded versions. PNG paths are restricted to
existing sources, exact reviewed company assets and pinned image paths in three
known repositories. Known rejected bytes remain blocked in provider/cache paths;
matching existing provider bytes satisfy new mappings offline. The full 7 MB
inventory is not ingested as verified identity. See [runtime limits and cache
migration](../design-docs/stock-logos.md).
