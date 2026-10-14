## 2026-10-14 20:24 | Task: Company logo coverage research

### User Query

> Check other missing stock logos, look for maintained GitHub collections, and
> evaluate maintaining a URL list or images in a Gist or repository.

### Changes Overview

- Compare all 7,487 current candidate symbols against three pinned Git trees.
- Separate exact PNG presence from issuer correctness and SVG-only coverage.
- Probe 99 FMP symbols, retry network timeouts and record the 13 confirmed 404s.
- Inspect selected images, actual license files and a Go/SQLite resolver reference.
- Document a reviewed issuer catalog proposal and Gist/repository tradeoffs.
- Preserve per-security URL candidates and outcomes in an ignored local CSV.

### Design Intent

Use evidence-backed issuer aliases and curated asset provenance to supplement
providers; avoid treating a successful HTTP response or historical ticker filename
as proof of the current issuer. Catalog publication and resolver implementation
remain follow-up work.

### Files Modified

- `docs/references/company-logo-coverage-audit.md`
- `docs/design-docs/company-logo-catalog.md`
- `docs/references/stock-logos.md`
- `docs/references/README.md`

### Validation

Full-directory filename intersection and bounded real HTTP probes completed;
documentation and repository hygiene checks pass. No runtime code or committed
third-party image assets changed.
