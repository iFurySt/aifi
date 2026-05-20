## [2026-05-20 18:16] | Task: Cerebras IPO close correction

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Review tracked targets under `research/targets`, search for incremental information, update artifacts one by one, commit and push, then decide whether to send an email notification to `ifuryst@gmail.com`.

### Changes Overview

- Area: Cerebras research archive
- Key actions: updated CBRS IPO close facts to reflect the full underwriter-option exercise and final gross proceeds.

### Design Intent

The prior 2026-05-20 refresh correctly identified the IPO close but did not carry through the closing-release detail that the underwriters exercised the full 4.5M-share option. This update keeps the base prospectus fact separate from the final closed offering fact so later valuation and capital-cushion analysis uses the right number.

### Files Modified

- `research/targets/cbrs/evidence/news/2026-05-20-ipo-close-market-snapshot.md`
- `research/targets/cbrs/index.md`
- `research/targets/cbrs/profile.md`
- `research/targets/cbrs/artifacts/decision-frames/2026-05-15-thesis-frame.md`
