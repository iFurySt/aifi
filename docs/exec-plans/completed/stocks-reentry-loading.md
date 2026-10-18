# Stocks re-entry loading

## Goal
Return to a previously opened stock list immediately from its last local view;
share pending local reads across navigation and refresh quietly. SQLite remains
the durable source, with no navigation-triggered provider collection.

## Findings
- Committed sidebar hooks reset component-local feeds on mount and query changes.
- The working continuity cache saves completed state but disposes in-flight feeds
  on unmount, discarding first reads completed while the user is elsewhere.
- Directory rows wait for cached logo authorization/decode before publication.
- The running app showed a directory timeout. Independent read-only SQLite reads
  returned the Nasdaq-100 first page in about 36ms (one measured run); slow storage
  diagnostics and sequential host requests can amplify UI waits. A separate ongoing
  storage task is changing those diagnostics; do not overlap its implementation.

## Scope and risks
Own list-session lifecycle, TTL/revalidation, scroll and delayed-read regression
checks. Preserve ongoing directory/session/Chat changes in the shared checkout.
Do not change user data, scheduling or provider/auth settings. Preserve grouped
cached logo preparation rather than reintroduce sequential avatar loading.

## Work
- [x] Trace renderer, logo, RPC and SQLite read paths.
- [x] Share persistent feed controllers and in-flight results outside view mounts.
- [x] Add delayed/offline remount, collection isolation and freshness regressions.
- [x] Validate scoped source, rebuild/restart and verify real Stocks navigation.
- [x] Update directory contract and history; commit scoped changes.

## Results
Added repository-scoped retained controllers with a one-minute local freshness
window, one shared pending read, bounded idle entries, scope isolation and scroll.
A read completed while off-page remains usable on return; grouped cached-logo
preparation still finishes before first publication. Core feed rebasing retains
loaded pages and unchanged entry identities after a new committed snapshot.

The follow-up visual request adds 2px between settings links and Select rows and
removes only the active option inset shadow. Selected checks and trigger focus
remain intact.

TypeScript, cache/feed tests, delayed Strict Mode App regression, existing
continuity, Select, responsive and production builds passed. A scoped clean
snapshot independently passed TypeScript, cache/feed and both affected UI gates.
The new regression fails on the original hooks because returning restarts the
unfinished batch. Real desktop after restart returned 50 rows on three consecutive
Settings→Stocks switches without Loading/error. The initial cold read still uses
SQLite and remains distinct from a warm revisit. Separate storage changes were
built for live verification but are not part of this scoped commit.
