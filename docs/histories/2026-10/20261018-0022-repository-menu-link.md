## 2026-10-18 00:22 | Task: Repository menu link and license review

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Add a repository link to the account menu and assess licensing choices that
> balance personal use, free sharing, adoption and commercial competition.

### Changes Overview

- Add a compact GitHub row in both anonymous and connected account menus.
- Share the fixed repository URL and permit that exact destination in the desktop
  external-window policy. Keep research-provider rules separate and deny new
  in-app windows; Web uses noopener/noreferrer.
- Extend existing account smoke for the external link and current Appearance row.
- Explain AGPLv3 commercial-use obligations and source-available alternatives.
  Adoption is still a user decision; LICENSE remains MIT.

### Validation

Working-tree TypeScript, URL policy test, intercepted account-menu external-open
smoke and Web/desktop builds pass. Scoped source validation also passes.
Native App restarted; the compact GitHub menu row is visible.

### Files Modified

- `packages/core/src/app-links.ts`, its tests and core exports
- `packages/ui/src/components/ProfileMenu.tsx`
- `apps/desktop/src/main.ts`
- `scripts/check-account-ui.mjs`
- Frontend/security docs and the active license-decision plan
