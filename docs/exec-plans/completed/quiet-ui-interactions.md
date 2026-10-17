# Quiet UI Interactions

## Goal

Remove redundant stock/search chrome, restore full-frame square logos and share
one neutral hover color across controls in both themes.

## Scope and risks

UI only; preserve local logo caches, search/keyboard behavior and semantic CTA
colors. Keep unrelated in-progress changes outside this commit. Source artwork
may contain its own whitespace; curate assets separately rather than crop them.

## Validation

TypeScript, focused logo tests, navigation/select smoke and actual desktop review.
Check light/dark interaction colors, full logo bounds and compact Chat toolbar icon.

## Progress

- [x] Inspect source and screenshot requirements.
- [x] Implement shared hover token, compact chrome and full-frame source logos.
- [x] Validate and record final evidence.

## Results

- TypeScript and six focused logo/page-preparation tests pass.
- Navigation smoke checks short search chrome, hidden count, untruncated collection
  labels, optical Chat icon sizing, and actual forced CSS hover colors in both themes.
- Select smoke checks shared open/highlight colors, keyboard/search behavior,
  dialog focus and narrow light/dark layouts. Responsive Stocks checks pass.
- The scoped staged source also passes TypeScript, logo tests and both smoke gates.
- Production renderer/desktop builds pass. Native App review confirms full-frame
  white-backed logos in dark mode, complete S&P 500 heading, short search dialog
  and balanced Chat toolbar icon. App left on Stocks with its original light theme.
- Original artwork can still contain whitespace; catalog asset curation owns that.
