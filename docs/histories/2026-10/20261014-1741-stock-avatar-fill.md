## 2026-10-14 17:41 | Task: Fill company avatars

### User Query

> Company logo images should fill their avatar containers.

### Changes Overview

- Remove the shared image inset and use centered cover sizing.
- Apply the same edge-to-edge image treatment to stock rows, peers and company headers.
- Keep rounded clipping, letter fallback and light-mark contrast.

### Design Intent

Give the avatar one visual boundary instead of a small image inside a second tile.

### Files Modified

- `packages/ui/src/styles.css`
- `docs/design-docs/stock-logos.md`

### Validation

TypeScript, documentation and repository hygiene checks pass; Web/Electron/Go
builds pass. Native review in an isolated checkout confirms AACG gradient art
fills its rounded tile, AACIW/AACO backgrounds reach the edges, and the company
header uses the same treatment. Letter fallback and white-mark contrast remain.
