# Reviewed Company Logo Catalog

Status: proposal, 2026-10-14. No new remote catalog or runtime adapter is deployed.

## Decision Direction

Use a reviewed company/issuer catalog to supplement automatic providers. A Gist
is suitable for a small JSON URL/alias list. Prefer a regular Git repository for
an image collection: contribution PRs, per-entry history, source metadata,
release versions and individual asset notices are easier to maintain together.
Start under AIFi if desired; extract to an independent public repository when
other projects need it. Repository creation/publication is a separate decision.

## Suggested Shape

```text
manifest.json               # catalog version and company records
symbols.json                # market + symbol → issuer id
assets/<issuer-id>/logo.png  # optional, only for reviewed redistribution
sources/<issuer-id>.json    # origin, evidence, license/usage notes, checksum
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

- Reviewed catalog schema/versioning, local overrides and resolver order.
- Correct issuer/security mappings and validity dates.
- Provider settings, retrieval diagnostics and retries for queue/network failures.
- Asset contribution validation and versioned delivery.

Research evidence: [coverage audit](../references/company-logo-coverage-audit.md).
