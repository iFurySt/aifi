# Appearance Modes

## Goal

Remove General and make Appearance the default settings page. Keep only Visual
style / Mode with System, Light and Dark visual choices.

## Scope and risks

Preserve existing light/dark preferences and data-source controls. Add system mode
without changing stored schema version or existing preferences. Resolve OS palette
separately from persisted preference so toolbar toggling remains correct. Keep
unrelated in-progress work out of the commit.

## Verification

Core preference/deep-link tests, isolated settings mode/OS-change/persistence
checks, existing navigation/selection checks and native narrow/light/dark review.

## Progress

- [x] Inspect settings and theme state boundaries.
- [x] Implement compact mode controls and system palette following.
- [x] Validate, document and display updated App.

## Results

- Scoped staged-source TypeScript and eight core tests pass; navigation smoke
  covers OS palette changes, fixed modes, persistence, keyboard radio navigation
  and 390px bounds. Text-selection smoke passes across implemented pages.
- Full working-tree TypeScript, nine focused tests, production Web/desktop builds
  and interaction checks passed before later unrelated Funds edits introduced
  unused imports; those edits remain outside this task.
- Native App review confirms General removal, Appearance as the default settings
  page, compact light/dark previews and selected outlines. Leave the updated
  Appearance page open with the original light preference.
