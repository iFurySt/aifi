# Reviewed Company Logo Catalog

Status: public catalog established, 2026-10-14. AIFi runtime integration remains pending.

Repository: [ifuryst/company-logo-catalog](https://github.com/ifuryst/company-logo-catalog).
The initial catalog has 14 companies, 31 securities, 37 exact symbol/alias keys,
eight verified logo sources and six candidate sources withheld by its resolver.
It publishes URL metadata, evidence and checksums; no third-party image pack is bundled.

## Decision Direction

Use a reviewed company/issuer catalog to supplement automatic providers. A Gist
is suitable for a small JSON URL/alias list. Prefer a regular Git repository for
an image collection: contribution PRs, per-entry history, source metadata,
release versions and individual asset notices are easier to maintain together.
The user authorized a public independent repository; the catalog is now kept
there. Use versioned catalog releases as the future integration boundary.

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

Reviewed issuer overrides → local asset/cache → configured logo providers → letter
fallback. Unknown mappings remain explicit; missing images never invent identity.
The existing StockLogoRepository can stay unchanged while the host changes its
resolver. The current fixed-host PNG validation must remain; remote manifests or
URL overrides require explicit trusted origins, bounded reads and validation,
not arbitrary renderer-controlled URL downloads.

Before improving coverage, retain separate outcomes for unavailable source,
transient network failure, backpressure and rejected image. Use incremental,
limited acquisition for visible or selected securities; no startup universe-wide
image download is needed.

## Scope To Implement Later

- AIFi adapter for the public catalog, local overrides and resolver order.
- Expand reviewed issuer/security mappings and image checks; schema/versioning
  and the offline catalog resolver are implemented in the public repository.
- Provider settings, retrieval diagnostics and retries for queue/network failures.
- Asset contribution validation and versioned delivery.

Research evidence: [coverage audit](../references/company-logo-coverage-audit.md).
