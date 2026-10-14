# AIFi Brand Identity

Status: implemented, 2026-10-15.

Selected direction: concept 04, three independent rounded forms composing one
asymmetric research/agent symbol. The product display name is **AIFi**; the user
selected artwork did not specify a different name.

## Assets And Rendering

[Brand assets](../../packages/ui/src/assets/brand/README.md) record the built-in
imagegen prompts and authoritative generated alpha master/app icon. Reusable
black, white, green and background variants share the master mask, avoiding
independently generated geometry drift. SVG exports embed a compact PNG mask
and should not be described as traced vector paths. Generated white cutouts
with noise were rejected. The master is preserved for later vector refinement.

Shared Logo renders the mask in the theme foreground plus the exact AIFi
wordmark. The rail shows only a 32px mark; compact chat identity uses 24px.
Browser title/application metadata/favicon and native window/Dock/about panel
use the same name and local icon. No external image/font calls are added.

## Native Local Identity

A macOS development launcher copies the pinned Electron runtime into its fixed
ignored output, edits only that copy's bundle name/identifier/icon and locally
ad-hoc signs it preserving entitlements/runtime flags. Its local entry loads the checkout's
desktop code for normal launches or double-clicking the local bundle.
The launcher caches by Electron version/icon checksum/schema. It never changes
node_modules, system settings, installed apps, Chromium security or app data
directories. Other platforms retain the pinned executable and shared main-process
icon/menu setup; their native launch remains unverified.

This does not add an installer, notarization, update service or release packaging.
The local bundle depends on the checkout and must not be distributed as a release.

## Verification

Run `make ci` and `pnpm smoke:desktop`; the isolated native smoke loads the local
mask, validates title and the existing runtime/data/security flows. Review the
actual native menu/name/Dock icon and small mark in both themes, then verify
Web desktop/mobile and favicon through the user's Chrome. Regenerate committed
size/format exports with `node scripts/export-brand-assets.mjs` on macOS.
