# Frontend Guide

The local workspace uses React, TypeScript, Tailwind CSS, and Vite. Electron
loads the same renderer; there is no second desktop UI or cloud backend.

## Local Commands

Use Node 24+, Go 1.26.1+ and pnpm 10.13.1:

~~~sh
pnpm install
pnpm dev
pnpm dev:desktop
pnpm check
pnpm test
pnpm build
pnpm preview
pnpm desktop
pnpm smoke:desktop
pnpm format
make ci
~~~

Web development binds to 127.0.0.1:5173. Run web development or desktop
development, not both on that port. Desktop development starts and owns Vite.
pnpm desktop loads the production renderer after pnpm build. The first desktop
launch downloads Electron if needed, as described in the
[official installation guide](https://www.electronjs.org/docs/latest/tutorial/installation).
No environment variables are required. App launch builds/starts the Go service;
AIFI_DATA_DIR optionally chooses its local SQLite/vault directory. The desktop launcher sets AIFI_DEV_URL
internally to the one allowed development origin; production leaves it unset.

## Boundaries

- apps/web: HTML/bootstrap and Vite configuration.
- apps/desktop: sandboxed Electron main/preload, app-owned Go lifecycle and allowlisted data IPC.
- packages/ui: shared components, page layouts, and design tokens.
- packages/core: platform-independent domain contracts and demo data rules.
- packages/platform: browser/local storage and desktop capability adaptation.
- apps/cli: Go/Cobra directory collector, scheduler, SQLite and private stdio RPC.
- packages/host: Node-only child/vault/loopback adapter, never imported by UI.
  The platform adapter exposes typed settings/status operations to the renderer.

Root DESIGN.md defines the visual system. Use Radix for dialog/menu accessibility
and Lucide for icons. Avoid a large visual component library and duplicate page
trees. Fonts and icons are local; no remote font or telemetry service is required.

## Verification

make ci runs repository gates, TypeScript, fifteen domain/storage/route/host tests,
Go vet/race checks, and renderer/desktop/Go builds. Use the local app for desktop and mobile visual
checks. Validate the actual Electron renderer, not only the browser build,
before claiming desktop support.

Work in an isolated checkout for UI verification. Screenshots and smoke output
belong in the ignored .artifacts directory unless curated into documentation.

## Local Demo Behavior

Agents can be created, filtered, paused/resumed, deleted, and given an explicit
preview. Research conversations contain deterministic illustrative responses.
Watchlists support adding/removing symbols; unknown symbols have no invented
quote. Portfolio numbers and charts are fixed examples. Library cards preview
existing repository skills without executing them. Settings uses categories and grouped rows for appearance, sources, scheduling
and storage, with real local settings and encrypted credential configuration. A single Demo toolbar entry explains the sample-mode limits on
demand. Page copy uses short functional labels; provider roadmaps and repository
paths remain in developer documentation, following DESIGN.md.

State is validated against schema v1 and saved under aifi.workspace.v1 in local
storage. Invalid saved data opens a temporary demo without overwriting the raw
value; reset is the explicit recovery action. Storage failures show a persistent
notice. Browser and Electron data are independent, with no synchronization.

## Desktop Smoke And Review Checklist

After pnpm build, pnpm smoke:desktop launches the actual Electron app with a
throwaway profile, checks the bundled renderer and metadata bridge, confirms
renderer Node access is absent, navigates to Watchlist, saves a theme locally,
and returns to Stocks. It checks all six stock tabs and a dataset placeholder.
It also checks the framed desktop toolbar, sidebar collapse, back/forward
bounds, and forward-history invalidation after a new route. It exits with a
nonzero status on failure or timeout. Evidence is written to
.artifacts/electron-smoke.json and aifi-electron.png. The smoke profile is
removed on normal exit; no personal workspace is used.

Review the local app in Chrome at desktop and mobile widths: create an agent,
pause/resume it, create a preview, filter/delete it, add/remove a ticker,
submit/reopen research, filter the library, use search and Escape, switch themes,
reload for persistence, and reset data. Corrupt state should retain its stored
value until reset. Financial tables should scroll internally on narrow screens.

The initial validation used Chrome Default through OBU at 1440×1100 and 390×844,
including all six mobile pages, production CSP, and dialog focus restoration.
The actual desktop smoke ran on macOS. Native Windows/Linux launch checks,
installer packaging, signing, and updates remain follow-ups.

## Shared Window And Document Shell

The outer neutral frame owns an 80px tool rail. A single rounded inset panel
holds the 248px sidebar and document. Only main content scrolls; the frame,
toolbar, and sidebar stay in place. Collapsing the sidebar expands the document.
At tablet widths navigation becomes a drawer; mobile hides the rail and keeps an
8px inset.

Electron renders a 48px draggable outer toolbar. macOS uses real native traffic
lights at x=14/y=17, with reserved space before back/forward and sidebar controls.
Controls, menus, and dialogs are no-drag. App back/forward is bounded to the
current route session, including same-hash traversal; a new route truncates the
forward branch. Window controls use route history; data IPC is an allowlisted separate capability.

Web relies on browser window controls and places a 52px page toolbar inside the
workspace panel. Both hosts share the rail, sidebar, pages, theme, and shell CSS.
The refinement was checked against the user-provided Codex/ChatGPT screenshots,
using OBU in Chrome Default for Web and the real macOS Electron window for native
controls. Native close/minimize/full-screen controls remain owned by the OS.

The outer rail contains application navigation; the inner sidebar selects stocks,
or settings categories while Settings is open. Chat history remains selectable inside Chat and searchable from the
toolbar. The outer-rail avatar opens the shared Radix workspace menu for
Settings and theme switching. Below 600px the rail is hidden and the same menu
appears in the page toolbar. Check keyboard selection, Escape/focus return,
outside dismissal, popup viewport bounds, and settings access with the sidebar
collapsed as well as on mobile.

Keyboard focus across the renderer and stock prototype uses neutral backgrounds,
text/underlines, and form borders instead of outlines. The shared CSS suppresses
browser focus outlines; no blue focus token/ring remains. Tab navigation and
Escape focus return stay enabled. Do not blur controls or intercept Tab to hide
focus styling.

## Stock Workspace

The shared renderer starts at Stocks. Routes such as
`#/stocks/AAPL?tab=financials` preserve ticker/tab across reload and native
history. Chart, Financials, Funds, Politicians, Insiders, and Analyst all have
their own content structure. Unsupported datasets have relevant empty
tables/metrics. Filings lives inside Financials. Unknown tickers have no
invented quotes.

The sidebar includes sample symbols, saved watchlist symbols, and the selected
stock. Its search filters that list; company search can open a ticker directly.
Watchlist company links open Stocks, while Ask actions open Chat. The schema v1
workspace and saved conversations are unchanged.

The [stock page specification](design-docs/stock-research-page.md) describes
this UI. The [legacy prototype entry](prototypes/stock-research/preview.html)
opens the shared app, avoiding a second UI tree. Settings/status transport and directory collection are implemented. Stock data
reads and remaining provider collection stay staged in the [data plan](exec-plans/active/us-stock-data-foundation.md).
## Data Settings And Runtime

General, Appearance, Data sources, Sync, Storage use the supplied screenshot's
category sidebar, centered title, bordered groups and short rows. Desktop/mobile
share the same page; the drawer exposes settings categories on narrow screens.
Settings has no Demo badge because its service controls are real.

Both local app hosts start a Go child. Fresh directories skip startup download;
default sync interval is 24 hours, editable 1–720 hours. Enable/automation/interval
changes persist and affect the worker. Manual sync, counts, outcomes, cache size,
and source credential presence are real; market/SEC adapters say Not syncing.

Credentials are submitted transiently to the host, cleared after save/close, and
never placed in browser workspace storage or returned as saved values. The Web
bridge uses same-origin authenticated requests; Electron uses private IPC. The
service ends with the host; no independent OS daemon is installed.

Native smoke now checks service startup, saved interval, credential ciphertext
redaction, settings UI and child cleanup using an isolated offline profile.
See [service design](design-docs/app-data-service.md) for exact boundaries.
