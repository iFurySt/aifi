# Full stock image availability audit and local delivery

## Request

Check all stock logos instead of repairing only a small reported batch; ensure
working sources are actually usable in the App and persist the results.

## Changes

- Audited the current 7,484-security directory, not only an index or screenshot.
  Exported immutable provider evidence and published per-symbol results upstream
  v0.4.0 / 57502b2. No private account data or third-party artwork was published.
- Added a distinct 588-row best-effort PNG supplement with exact keys, immutable
  source paths, checksums/dimensions and provisional verification basis. Existing
  reviewed identity, known-bad hash blocking and raw fallback remain separate.
- Added SKYD/SKYD.W, VMRK and VYLR branding after corporate changes; replaced
  blank FSP/KNX provider images. Rejected a WordPress favicon candidate for KNX.
- Added an explicit full-directory audit/private-import command. Validated 5,928
  unique PNG contents, then proved actual host offline reads for every positive
  security. The one-time import does not run at startup or page reads.
- Kept original source observation times distinct from decode/import timestamps.
  The prior delivery slice (81c1f37) fixes dropped page requests and visible retry.

## Validation

- Public schema/build/inventory/fallback checks and 35 Python/Node tests pass.
- 33 scoped host/platform tests and TypeScript pass in an isolated staged snapshot.
  Its Web/Electron build passes. The concurrent working tree has unrelated model
  runtime dependency/type changes, so it is not represented as a clean full-tree CI.
- The real App was restarted with the independently validated host bundle and
  the private PNG cache. FICO, FIS, FISV, FITB, FIX, FLEX, FOX and FOXA all display
  artwork; both active cached manifests report v0.4.0.
- The 50-avatar offline UI check proves visible retry and four-request pressure
  bounds without a focus/reload action.

## Remaining gaps

7,108/7,484 securities pass PNG decode + offline App reads. S&P 500 is 503/503;
Nasdaq-100 is 101/101. Full coverage is not claimed: 338 lack a selected source,
and 38 have SVG-only candidates. Their per-symbol list remains public and the
execution plan stays active for that coverage work. Availability does not imply
that every provider/name-group image has been manually verified as issuer branding.
