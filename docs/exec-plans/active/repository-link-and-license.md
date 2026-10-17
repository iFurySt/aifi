# Repository Link and License Choice

## Goal

Add a compact account-menu GitHub link and resolve the requested commercial-use
boundary before changing the repository license.

## Scope and decisions

- Open the fixed repository externally; do not broaden the research allowlist.
- AGPLv3 allows commercial activity. Personal-only/noncommercial restrictions are
  a different license model and are not OSI open source.
- User permits free forks/modifications/sharing between individuals. Final choice
  between that restriction and AGPLv3 is pending clarification.
- Historical MIT grants and third-party license notices must remain valid.

## Verification

Exact external destination policy tests, account menu smoke with intercepted
external opens, TypeScript/build and native menu review. Commit only this task's
changes alongside other active work.

## Progress

- [x] Inspect ownership/history, current MIT terms and official license sources.
- [x] Implement the GitHub menu row and narrow external URL exception.
- [x] Validate the repository-link UI, URL policy and native menu.
- [ ] Apply a license only after the user selects the commercial/fork boundary.

## Current recommendation

The user permits free forks/sharing and prioritizes adoption while discouraging
commercial clones. AGPLv3 is recommended for the adoption/community priority;
it remains compatible with commercial forks that comply with its obligations.
Shield directly restricts competing products, including free ones, but introduces
source-available/noncompete restrictions. No LICENSE or public licensing claims
have changed. Historical MIT and third-party grants remain relevant.

## Evidence

- https://opensource.org/license/agpl-3.0
- https://polyformproject.org/licenses/shield/1.0.0
- https://polyformproject.org/licenses/noncommercial/1.0.0
- Exact external URL policy unit test and account-menu smoke pass.
- TypeScript and Web/desktop builds pass; native App restarted with GitHub row.

