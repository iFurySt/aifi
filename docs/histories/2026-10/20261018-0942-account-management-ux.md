## 2026-10-18 09:42 | Task: Simplify ChatGPT account management

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Rework the sign-in and account-management journey, make the account-menu identity
> the anonymous login entry, allow settings to switch/sign out accounts, and remove
> model selection and redundant UI from account settings.

### Changes Overview

- Anonymous identity is one Sign in with ChatGPT action; connected identity opens
  account settings. Usage and GitHub remain separate menu actions.
- Settings lists saved profiles with name/email, Active, Use account, explicit
  reconnect/sign-in and per-profile Sign out in the more menu. Add account is in
  the section heading; official ChatGPT usage is a secondary external link.
- Removed model/refresh and duplicated connection/status controls from settings.
  Existing account-specific model discovery and selection remain in Chat.
- Preserved first-use plan notice, login cancellation, authorization errors,
  disconnected registered profiles and desktop-only fallback. No auth transport,
  credential or real-account mutations were made by this task.

### Design Intent

Keep login, everyday Chat and account management distinct. Show actual identities
and current account state without repeating explanatory rows. Use existing host
operations and require an explicit profile ID when changing a saved account.

### Validation

TypeScript, synthetic account gate (anonymous, multiple accounts, exact-profile
switch/sign-out, reconnect, pending cancellation, errors, shortcuts and narrow
layout), existing Chat gate and production renderer build. Light/dark/narrow
screenshots reviewed. Task-scoped snapshot and native read-only review recorded
in the completed execution plan.

### Files Modified

- `packages/ui/src/components/ProfileMenu.tsx`
- `packages/ui/src/pages/ChatGPTSettings.tsx`
- `packages/ui/src/pages/chatgpt-settings.css`
- `scripts/check-account-ui.mjs`
- `scripts/fixtures/account-ui.tsx`
- Account flow design, frontend guidance and execution plan.
