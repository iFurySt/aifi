# AIFi Brand Identity

## Goal

Apply the selected concept 04 three-part mark to the shared app and native desktop
identity. Keep the display name AIFi, matching the selected artwork.

## Scope

- Generated isolated master and app icon; shared-shape color/background variants.
- Shared logo/wordmark, browser favicon/title, desktop menu/Dock/window identity.
- macOS local named runtime copied from the pinned Electron distribution; never
  patch node_modules or migrate local workspace/data directories.
- No change to stock collection work, data contracts, research, or navigation.

## Milestones

- [x] Generate, inspect and store brand assets/provenance.
- [x] Apply shared UI/native identity and reproducible local launch.
- [x] Checks, isolated native smoke and light/dark/browser review.
- [ ] Deliver into the primary checkout and restart the app.

## Risks And Validation

Generated white cutouts can introduce noise or shape drift. Runtime colors reuse
one alpha silhouette. Check small sizes and themes. Native naming needs a proper
bundle identity rather than mutating the package-manager Electron download.
Validate the actual named macOS runtime, menus, icons, child lifecycle and offline
smoke, then review the browser favicon/logo. Preserve existing app data paths.

## Verification Log

CI and 43 tests pass. Native smoke decodes the mask and validates the document
name and existing runtime flows. The local bundle passes strict deep code-signature
verification. Actual native App/menu names are AIFi; both themes render correctly.
Chrome desktop/mobile and all six reusable asset previews are verified.

The first manifest cache stamp inside the bundle root and an external resource
symlink prevented strict signature validation. The final launcher keeps its stamp
outside the bundle and uses a sealed local entry instead; the package-manager
runtime remains unchanged. The local bundle continues to depend on its checkout.
