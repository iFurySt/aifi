# Catalog-first Company Logos

## Goal

Use the public company-logo-catalog for reviewed security-to-issuer/logo mappings,
fall back to the existing exact-symbol FMP adapter, and restart the native app.

## Scope And Decisions

- Bundle a pinned v0.1.0 metadata seed; host refreshes only the fixed catalog URL
  at most once per 24 hours, with validated local cache and last-good retention.
- Only verified, active catalog entries and explicitly trusted PNG origins are
  eligible. Candidate images never become approved catalog results.
- Source URL/review hash keys isolate new mappings from old symbol negative or
  positive caches. Preserve useful existing FMP bytes as fallback/migration input.
- Directory, IPC/read ports, renderer CSP and local data storage boundaries stay intact.
- Bounded source fallbacks, shared issuer asset caching and host shutdown.

## Risks

Incorrect mappings, hash changes, unsafe catalog URLs, old caches overriding new
choices, transient network failures, and excessive cumulative fallback latency.

## Milestones

- [x] Catalog parser/cache/refresh and pinned seed.
- [x] Catalog-first image retrieval/fallback/migration with focused tests.
- [x] Checks, native smoke/visual validation and documentation.
- [x] Commit/push staged changes; main build and native app restart.

## Validation

Fixture tests for status/alias/validity, malformed metadata/trusted URL rejection,
last-good/offline catalog reuse, source priority and stale negatives, fallback,
checksum changes, shared assets/concurrency and shutdown. Real AACOW/TREO reads
and native screenshots; normal isolated offline smoke remains network-free.

## Verification Results

- `make ci`: repository gates, TypeScript, 43 tests, builds, Go vet/race pass.
- Final TypeScript/check/build after timeout adjustment pass; isolated offline
  native smoke passes without external requests.
- Cold real reads: AACOW, PCG$X, QRED.R and TREO return checksum-matching catalog
  sources; AACG returns the exact-symbol FMP fallback. Local ignored diagnostics
  record provenance, byte sizes, hashes and latency.
- Native isolated-checkout review confirms AACO/AACOU/AACOW share Abony's logo
  and TREO displays the official mark. Old missing caches no longer block aliases.
- Real image latency was 9–12 seconds in this environment. Removed an overly
  short catalog attempt cap; the original 15-second total lookup budget remains.

## Delivery

Implementation committed and pushed; main was fast-forwarded and rebuilt. The
native app was restarted from the primary checkout and left open with the AACO
filter, showing identical reviewed logos for AACO, AACOU and AACOW. QA artifacts
were preserved in the primary checkout's ignored directory before worktree cleanup.
