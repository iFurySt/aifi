# Shared selection controls

Use `packages/ui/src/components/Select.tsx` for controlled, single-value choices.
Keep action menus and source-detail menus on their existing Radix menu primitives.

`Select` takes a label, string value, options (`value`, `label`, optional `disabled`
and search `keywords`) and `onValueChange`. Numeric callers convert at the boundary.
`searchable` is optional; use it for accounts/models or longer lists. Filtering
stays inside the picker and never changes selection or fetches provider data.
Keep the existing controlled state and async disabled guards in the caller.

Default triggers fit their content with an 8px chevron gap and 34px minimum
height. `subtle` fits composers; `heading` preserves collection-heading typography.
`triggerLabel` may shorten a collection name without changing its option label.
Menus align to the trigger, flip within viewport collisions, cap height at 360px,
and scroll internally. Long option labels wrap; trigger labels truncate.
Neutral selected/active rows and a check replace native system-blue selection.
Theme tokens cover both light and dark; narrow touch targets are at least 38px.

Radix Popover owns portal positioning and dismissal. Keep its focus-scope and
dismissable-layer versions aligned with Dialog/DropdownMenu: duplicate versions
can let Escape close both the picker and its enclosing dialog. The listbox owns
arrows, Home/End, typeahead, Enter/Space and disabled choices; searchable pickers
focus a combobox input. Escape cancels and returns focus. Tab/Shift+Tab dismiss
and continue to adjacent controls. Buttons do not submit enclosing forms.

Run `pnpm smoke:selects` for actual React/CSS interactions in disposable Electron:
selection, search/keywords/no results, disabled states, keyboard/typeahead, native
Tab traversal, outside dismissal, nested-dialog Escape/focus, bounded scrolling
and 390px light/dark layouts. Reports/screenshots live under `.artifacts/selects`.
Use page-specific ChatGPT/Financials/native smokes after migrating callers. These
fixtures never authorize a real account, make inference calls or collect data.
