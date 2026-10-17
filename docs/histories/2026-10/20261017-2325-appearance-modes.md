## 2026-10-17 23:25 | Task: Visual appearance modes

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Remove General and keep only Visual style / Mode in Appearance, using compact
> visual choices from the supplied settings reference.

### Changes Overview

- Remove General navigation/content; default and legacy General links resolve
  to Appearance. Existing source/sync/key controls remain in dedicated categories.
- Replace the color-theme dropdown with System/Light/Dark miniature preview radios,
  neutral selected outlines, shared hover tint and keyboard navigation.
- Persist system preference separately from the resolved OS palette; follow OS
  changes and make toolbar toggles select an explicit opposite mode.
- Appearance no longer polls the data service or displays redundant service status.

### Design Intent

Use recognizable previews and compact controls. Existing light/dark preferences
stay valid; no extra themes, fonts, accent settings or explanatory copy are added.

### Validation

Scoped TypeScript, eight core tests and navigation/selection smoke pass, including
system palette changes, reload persistence, keyboard selection and 390px bounds.
Working-tree checks and production builds passed before unrelated in-progress
Funds edits introduced unused imports; those edits are excluded. Native App light
and dark review completed; updated Appearance remains open in light mode.

### Files Modified

- `packages/core/src/workspace.ts`, `data-service.ts` and related tests
- `packages/ui/src/components/AppearanceMode.tsx`, its CSS and `SettingsSidebar.tsx`
- `packages/ui/src/use-resolved-theme.ts`, `App.tsx`, context, Shell and Settings
- Navigation/selection smoke fixtures and scripts
- `DESIGN.md`, `docs/FRONTEND.md` and the completed execution plan
