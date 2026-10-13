# Stock Workspace UI Alignment

Created and completed 2026-10-13.

## Goal

Move application navigation into the outer single rail and use the inner sidebar
for stock selection. Bring the Rallies-style six-tab stock page into the shared
React renderer, with useful empty structures for datasets not connected yet.

## Scope

- Stocks route, directory sidebar, outer menu, mobile navigation, and preserved
  access to existing chat history/pages.
- Chart, Financials, Funds, Politicians, Insiders, Analyst; no fake data for the
  new datasets. Keep sample quote/chart/statement labels.
- Replace the standalone active prototype with an entry to the shared app.
- Preserve local workspace schema/content, native history, themes, and neutral
  focus styles. No provider API calls or collection service in this task.

## Milestones

Route/domain milestone and shared UI integration are complete.

- [x] Shared stock route/context and one-column application navigation.
- [x] Stock page with six populated/empty layouts, fixtures, and local controls.
- [x] Browser/mobile/native verification and documentation refresh.

## Validation

make ci, meaningful route/domain checks, actual Electron smoke, and Chrome
Default through OBU. Review all six tabs, stock selection/search, watchlist,
missing symbol/unsupported data, chart controls, financial period, chat history,
mobile drawers, native route history, and neutral keyboard focus.

## Decisions

- The user explicitly requested visible placeholder tabs; this supersedes the
  earlier four-tab scope. Collection coverage remains separate from UI presence.
- Global page navigation belongs only in the outer rail/mobile app drawer.
  The document sidebar contains stocks. Existing conversations remain selectable
  inside Chat and via search, rather than being erased with the old sidebar.
- Reuse one shared React stock page for Web/Electron and the prototype entry.

## Outcome

Shared Web/Electron implementation replaced the separate prototype. make ci
passed with eleven tests and both production builds. OBU reviewed desktop/mobile
tabs, data absence, stock/watchlist controls, Chat history, theme, route reload,
neutral focus/menu dismissal, and navigation. Actual macOS Electron smoke passed.
The live data foundation remains an active independent plan; no credentials or
collection runtime were added.
