# Stock logo delivery under page load

## Request

Check the entire stock universe and resolve missing logos, including the reported
F-symbol rows. This entry records the first implementation slice; the full audit
continues in the active execution plan.

## Changes

- Host queue pressure rejects as retryable instead of resolving as a missing logo.
- The local renderer adapter drains page requests through four transport slots,
  with a bounded waiting queue; cache-only reads retain their independent lane.
- Visible avatars retry transient errors with bounded backoff and retry null
  results after the memory TTL. Offscreen/unmounted avatars cancel retry timers.
- Added a standalone offline Electron regression that mounts/scrolls 50 avatars,
  forces the first visible avatar to encounter pressure, and verifies all 50
  decode successfully with at most four active requests and no manual focus.

## Validation

21 host/platform tests, TypeScript and the isolated 50-avatar Electron check pass.
The full-universe availability and persistence audit remains separate from this
fix; no claim of complete issuer/logo identity review is made here.
