# Repository Link and License Choice

## Goal

Add a compact account-menu GitHub link and resolve the requested commercial-use
boundary before changing the repository license.

## Scope and decisions

- Open the fixed repository externally; keep research-provider URLs separate.
- The user selected AGPLv3 with direct LICENSE/README updates, without migration
  copy or custom personal-use/noncompete restrictions.
- Apply `AGPL-3.0-only` consistently to first-party project manifests and retain
  third-party license files and copyright attribution.

## Verification

Exact external destination policy tests, account menu smoke with intercepted
external opens, TypeScript/build and native menu review. Commit only this task's
changes alongside other active work.

## Progress

- [x] Inspect current licensing and official license sources.
- [x] Implement and validate the GitHub menu and exact external URL policy.
- [x] Apply AGPLv3 text, manifest identifiers, READMEs and contribution terms.
- [x] Verify license consistency and complete the scoped license commit.

## Evidence

- https://opensource.org/license/agpl-3.0
- https://polyformproject.org/licenses/shield/1.0.0
- https://polyformproject.org/licenses/noncommercial/1.0.0
- Exact external URL policy unit test and account-menu smoke pass.
- TypeScript and Web/desktop builds pass; native App restarted with GitHub row.


License text is the canonical SPDX `AGPL-3.0-only.txt` text from
https://github.com/spdx/license-list-data/blob/main/text/AGPL-3.0-only.txt.
All six first-party manifests and both READMEs use the same identifier. Existing
third-party notices remain untouched. No runtime dependencies changed.
