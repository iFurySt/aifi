## 2026-10-17 22:32 | Task: Limit text selection to reading content

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Allow text selection in the document body, prevent selecting navigation and
> other UI text, and check every page.

### Changes Overview

- Added one shared CSS policy: chrome defaults to nonselectable; main reading
  content and readable detail panels opt in. Controls inside documents remain
  nonselectable, including tabs, source chips and internal navigation links.
- Preserved focused input/textarea/editable selection and table/chat/body copy.
  Unfocused placeholders no longer join document-wide Select All. Images and
  chart graphics do not drag/select as text.
- Added an offline Electron regression covering all implemented pages, six Stocks
  tabs, seven Settings sections, detail dialogs and selection popups. The current
  workspace validates 19 page states. Updated frontend guidance and smoke command.

### Design Intent

Use explicit document/control boundaries instead of intercepting keyboard, copy
or pointer events. New routes inherit the policy; reading portals have an opt-in.

### Validation

- Selection regression passes across all current page states, editable ranges,
  reading dialogs and listbox controls.
- The regression respects inactive-window focus state rather than assuming every
  active DOM field has foreground CSS focus.
- Renderer build passes. Actual macOS App Command+A review retains readable body
  highlights and excludes window chrome, navigation, tabs and buttons.

### Files Modified

- `packages/ui/src/selection.css`, `packages/ui/src/styles.css`
- `scripts/check-text-selection.mjs`, `scripts/fixtures/text-selection.tsx`
- `package.json`, `docs/FRONTEND.md`
