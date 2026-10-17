# Stock tabs narrow layout

## Goal and scope
Align the six stock research tabs with the observed Rallies narrow reading order. Keep one component tree and existing local data, chart state and stock-list state.

## Observations and decisions
- At 390/613/760 CSS pixels Rallies Chart reads quote, About, Analyst, Earnings, metrics/Peers, price chart and Digest.
- Funds reads overview/ring then Data; Politicians reads leaders/timeline then Data; Insiders reads timeline then Activity; Analyst reads consensus then updates.
- Rallies Financials remained blank during this inspection. Preserve AIFi financial chart/controls/table order and validate containment rather than claim an exact comparison.
- Preserve wide three-column Chart. Narrow screens must not pull the price chart above company context. Dense tables scroll inside their panels.

## Risks
Shared dirty checkout: stage only task-owned changes. Do not alter providers, collectors, authentication or persisted data.

## Work
- [x] Inspect live reference and existing six tab layouts.
- [x] Adjust narrow order and compact controls/visuals.
- [x] Verify populated and empty tabs across desktop/narrow widths, selection, scroll and chart state.
- [x] Update design contract/history and refresh the desktop renderer.

## Validation
TypeScript, responsive Electron geometry/screenshot checks, existing Financials/Funds/activity checks, production renderer build and desktop visual review. Validate staged source independently of unrelated work.

## Results
TypeScript, responsive fixture (1440/1279/1100/900/760/600/390px), Financials,
Funds and activity interaction checks passed. All six populated/empty tabs were
reviewed via Electron screenshots. A production renderer build and real desktop
reload confirmed quote/About/Analyst order at a 760px native window. No collection
or authentication changes were made.

A clean snapshot containing only this task's staged changes also passed
TypeScript and the full six-tab responsive gate.
