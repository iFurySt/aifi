# Stock Data Audit and Backfill

## Goal

Compare ADBE and representative US stocks with live Rallies pages and persisted
source evidence. Audit directory-wide coverage and repair confirmed collection,
scheduling and presentation defects while preserving local-first reads.

## Scope and risks

Read-only audit first. Preserve source timestamps, rate limits, last-good heads,
credentials and unrelated changes. Rallies is a comparison source rather than a
canonical price feed. No provider fetches on navigation. Backfills use bounded
collector jobs and persist before local reads.

## Steps

- [x] Inspect ADBE storage and full-directory job/coverage counts.
- [x] Sample Rallies/source prices, provenance and missing profile/fact/filing data.
- [x] Fix verified root causes and add targeted regressions.
- [x] Run bounded backfill, compare results and record remaining coverage gaps.

## Findings

Initial local audit: ADBE bars end October 15 while several seed symbols have
October 16. ADBE profile failed `invalid_company_page`. Many symbols still have
queued jobs. Chart line color is hardcoded positive even for declining ranges.

## Outcome

Eight Rallies public Financials pages and ten keyless Yahoo chart samples were
compared. All ten local samples now have October 16 bars and company profiles.
ADBE metadata, analyst and earnings coverage also recovered. The full directory
still has substantial initial queue/failed-source gaps; BABA SEC facts and several
institutional-history repairs remained unfinished at the checkpoint. These remain
ordinary background work under existing limits, not a claim of full coverage.

Manual repairs now lead automatic work; current index members/shared issuers lead
the alphabetical universe. Added a bounded `sync --symbols` path and a read-only
coverage audit. Falling line ranges and cursor points use red. Source disagreements
are preserved rather than matched to Rallies. Native App shows the repaired ADBE.

Scoped staged-source Go race tests (store, market, research, command), TypeScript
and responsive Stocks smoke pass. Production builds and native review completed.
Concurrent Congress/Chat changes were excluded from scoped validation/commit.
See `docs/references/stock-data-coverage-audit.md` for findings and remaining gaps.
