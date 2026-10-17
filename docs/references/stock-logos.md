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
AIFi bundles `catalog.json` v0.3.0, commit
`34c978e8984f09cda182b4ded999bd8c7cf01f7f` (catalog Git blob
`0b62a75f1becbe09733f86feea733a108fbd6d32`), with the upstream MIT notice.
The seed contains URL metadata, not image files: 42 issuers, 59 securities,
65 exact symbol keys and 40 issuers with reviewed images. Twenty-four new issuer
reviews include the reported E-list gaps. ADI and ELV use official small-icon
assets, while ELV's generic A checksum is rejected. See the upstream
[batch review](https://github.com/ifuryst/company-logo-catalog/blob/34c978e8984f09cda182b4ded999bd8c7cf01f7f/docs/review-2026-10-17.md).

The host prefers verified active mappings and checks the fixed GitHub manifest
at most daily. A newer bundled seed supersedes older downloaded metadata;
updates cannot downgrade the catalog. Seven exact issuer PNG paths supplement
the FMP/Tactical policy, including sources added after the original seed.
Known rejected image bytes stay blocked in old caches and provider fallback;
matching existing provider bytes can satisfy new reviewed mappings offline.
The separate exhaustive source inventory remains unreviewed and is not bundled
as approved company identity. See [runtime limits and cache migration](../design-docs/stock-logos.md).
