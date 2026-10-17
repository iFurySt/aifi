# Stock quote presentation and outlook

Status: complete, 2026-10-17.

- [x] Remove visible index snapshot date; prefer company name over listing text.
- [x] Verify price/date discrepancy, fix completed-session ingestion and freshness;
      show source-backed market status, change and timestamp without fake live data.
- [x] Probe public analyst and earnings data and connect usable results through
      background collection → SQLite → local reads, preserving provider choices.
- [x] Validate parsing, date/session boundaries, offline reads and real AAPL UI;
      record sources, limits and change history, commit/push in stages.

Keep existing About content. Do not hard-code the comparison site's price or
copy its current clock into a quote timestamp. Preserve unrelated working edits.
