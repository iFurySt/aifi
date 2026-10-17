# Politicians, Insiders and Analyst research pages

Status: active, 2026-10-18.

## Goal

In sequence, align the three remaining research pages with the Rallies reference
layout, collect available real data asynchronously, persist to SQLite and retain
local/offline reads. Preserve unrelated working changes and source settings.

## Sequence

1. [x] Inspect the three reference views and primary source schemas/coverage.
2. [x] Politicians: keyless public disclosure collection with exact ticker,
   disclosed amount ranges, transaction vs filing dates, historical activity
   chart, actor/trade filters and source-linked table; commit/push this phase.
3. [x] Insiders: expand SEC Form 4 semantics/coverage with issuer checks,
   derivative separation, post-transaction shares, amendment-safe totals and
   reference-style chart/table; commit/push this phase.
4. [ ] Analyst: preserve real Yahoo consensus/distribution, enrich grade/target
   fields when supplied, present rating gauge and target/upside history without
   inventing analyst identities or missing targets; commit/push this phase.
5. [ ] Validate actual AAPL/MSFT/NVDA collection, offline restart reads, isolated
   desktop/mobile interactions and native/Chrome rendering; update history,
   source coverage, design/release notes and complete this plan.

## Boundaries

All structured data follows collect → SQLite → local read. No page navigation
or filters initiate provider collection. Prefer keyless sources; preserve optional
configured providers and secure credential controls. Source amounts/ranges,
dates, code meanings and identities remain explicit. Never reinterpret disclosed
ranges as exact transaction values or non-market Form 4 events as buys/sells.
Only reviewed public endpoints and original source links are allowed. Reference
pages inform layout only; do not copy their records, portraits or credentials.
Use bounded jobs/staging/rate limits, atomic commits and last-good retention.
