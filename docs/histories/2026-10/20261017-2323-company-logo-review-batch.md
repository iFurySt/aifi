# Company logo coverage and reviewed catalog upgrade

## Request

Maintain another batch of missing company logos in the public catalog, starting
with the reported E-list companies, and make the reviewed results usable in AIFi.

## Changes

- Published upstream catalog v0.3.0 (`34c978e`): 24 new issuer records after visual
  comparison with primary issuer references, 36 bounded source rechecks, and
  regenerated inventory/statistics. Reviewed images now cover 40 issuers / 53
  securities; the frozen universe still has 342 unresolved source gaps.
- ECL, ED, EFX, EG, EIX and EL gain reviewed mappings. ADI and ELV prefer official
  small-icon PNGs; ELV's generic A image is explicitly rejected by checksum.
- Updated the bundled seed and seven exact official PNG allowlist entries,
  including five previously unsupported official sources from upstream v0.2.0.
- Newer shipped metadata wins over an older disk manifest; refresh cannot
  downgrade it. Rejected artwork cannot reappear from disk or raw fallback.
- Newly reviewed exact-URL sources reuse existing provider cache bytes only after
  matching review checksum/dimensions. No startup universe download, renderer
  external URL access, or third-party artwork bundle was added.
- Updated catalog/source/runtime documentation and the execution plan. Unrelated
  in-progress changes are excluded from this task's commit.

## Validation

- Upstream schema/build/inventory deterministic checks; 24 Python + 6 Node tests.
- Host catalog/cache regressions: 23 tests; TypeScript and Web/Electron build pass.
- Native App restarted; ECL renders its star mark and ELV renders the corrected
  E/roof mark. The actual host persisted catalog v0.3.0 and matching ELV bytes.

## Limits

Source availability is distinct from identity review. This batch does not claim
complete logo coverage; remaining unreviewed mappings and source gaps are kept
explicit in the public repository. Image requests and private caching retain
existing bounded, cache-first decorative-asset behavior.
