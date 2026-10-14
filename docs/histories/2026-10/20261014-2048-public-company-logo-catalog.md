## 2026-10-14 20:48 | Task: Publish the company logo catalog

### User Query

> Maintain an initial logo batch and create a public repository under ifuryst.

### Changes Overview

- Created https://github.com/ifuryst/company-logo-catalog as a public independent repository.
- Landed separate tooling and seed-data commits: 14 companies, 31 securities,
  37 exact market/symbol keys, eight verified logos and six image candidates.
- Recorded primary issuer evidence, source URLs, image hashes/dimensions and dates.
- Added an offline resolver that excludes candidate images, deterministic bundle,
  JSON Schema, ten regression tests, pinned CI and contribution templates.
- Found Tactical Resources' official website favicon and recorded reviewed Abony,
  PG&E and QuasarEdge shared-issuer logo mappings for missing stock classes.
- Updated AIFi catalog/reference docs with the new repository and scope.

### Design Intent

Keep source/issuer review separate from logo bytes and redistribution. URL-only
metadata starts the public catalog without re-bundling restricted third-party
image collections. AIFi adapter integration remains a separate change.

### Validation

Catalog validation, deterministic generated-bundle checks and ten tests pass.
GitHub confirms PUBLIC visibility and its CI succeeds on the seed commit.
AIFi documentation and repository hygiene checks pass.
