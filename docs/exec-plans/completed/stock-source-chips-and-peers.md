# Stock source details, earnings dots and related stocks

Status: complete, 2026-10-17.

- [x] Move non-streaming after-hours snapshots into dated source details; compact ticker.
- [x] Add shared accessible source chips and meaningful financial indicator colors.
- [x] Replace earnings bars with actual/estimate dots and signed surprise labels.
- [x] Collect Yahoo related symbols asynchronously into SQLite; show only locally
      resolved US listings and sourced local closes, preserving empty/last-good data.
- [x] Verify parsers, offline persistence, popup interaction and Web/Electron;
      update documentation/history, commit and push in stages.

Keep the selected daily/EOD collection model; no navigation-triggered provider
requests or hidden real-time subscription. Related symbols are vendor associations,
not a claimed industry classification. Preserve unrelated pending edits.
