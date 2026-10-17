# Stocks responsive layout

Status: completed, 2026-10-17.

## Goal

Make the Stocks workspace readable in narrow desktop/Web windows without losing
company sections, chart state, stock-list position or local-read continuity.

## Scope And Decisions

- At viewport widths below 1280px, Stocks uses the existing sidebar drawer;
  wider views retain the user's sidebar-collapse preference. Other pages retain
  their 900px drawer threshold. Toolbar and Command/Control+B reopen the list.
- Wide detail uses three columns; medium detail groups quote/chart, metrics and
  company sections; narrow detail puts quote/chart first and retains every panel.
- Compact header, scrolling tabs, metrics, summaries, controls and internal table
  overflow use available document width, including when sidebar is toggled.
- Reuse one chart/section tree; CSS reflow must not remount it or collect data.
- Financial data/statement feature work in another task is outside this scope.

## Reference

Inspected Rallies AAPL through Chrome Default/OBU at 1440, 1100, 900, 760 and 390px.
It changes from three columns to a stacked view near tablet widths. AIFi also has
an inner stock list, so it should hide that list earlier and give the chart
priority rather than stack long company/earnings content before it.

## Validation

- Check every stock tab at large, medium, narrow and mobile widths, including
  long company names, watch control, full tab access and table overflow.
- Resize back/forth; preserve chart range, mode, selected stock and sidebar scroll.
- Check auto-collapse, drawer selection/Escape, Command+B and wide preference.
- Run TypeScript, unit tests, desktop/interaction and targeted layout checks;
  review real Chrome and native App. Preserve unrelated uncommitted work.

## Progress

- [x] Compare reference and identify hidden sections/late sidebar breakpoint.
- [x] Implement layout and drawer adaptation.
- [x] Verify, document, commit and push; restart App.

Validation completed: TypeScript/unit/build gates, current and isolated staged-source
responsive checks, navigation/account/desktop/continuity smokes, Chrome all-tab
review and native App restart. No dataset/provider/credential changes in this slice.
