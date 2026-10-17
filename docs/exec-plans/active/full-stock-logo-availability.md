# Full stock logo availability and delivery

## Goal

Account for every stock in the current local directory and verify usable artwork
through the actual App image path. Fix systematic delivery failures, not only the
reported F-symbol rows. Publish reproducible per-symbol availability outcomes and
keep unresolved identity/source failures explicit instead of inventing artwork.

## Scope and constraints

- Audit the full non-test/non-ETF US directory, including built-in index scopes.
- Separate provider availability, issuer identity, local cache and renderer decode.
- Keep source manifests, checkpoints and asset-use evidence reproducible. No
  third-party image pack is committed. No guessed suffix/domain mappings.
- Preserve local-first reads and bounded acquisition/retry. Do not turn queue
  pressure into a permanent missing-image observation.
- Other sessions have pending work; isolate this task's edits and commits.

## Validation

Full-directory audit counts must add up; check each image with a decoder and the
host size/source policy. Regression test a list larger than the acquisition queue,
offline reuse, retry and shutdown. Check reported F rows in the actual App.
Run catalog schema/build/tests and relevant host/platform/UI checks.

## Progress

- [x] Confirm screenshot F stocks have valid provider-source observations but no
  local image files; first investigation points at dropped queue requests.
- [ ] Fix delivery/retry behavior and verify all stock scopes locally.
- [ ] Audit every directory symbol and expand usable fallback sources.
- [ ] Publish reproducible results, verify actual App, commit and push.
