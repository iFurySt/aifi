# Reviewed Company Logo Catalog

Status: full-directory availability audit and consumer updated, 2026-10-18.

Repository: [ifuryst/company-logo-catalog](https://github.com/ifuryst/company-logo-catalog).
The v0.4.0 reviewed catalog contains 47 companies, 65 securities, 71 exact keys
and 45 companies with visually reviewed images. A separate 588-entry availability
supplement retains provisional name-group/repository image observations; AIFi
explicitly accepts these as best-effort decorative artwork, not verified legal
issuer aliases. Both metadata profiles are bundled and refreshed independently.

Every current directory security has an availability result: 7,108 of 7,484
pass real PNG decoding and offline host cache reads. S&P 500 (503/503) and
Nasdaq-100 (101/101) have full PNG availability. The 376 remaining App gaps are
338 without a selected source plus 38 with SVG-only candidates. HTTP/decoder
success does not imply independently reviewed issuer identity.
No third-party artwork pack is bundled or published. See the
[full audit](https://github.com/ifuryst/company-logo-catalog/blob/57502b2b180afb2844f5ede422716aace751f485/docs/availability-2026-10-18.md).

## Decision Direction

Use a reviewed company/issuer catalog to supplement automatic providers. A Gist
is suitable for a small JSON URL/alias list. Prefer a regular Git repository for
an image collection: contribution PRs, per-entry history, source metadata,
release versions and individual asset notices are easier to maintain together.
The user authorized a public independent repository; the catalog is now kept
there. AIFi bundles the v0.4.0 reviewed seed and availability supplement and validates background updates from its main manifest.
The bundled snapshot pins provenance; cached last-good metadata keeps
the app independent of GitHub availability.

## Suggested Shape

```text
data/companies/<id>.json    # editable company, security and logo source records
catalog.json                # generated companies + exact market:symbol index
schemas/company.schema.json # record format
scripts/catalog.py          # validate, build, resolve, summary
assets/README.md            # future image-file contribution policy
```

Example issuer mapping supported by the Abony SEC filing:

```json
{
  "issuerId": "sec:0002099906",
  "name": "Abony Acquisition Corp. I",
  "symbols": ["US:AACO", "US:AACOU", "US:AACOW"],
  "logoSourceUrl": "https://financialmodelingprep.com/image-stock/AACO.png",
  "identityEvidenceUrl": "https://www.sec.gov/Archives/edgar/data/2099906/000121390026018826/ea027764601ex99-2_abony1.htm",
  "reviewedAt": "2026-10-14",
  "assetRedistribution": "not-reviewed"
}
```

The mapping is evidence-backed; listing a remote source does not imply a license
for copying that image into a public catalog. Keep source URL and redistributed
asset eligibility separate. Preserve original brand artwork and theme variants;
brand and asset rights remain distinct from the code/metadata license.

## Review And Contribution

1. Match the security to a stable issuer id and exchange/market context. Use CIK
   where applicable, or another stable internal issuer key. Do not infer issuer
   identity by blindly removing W/U/class suffixes.
2. Prefer a verified issuer/IR website or a correctly identified maintained brand
   asset. Provider and search results are candidates until checked against the
   issuer. Record source URLs and the check date.
3. For a local asset, record checksum, dimensions, format, source and applicable
   usage/redistribution terms. Avoid bundling whole third-party collections just
   because they are hosted on GitHub.
4. Contributor adds/updates one issuer and associated symbols in a PR. Automation
   validates shape, duplicate aliases, bytes/dimensions and URLs; human review
   checks identity. Ticker changes, mergers and delistings need validity dates.
5. Publish versioned manifests and only approved assets. Consumers pin a version
   and keep a working local copy rather than needing Gist/GitHub on every render.

## Runtime Direction

Verified catalog source/cache → explicit availability supplement/cache → exact-symbol FMP source/cache → letter fallback.
Known rejected artwork checksums are blocked at every cache/provider step.
Newer shipped metadata supersedes an older disk manifest; background refresh
cannot downgrade the catalog. Exact official asset paths require code review. Unknown mappings remain explicit; missing images never invent identity.
The StockLogoRepository stays unchanged; Node host owns the catalog resolver. The current fixed-host PNG validation must remain; remote manifests or
URL overrides require explicit trusted origins, bounded reads and validation,
not arbitrary renderer-controlled URL downloads.

Before improving coverage, retain separate outcomes for unavailable source,
transient network failure, backpressure and rejected image. Use incremental,
limited acquisition for visible or selected securities; no startup universe-wide
image download is needed.

## Scope To Implement Later

- User-owned local overrides and configurable provider selection.
- Expand reviewed issuer/security mappings and image checks; schema/versioning
  and the offline catalog resolver are implemented in the public repository.
- Provider settings, retrieval diagnostics and retries for queue/network failures.
- Asset contribution validation and versioned delivery.

Research evidence: [coverage audit](../references/company-logo-coverage-audit.md).
