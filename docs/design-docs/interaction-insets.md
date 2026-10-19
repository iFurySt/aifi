# Interaction insets

Background-bearing hover, focus and selected surfaces need space around their
contents in the normal state. Do not add padding only on hover: it moves text
and changes the target. Use the existing neutral `--interaction-hover` fill.

## Shared geometry

`styles.css` owns `--interaction-inset` (10px) and
`--interaction-inset-compact` (8px). Shared dropdown/Select options, search
results and settings links use the regular inset; compact toolbar controls and
stock-list rows use the compact inset. Existing larger card/form padding stays
appropriate to its layout. Source chips and small chart/icon controls retain
their existing proportionate sizing.

Content aligned with a document heading may use a negative inline margin equal
to its padding. Peers expands the list into the column's existing gutter, with
10px inside every row and 2px between rows. Avatars and values keep their former
alignment; the highlight does not extend outside the column. Watchlist company
links use the same approach inside padded table cells. Keyboard focus shares
the hover fill. Search-footer shortcuts also need padding and rounded bounds.

Centered fixed-size icon targets can provide breathing room through their box
dimensions. Underline/color-only links and SVG chart marks do not need a row
background or an arbitrary text-row inset.

## Verification

`pnpm smoke:insets` runs an isolated Electron renderer with synthetic local
repositories. It discovers background-bearing hover/focus rules through the
actual CSSOM and audits matching targets across implemented main pages, six stock
tabs, settings categories, account/search menus and shared Select options.
Zero-padding controls must still have visible content inset through centered
geometry; paths/chart marks are excluded. The gate also checks Peers content
alignment, column bounds, stable keyboard-focus geometry and actual CSS hover
at 1440/1000/650/390px in light/dark modes. Screenshots and the detailed report
stay in ignored `.artifacts/interaction-insets/`.

The desktop smoke command includes this gate. Run it when changing interactive
row/control geometry; keep account, Select and responsive stock gates for their
specialized behavior. The offline audit covers available fixture states; inspect
new data-dependent controls in their meaningful populated state as well.
