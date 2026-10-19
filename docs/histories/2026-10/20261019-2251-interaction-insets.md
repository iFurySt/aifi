## [2026-10-19 22:51] | Task: Audit hover content insets throughout the UI

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> Peers hover has no left/right padding. This has recurred; check all surfaces.

### Changes Overview

- Added shared regular/compact inline-inset tokens and adopted them in Select
  triggers/options, dropdown options, search/results/footer, settings navigation,
  stock list/collection controls and stock comparison rows.
- Peers now has 10px inside both edges, a 2px row gap and matching keyboard-focus
  feedback. Its background extends into existing column gutters while avatars,
  names and values retain their alignment. Watchlist company targets preserve
  table alignment with padded hover/focus bounds. Search-footer shortcut controls
  gained inset padding and rounded bounds.
- Audited background-bearing hover/focus rules and preserved the existing valid
  spacing on cards, account controls, chat source/activity rows and chart controls.
  Centered icon targets, SVG chart marks and color/underline-only links keep
  their appropriate geometry.
- Added `pnpm smoke:insets` to the desktop smoke chain and documented the shared
  interaction contract so this class of regression is mechanically detectable.

### Design Intent

Padding belongs to the target's normal state, with backgrounds applied to the
same bounds on hover and focus. Extending into existing gutters preserves the
document's reading alignment while keeping content clear of highlight edges.

### Verification

- New CSSOM audit checks 22 available current-workspace route/menu states and
  20 states in an independent staged snapshot. It discovers applicable
  background-bearing interaction rules and measures computed insets/content
  bounds rather than maintaining a Peers-only selector list.
- Real isolated Electron CSS hover, keyboard focus, heading alignment, column
  containment and stable geometry passed at 1440/1000/650/390px in light/dark.
  Reviewed wide-light and narrow-dark screenshots.
- Independent TypeScript, production web build, inset gate and existing all-tab
  responsive stock gate passed. Current-workspace Select and account gates passed.
- Rebuilt and refreshed the actual App while preserving its current route.

### Files Modified

- `packages/ui/src/styles.css`
- `packages/ui/src/components/select.css`
- `packages/ui/src/components/stock-chart-tools.css`
- `scripts/check-interaction-insets.mjs`
- `scripts/fixtures/stocks-responsive.tsx`
- `package.json`, design/frontend guidance, interaction contract and execution plan
