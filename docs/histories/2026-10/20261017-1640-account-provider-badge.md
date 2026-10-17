## 2026-10-17 16:40 | Task: Compact account identity and provider badge

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Show the account name with a ChatGPT icon badge, followed by email on the
> second line. Remove the extra ChatGPT text row and leave room for future sources.

### Changes Overview

- Replaced the provider text row with a transparent 12px mark in a 14px slot beside the name; email occupies
  the second line and truncates within the compact menu.
- Added AccountProviderBadge with a presentation-only provider registry. Only the
  existing connected ChatGPT source is shown; anonymous accounts have no badge.
- Follow-up: removed the badge tile/background and reduced its visual weight.
- Bundled the monochrome mark and its source/license locally. Kept existing
  account actions, authentication and subscription state unchanged.
- Extended the existing account smoke to check two-line identity, badge placement
  and the SVG mask. Updated frontend guidance.

### Design Intent

Use a small source marker without another line of identity text. Keep provider
presentation separate from account/credential contracts until more connections exist.

### Validation

- TypeScript, account UI regression and renderer/desktop builds pass.
- Actual macOS App review checks the name/email layout and recognizable provider icon.

### Files Modified

- `packages/ui/src/components/ProfileMenu.tsx`
- `packages/ui/src/components/AccountProviderBadge.tsx` and companion CSS
- `packages/ui/src/assets/providers/`
- `scripts/check-account-ui.mjs`, `docs/FRONTEND.md`
