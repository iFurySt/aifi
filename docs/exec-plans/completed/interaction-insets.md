# Interaction inset audit

Completed 2026-10-19.

## Goal
Ensure hover/focus backgrounds leave space around content throughout the app,
including the reported Peers rows, without moving established content alignment.

## Scope and decisions
- Audit actual interactive row/control styles across all implemented pages and
  shared menus, selectors, search, account and toolbar surfaces.
- Use shared inline-inset tokens. Rows with flush document-aligned content may
  expand into existing gutters, retaining heading/icon/value alignment.
- Preserve centered icon targets, chart shapes and underline-only prose links;
  distinguish these from missing padding on text rows. Keep padding in the base
  state so hover and keyboard focus never move content.
- Shared checkout contains other ongoing work; isolate owned CSS/docs hunks and
  verify an independent snapshot before committing.

## Validation
- Add a renderer audit using real styles and offline repositories, inspect
  background-bearing hover/focus targets on each main route/six stock tabs and
  settings categories, and exercise actual peer hover, keyboard focus, menus and
  selectors in light/dark and narrow widths.
- Verify Peers content remains aligned with the section heading and its expanded
  hover stays inside the column; assert stable geometry across interaction states.
- TypeScript, production build, relevant existing selector/account/layout gates,
  and native App refresh/review. Record history and archive this plan.

## Outcome
- Corrected zero-inline-padding Peers rows, search-footer shortcuts and Watchlist
  company hover/focus targets. Expanded Peers/table targets into existing gutters
  so their content alignment stays stable, and added Peers keyboard feedback.
- Centralized regular/compact row insets across shared Select/dropdown/search,
  settings categories and stock rows; improved the collection heading's inset.
- Added the CSSOM/geometry audit to `pnpm smoke:insets` and desktop smoke. Checked
  22 fixture route/menu states in the current workspace and 20 in the independent
  staged snapshot (Arena/Usage work belongs to concurrent changes).
- Independent snapshot passed TypeScript, production web build, new inset gate
  and existing all-tab responsive stock gate. Current-workspace Select/account
  gates passed. Reviewed actual hover screenshots at wide light and narrow dark
  widths; 1440/1000/650/390px peer geometry/focus checks all passed.
- Rebuilt the current renderer and refreshed the actual App, retaining its route.
