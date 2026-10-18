## 2026-10-18 12:50 | Task: Remove exposed frames around loaded stock logos

### Execution Context
- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query
> Adobe's avatar shows short horizontal divider lines above and below its logo.

### Changes Overview
- Inspected the actual cached 250×250 PNG: visible pixels occupy y=14–235;
  transparent top/bottom margins exposed the wrapper border.
- Loaded stock logos now use transparent, borderless wrappers with the existing
  rounded clipping and full-size aspect-preserving image. Letter tiles and the
  contrast backing for white transparent marks remain available.
- No per-symbol styling, source cropping or cached image replacement.
- Aligned the logo guide with the existing 80ms optional preparation budget.

### Design Intent
The artwork provides its own appearance. An extra frame should not become a pair
of unrelated divider strokes where a transparent logo leaves space.

### Validation
Production renderer build and native inspection of cached ADBE, neighboring logos
and the header. No source fetch or account mutation is needed for this CSS fix.

### Files Modified
- `packages/ui/src/styles.css`
- `docs/design-docs/stock-logos.md`
