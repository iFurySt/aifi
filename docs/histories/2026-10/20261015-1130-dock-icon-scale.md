## [2026-10-15 11:30] | Task: Match native Dock icon scale

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex local workspace

### User Query

> Check why AIFi's Dock logo looks larger than other apps.

### Changes Overview

- Compared alpha bounds of the shipped AIFi icon with locally installed Finder
  and Chrome icon exports. The AIFi opaque tile occupied about 88.3% of its
  canvas, versus about 80.5% for both native reference icons.
- Added a dedicated macOS export with an 824px maximum opaque tile extent on a
  transparent 1024px canvas, centered using the original artwork's actual bounds.
- The native bundle ICNS and runtime Dock/window icon now consume the same export.
  Original artwork, in-app masks, favicon/touch and other-platform exports retain
  their previous sizing and shape.
- Added a deterministic CoreGraphics size/position export to the existing authoring
  pipeline; cross-platform builds use the committed PNG without requiring Swift.

### Design Intent

Correct native icon optical scale through canvas inset rather than redesigning
or shrinking shared UI branding. Preserve the approved symbol, color and geometry.

### Validation

- Read-only alpha analysis confirms the new tile bounds are centered at (512,512),
  with an 824px maximum opaque extent, matching the reference icons' apparent scale.
- Re-exporting all assets leaves existing brand outputs unchanged and reproduces
  the same macOS PNG bytes.
- `make ci` passes with 43 TypeScript tests and Go vet/race checks.
- Actual isolated native smoke and strict deep signature verification pass.
- Native runtime icon bytes match the new source export.

### Files Modified

- `scripts/export-macos-icon.swift`, `scripts/export-brand-assets.mjs`
- `scripts/build-desktop.mjs`, `scripts/desktop-runtime.mjs`
- `packages/ui/src/assets/brand/app-icon-macos.png` and asset documentation
- Brand/frontend documentation and release notes
