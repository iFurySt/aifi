# Fund history backfill, reference layout and shared logo catalog

Status: active, 2026-10-17.

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
4. [ ] Add the narrow fund-logo capability and local cache; replace the Funds plot
   with a selectable holder ring, status pills and historical data table.
5. [ ] Backfill actual AAPL/MSFT/NVDA, verify math/provenance/offline/UI/native/Web,
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
