# Shared selection controls

## Goal and scope

Replace native value selectors with one compact, theme-aware component across
Usage, Settings, Chat, Agents, Financials and stock collections. Optional search
filters choices without changing selection. Action/source menus retain their
existing behavior. No data or authorization contract changes.

## Approach and risks

Use Radix Popover for portal positioning, collision handling and dismissal; a
shared listbox owns keyboard navigation, selection, disabled choices and optional
search. Preserve existing callbacks, async disabled states and stock headings.
Bound popup width/height to the viewport and keep focus restoration usable inside
dialogs. Work alongside unrelated in-progress changes without committing them.

## Validation

TypeScript, component interaction checks in isolated Electron, affected page
smokes, build and visual checks in Web/Electron, including narrow/dark layouts.

## Progress

- [x] Inventory native selectors and identify existing selection/action menus.
- [x] Implement shared component and migrate callers.
- [x] Verify keyboard/search/dismissal/positioning and page behavior.
- [x] Document, commit and show updated app.

## Results

Shared component and independent consumer migrations landed in two scoped commits.
All current native selectors were replaced; action/citation menus retain semantics.
Usage and reasoning-effort consumers are integrated in their ongoing working-tree
feature changes. Isolated staged-source TypeScript/frozen-lockfile/Select/Financials
checks and full working-tree builds/tests/page smokes pass. Native Usage period
changes and Chrome rendering were verified without auth/provider mutations.
