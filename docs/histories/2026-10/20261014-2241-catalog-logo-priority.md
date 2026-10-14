## [2026-10-14 22:41] | Task: Catalog-first company logos

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex local workspace

### User Query

> Connect the public company-logo-catalog to the app, prefer reviewed mappings
> and logos, fall back to the original provider, and restart the native app.

### Changes Overview

- Bundled the v0.1.0 catalog metadata seed and upstream MIT notice. Node host
  rebuilds exact US symbol/alias mappings and accepts only verified active PNGs.
- Added validated private catalog caching and fixed-URL background checks at
  most daily; failure retains the last good manifest and offline startup works.
- Prefer catalog sources, then exact-symbol FMP, then the existing letter avatar.
  Reviewed hashes/dimensions and trusted origins are checked before rendering.
- Source/hash cache keys share issuer assets without allowing old symbol failures
  or positives to mask a new mapping. Compatible legacy PNGs remain useful.
- Preserved directory membership checks, read contracts, renderer sandbox/CSP,
  private storage, bounded concurrency/queueing and shutdown cancellation.

### Design Intent

Keep issuer identity and image provenance in a maintained public catalog while
keeping rendering independent of GitHub availability. The seed currently enables
eight verified company images; six candidates stay unapproved. It does not infer
issuer identities from suffixes or expand into bulk image acquisition.

### Validation

- `make ci` passed: repository gates, TypeScript, 43 tests, builds and Go vet/race.
- Final check/test/build passed after retaining the 15-second overall image budget
  in place of an overly short per-catalog attempt cap.
- Isolated offline Electron smoke passed with the bundled catalog.
- Cold public reads returned reviewed catalog sources and matching checksums for
  AACOW, PCG$X, QRED.R and TREO; AACG used the original FMP source.
- Actual Electron review in the isolated checkout confirmed shared Abony logos
  for AACO/AACOU/AACOW and the official Tactical Resources logo for TREO.
- Main was rebuilt and the native app restarted from the primary checkout; the
  delivered app remains open with the AACO filter and all three reviewed logos.

### Files Modified

- `packages/host/src/logo-catalog.ts`, seed JSON/license and focused tests
- `packages/host/src/public-assets.ts`
- `packages/host/src/stock-logos.ts` and tests
- Architecture/security/frontend docs, logo references, release notes and plan
