# Reviewed company logo coverage batch

## Goal and scope

Fill a bounded batch of US company logos, prioritizing the reported E-symbol
S&P 500 gaps and incorrect issuer images. Publish reviewed URL metadata in the
public catalog, then update AIFi's seed and narrow source policy so it can consume
that work. Keep artwork private and retain local cache-first reads.

## Risks and validation

A valid PNG does not prove issuer identity. Compare actual pixels with primary
issuer branding and exact directory symbols; reject known mismatches. Do not
promote the exhaustive unreviewed inventory or enable arbitrary image origins.
Other work is present in AIFi: stage only this task's paths/hunks.

Validate catalog schema, deterministic builds, offline Python/Node regressions;
validate host source policy, catalog resolution and cache behavior, then build and
check the affected stock avatars in the App.

## Progress

- [x] Inspect catalog coverage and AIFi consumer boundary.
- [x] Review a bounded batch and publish catalog changes.
- [x] Update AIFi seed/source support and verify cached consumption.
- [x] Commit/push the completed changes and record remaining coverage gaps.

## Decisions

- 2026-10-17: Keep the reviewed catalog distinct from provider availability. The
  current App accepts only FMP and Tactical Resources PNGs; official-site entries
  added to the catalog after the original seed require explicit consumer support.

## Result

Published upstream v0.3.0 (34c978e). All catalog checks, 30 upstream tests,
23 host regressions, TypeScript and Web/Electron builds pass. Native ECL/ELV
avatars and persisted v0.3.0 metadata verified. Review history records the
remaining 342 source gaps; no universe-wide completion is claimed.
