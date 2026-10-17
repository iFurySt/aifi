# Chart detail and market capitalization

Status: complete, 2026-10-17.

- [x] Align return arrows with values using layout rather than baseline offsets.
- [x] Persist source-reported company market cap with quote observation time;
      reprocess older public-page snapshots through the background queue once.
- [x] Replace changing footer readout with a bounded dark crosshair tooltip;
      render every daily volume/candle, use calendar ranges and retain source units.
- [x] Verify parser/persistence/window boundaries, actual AAPL and pointer/keyboard
      behavior, document limits and commit/push in stages.

No fabricated intraday timestamps, inferred share-class market caps, or hover-time
provider requests. Preserve unrelated pending UI/ChatGPT work.
