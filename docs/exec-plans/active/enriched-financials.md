# Enrich the Financials workspace

Status: implementing, 2026-10-17.

## Outcome

Compare the public Rallies AAPL Financials reference with AIFi, then enrich keyless
collection and the local financial workspace across all supported issuers. Keep
source/currency/fiscal-period meaning and missing coverage explicit.

## Scope and sequence

1. [x] Inspect Rallies annual/quarterly table, trend graph and expandable groups.
2. [x] Expand standard SEC Company Facts and Yahoo timeseries field mappings;
   upgrade older snapshots asynchronously through existing durable jobs.
3. [x] Add deterministic period/metric metadata, safe ratios and YoY calculations;
   retain provenance and never subtract weighted averages or EPS to invent Q4.
4. [ ] Build compact trend chart, richer metric table and expandable statement,
   comprehensive-income, KPI and derived groups, with annual/quarter controls.
5. [ ] Verify parser/derived math, persistence/offline reads and UI interactions;
   inspect live AAPL plus additional issuers, update docs/history, commit and push.

## Boundaries

No new required API key. SEC uses the existing locally configured identifying
contact; Yahoo remains an optional keyless standardized source. Collect → persist
SQLite → local read; navigation never collects. SEC standard entity-wide facts
cannot cover every custom KPI/segment. Yahoo history is shorter. Historical
valuation ratios must not mix a current quote with historical earnings/shares.
No fake values, cross-source period stitching or gap-as-zero calculations.

## Validation

- Provider field/unit/sign and bounded-count tests; scheduled version-upgrade tests.
- Fiscal/quarter/weighted-average, same-period ratio, YoY denominator/missing tests.
- Real persisted data read, no-provider offline read, last-good snapshot behavior.
- Synthetic financial UI coverage for groups/periods/graph/missing data; actual
  Web/Electron desktop/mobile review; preserve existing account and unrelated work.
