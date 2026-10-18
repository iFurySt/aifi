## [2026-10-18 09:45] | Task: Align Storage charts and simplify refresh

### Execution Context

- Agent ID: `root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Match category labels to the bar segments, put the largest categories on the
> left, improve Database contents too, remove This device and shrink refresh.

### Changes Overview

- Both category breakdowns sort a copied presentation list by descending bytes;
  their bars, accessible summaries and legends share that order.
- Category colors stay attached to the original category across size changes.
  Larger square legend swatches and label/size segment tooltips improve matching.
- Removed This device and placed an accessible icon-only refresh beside the total,
  preserving update animation, retained results and last-update tooltip.
- Updated the Storage design, frontend guidance, release notes and existing
  isolated Electron gate.

### Design Intent

The chart and legend should read in the same direction and use the same colors.
Sorting is a renderer concern and does not mutate the cached accounting data.
Storage collection, file grouping, paging and native actions are unchanged.

### Validation

- `pnpm check` passed.
- Production Web build and real-Go Electron Storage gate passed in an isolated
  source snapshot. Both breakdowns assert descending segment sizes, corresponding
  tooltip names/values and matching legend colors; refresh asserts compact bounds
  and an accessible label. Existing refresh/error/cache/paging/native checks pass.
- Reviewed desktop, dark and narrow screenshots; Storage stays within the viewport.
- Scoped diff/whitespace checks passed; unrelated in-progress changes preserved.

### Files Modified

- `packages/ui/src/pages/StorageSettings.tsx`
- `packages/ui/src/styles.css`
- `scripts/check-storage-ui.mjs`
- `docs/FRONTEND.md`
- `docs/design-docs/storage-usage.md`
- `docs/releases/feature-release-notes.md`
