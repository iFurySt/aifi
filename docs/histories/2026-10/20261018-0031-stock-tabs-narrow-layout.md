# Align narrow stock research reading order

## Request
Compare Chart, Financials, Funds, Politicians, Insiders and Analyst with Rallies
and correct narrow-window reading order and layout.

## Changes and intent
- Chart now reads quote, About, Analyst, Earnings, metrics/Peers, price chart,
  Digest and filings below a 701px document. Preserve the wide three-column tree,
  chart range/mode, list position and drawer behavior.
- Compact fund identity/ring, holder search, activity filters and financial pinned
  labels using container widths. Keep dense data in internally scrolling tables.
- Preserve overview/visualization before Data/Activity/Ratings. The live reference
  Financials was blank; its exact narrow layout was not available to replicate.
- Extend responsive fixtures with populated financial, fund, political, insider
  and analyst data, plus empty coverage, section geometry and control bounds.
- Update DESIGN.md, frontend guidance and the stock research contract.

## Validation
- TypeScript and production renderer build passed.
- Responsive Electron checks passed at 1440/1279/1100/900/760px and web layouts
  at 600/390px, including all six populated/empty tabs and state retention.
- Existing Financials, Funds and stock activity interaction gates passed.
- Reviewed all six narrow screenshots and reloaded the real desktop app; confirmed
  the company-first order in a 760px native window.

## Main files
packages/ui/src/styles.css; pages/funds.css; pages/stock-activity.css;
scripts/check-stocks-responsive.mjs; scripts/fixtures/stocks-responsive.tsx.

A clean snapshot containing only this task's staged changes also passed
TypeScript and the full six-tab responsive gate.
