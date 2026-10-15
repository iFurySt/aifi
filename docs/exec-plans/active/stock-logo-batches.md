# Stock logo batch presentation

Goal: scrolling must not insert cached logo rows before their local images are ready.

- [x] Diagnose row-lazy reads, short lookahead and blank pending avatars.
- [x] Add bounded disk-only batch capability separate from image download queue.
- [x] Prepare/decode cached page images before DirectoryFeed publishes rows.
- [x] Load the next page earlier; show letters immediately for uncached images.
- [x] Regression tests, real directory/cache fast-scroll checks, Electron validation.
- [ ] Update docs/history, commit/push, rebuild/restart the user's app.

Risks: cold provider requests can take seconds and cannot promise instant unknown
artwork. Do not block directory paging on remote HTTP. Keep directory membership
checks in Go, image origins allowlisted, response and memory bounded. UI stale
response handling remains in DirectoryFeed. Test restart/disk hits with a blocked
provider queue and actual public cache assets, not only short fake fetch delays.

Implementation notes: a per-symbol membership loop cost about 2.2 seconds per
50 rows against the real dataset. Added private Go `directory.contains` backed
by one parameterized current-candidate SQL query; cached page reads then measured
roughly 80–120 ms for the first two batches. Single image requests use this same
lightweight membership path so cold lookups do not repeatedly count/load profiles.
