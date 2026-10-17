# Fund history backfill, reference layout and shared logo catalog

Status: complete, 2026-10-17.

## Requested result

Continue Funds to match the supplied Rallies references: a holder ring/selection,
status pills and a wide multi-quarter table with real history and manager logos.
Manage reviewed fund-logo URLs in the existing public company-logo-catalog repo;
cache images locally rather than fetching them on every render.

## Sequence

1. [x] Verify keyless historical source and distinguish options/CUSIPs/filing dates.
2. [x] Add a configurable 13f.info historical adapter for a reviewed manager roster,
   exact symbol→CUSIP lookup, bounded staged requests and normal SQLite commits.
3. [x] Extend the public catalog with independently identified fund manager records,
   verified PNG URL metadata, provenance and offline validation/build/tests.
4. [x] Add the narrow fund-logo capability and local cache; replace the Funds plot
   with a selectable holder ring, status pills and historical data table.
5. [x] Backfill actual AAPL/MSFT/NVDA, verify math/provenance/offline/UI/native/Web,
   update records and commit/push scoped phases in both repos.

## Boundaries

Use public unauthenticated 13f.info endpoints, identified via its MIT public source
and live JSON probes. Never copy Rallies data/images or infer an identity from a
similar name. Exact ticker/CUSIP mapping and manager CIKs remain explicit. Exclude
put/call records; preserve source filing IDs and report dates, validate source
units and bound the backfill to 4–20 quarters (default 14). Unknown is not zero;
only a confirmed portfolio report with no corresponding common-share position
can establish a reported absence. Holdings deltas do not imply actual trades or
split-adjusted trading flows. Manager source pages and historical JSON are staged
with budgets/retry/pause; page navigation never collects. All structured values
commit to Go-owned SQLite before reads. Preserve last-good snapshots.

The catalog publishes metadata and original code, not third-party artwork packs.
Review issuer/manager identity independently; unknown images remain unverified.
App downloads only reviewed fixed-source PNGs, validates bytes and uses the
existing private disk/session image caches. No remote image CSP or arbitrary
renderer URL capability. Preserve unrelated files, staged work and settings.


## Completion evidence

- Data `3cba12f` and cache `0348679` committed/pushed separately. Public catalog
  `cf8a13d` contains 16 reviewed CIK/logo records and its own validation/build tests.
- Actual SQLite: AAPL 216 observations / 16 managers; MSFT 200 / 15; NVDA 203 / 15.
  All have 14 columns, 2023 Q1–2026 Q2; unknown/amended reports remain blank.
- All 16 fund PNGs validated and cached. Actual Chrome AAPL displays 16 ready
  logos; native AIFi is refreshed to the same historical view.
- TypeScript, 153 unit tests, full Go format/vet/race/build, production builds and
  isolated Funds desktop/mobile ring/table checks pass. Actual 390px Chrome keeps
  body width at 390px and horizontal table overflow contained. Quarter selection
  changes PanAgora Q2 +591,188 to Q1 −48,714 reported shares correctly.
- Collection continues across eligible directory jobs under user-adjustable
  budgets; full universe/full institutional ownership is not claimed. Exact
  unknown CUSIPs, unsupported securities and ambiguous amendments remain gaps.
