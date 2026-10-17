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
On macOS, the launcher copies the pinned runtime into the ignored
`apps/desktop/dist/AIFi.app`, gives it the AIFi name/icon, and applies a local
ad-hoc signature while preserving runtime flags/entitlements. Its local entry loads the
checkout's desktop code; this is a development app, not a portable
installer. Package-manager Electron files remain unchanged. Other hosts launch
the pinned runtime directly and receive the shared window icon/name.
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

make ci runs repository gates, TypeScript, domain/storage/route/host/UI tests,
Go vet/race checks, and renderer/desktop/Go builds. Use the local app for desktop and mobile visual
checks. Validate the actual Electron renderer, not only the browser build,
before claiming desktop support.

Work in an isolated checkout for UI verification. Screenshots and smoke output
belong in the ignored .artifacts directory unless curated into documentation.

## Local Demo Behavior

Agents can be created, filtered, paused/resumed, deleted, and given an explicit
preview. Desktop Chat uses a connected ChatGPT plan for real streamed text replies;
existing illustrative replies retain sample labels. Model tools and source-backed
research execution are not attached yet. Settings → ChatGPT starts official browser
authorization without an API key or OpenAI console app. Web directs users to desktop.
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
It also decodes the local brand mask and checks the AIFi document title.
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

The sidebar heading opens All US listings, S&P 500, Nasdaq-100 and My watchlist.
Selected labels/counts reflect the active collection; index dates and incomplete
local coverage stay visible. Built-ins have no rename/delete/membership edits.
The last selection is saved under `aifi.stock-collection.v1`; the existing workspace
schema and personal watchlist storage stay unchanged. Index snapshots are reviewed
bundled data, not an automatic live index subscription. Provider names stay in
Settings. The sidebar reads its selected cached directory in batches of 50,
loading more on scroll near the bottom. Ticker
and security-name search runs against SQLite, not a fixed fixture list. The
company header and workspace search share these source-backed reads. Raw exchange
codes receive display labels without inventing exchange MIC or company identity.
Search is debounced, superseded responses are ignored, and visible readers refresh
every minute/on window focus to discover background imports. Empty/error states
never fall back to fixture companies. App accepts an injected directory repository.

Watchlist company links open Stocks, while Ask actions open Chat. The schema v1
workspace and saved conversations are unchanged.

The [stock page specification](design-docs/stock-research-page.md) describes
this UI. The [legacy prototype entry](prototypes/stock-research/preview.html)
opens the shared app, avoiding a second UI tree. Settings/status transport and directory collection are implemented. Market-data reads and research collection now use SQLite; live setup gates remain in the [data plan](exec-plans/active/us-stock-data-foundation.md).
## Data Settings And Runtime

General, Appearance, ChatGPT, Data sources, API keys, Sync, Storage use the supplied screenshot's
category sidebar, centered title, bordered groups and short rows. Desktop/mobile
share the same page; the drawer exposes settings categories on narrow screens.
Settings has no Demo badge because its service controls are real.

Both local app hosts start a Go child. Fresh directories skip startup download;
default sync interval is 24 hours, editable 1–720 hours. Enable/automation/interval
changes persist and affect the worker. Manual sync, counts, outcomes, cache size,
and source credential presence are real; research sources report key/contact/access requirements and dataset progress.

Credentials are submitted transiently to the host, cleared after save/close, and
never placed in browser workspace storage or returned as saved values. The Web
bridge uses same-origin authenticated requests; Electron uses private IPC. The
service ends with the host; no independent OS daemon is installed.

Native smoke now checks service startup, saved interval, credential ciphertext
redaction, settings UI and child cleanup using an isolated offline profile.
See [service design](design-docs/app-data-service.md) for exact boundaries.

Directory routes preserve source punctuation such as `BRK.B` and `ABR$D`.
Watchlist persistence retains its existing ticker grammar; unsupported formats
can be viewed but cannot be added yet. Native smoke now checks offline directory
reads and verifies that an empty store never shows the sample stock list.

Company avatars use an injected logo repository. The host prefers verified company
catalog mappings, then the original exact-symbol provider; components stay unchanged. Near-visible rows and the company
header request local host PNGs; unavailable images use letters. White transparent
marks get contrast on light surfaces. Directory reads never wait for logo HTTP
requests. A bounded session cache reuses fetched data URLs and supplies immediate
initial images when avatars remount. Avatars preload against the actual sidebar
scroll root. Each directory batch reads disk cache and decodes/samples contrast
before rows are published. Next-page loading begins 900px before the bottom;
uncached images use letters immediately while provider requests run. Disk hits survive app restarts; stale source
refresh runs behind the displayed cached image. Public asset source/cache limits are documented in
[stock logos](design-docs/stock-logos.md).

## Brand Identity

The selected three-part symbol and AIFi wordmark are shared by the rail and chat
identity. One compact alpha mask inherits the theme color, with 32px rail and
24px compact marks. Browser icons and native icons use the approved dark tile. macOS has a separate
centered export with native-sized canvas inset for both bundle and Dock icons.
See [brand assets/provenance](../packages/ui/src/assets/brand/README.md) and
[identity boundaries](design-docs/brand-identity.md). No remote assets or fonts
are required. Name/icon changes preserve the existing app name and data paths.

## Collection Interaction Checks

Collection changes reset search/pagination/scroll without changing detail tabs.
Watchlist add/remove updates the scoped sidebar. New query/selection keys hide
stale rows immediately; DirectoryFeed continues checking snapshot generations.
Global stock search/lookup remains able to open symbols outside a collection.
Vertical scrollbar chrome is hidden for stock lists, main content and sidebar
recents; wheel/trackpad/touch/keyboard scrolling stays enabled. Financial table
horizontal scrolling retains its own styles. Verify all four radio choices,
index counts/scoped search, empty watchlist, persistence, mobile drawer and dark
menu styling. Sources/refresh limits are in [index provenance](references/stock-index-sources.md).

Native smoke also opens the four-choice collection menu, saves/restores selection,
checks offline index provenance/coverage, rejects caller-defined built-in members,
and verifies hidden scrollbar styles. It never substitutes index entries into an
empty imported directory.

## Local Read And Loading Semantics

Directory search/paging/focus refreshes call the local Go/SQLite read capability,
not Nasdaq/provider APIs. Source collection has its own scheduler/manual-sync
path. Keep this distinction when adding datasets; follow the
[local data contract](design-docs/local-data-contract.md). During a periodic head
read, retain rows without showing Loading more. The `loadingMore` flag identifies
actual append reads; status/empty/error hints use the stock rows' 8px leading inset.

## Sourced research pages

Stocks no longer imports quote/profile/statement fixtures. Its injected
StockResearchRepository reads normalized SQLite research snapshots. All six tabs
use stored data or a dataset-specific empty/access state. Source period dates,
source timestamps, split basis and partial source windows are visible. Watchlist
reads local closing prices with bounded concurrency; Portfolio and AI remain
examples. See [runtime semantics](design-docs/research-ingestion.md).

Settings → API keys manages encrypted Massive/FMP and reserved Alpaca credentials.
Data sources holds SEC identification. Sync manages all-directory dataset toggles,
intervals, history range, provider budgets and measured coverage. No page read or
filter triggers provider collection. SEC filing links open only allowlisted HTTPS
research hosts in the system browser; desktop navigation remains sandboxed.

## Company quote and outlook presentation

Company headings prefer the stored profile name and otherwise shorten explicit
common-stock/ordinary-share suffixes without changing directory identities.
The quote block shows source-dated regular price/change, market state and a
separate after-hours observation. Analyst consensus, rating distribution and
recent GAAP actual/estimated EPS read persisted research snapshots; missing data
is never replaced with reference-site values. Snapshot dates stay out of the
stock-list heading area.

## Research citations and comparison details

Shared source chips show only the provider until clicked. Radix menus expose
collection time, source window/coverage, validated source links and optional
observation details; Escape/outside dismissal and keyboard focus return remain
standard. After-hours snapshots live in quote details with their own source
time and a non-streaming label; the page remains a collected daily/EOD view.

Earnings compare hollow estimate dots and actual dots colored by beat/miss,
with a padded value scale, quarter labels and source-value tooltips. Zero
estimates and negative actuals remain valid. Metric colors distinguish returns
and profitable/loss-making values without inventing period-over-period growth.
Peers show exact US-directory matches from stored related-symbol recommendations;
identity and regular quotes use independent local reads and unavailable quotes
stay empty. Source details explain the related-stock classification.

## Compact stock header and exchange clock

The stock page uses one desktop identity row for company, ticker/exchange and
watchlist action, with a border above research tabs. Only the global
Command/Ctrl+K dialog performs workspace-wide search; sidebar stock filtering
remains available. The visible quote clock ticks independently using New York
exchange time and catches up on focus/visibility changes. Quote observations
keep their own timestamps inside the source chip. No clock tick or search
navigation fetches a provider dataset.

The native sidebar toggle, vertical divider and page-specific 18px breadcrumb
icon are adjacent; their spacing is independent of sidebar width. Native window
controls and drag/no-drag boundaries remain unchanged. Narrow identity rows may
wrap metadata while tabs continue scrolling within the document.

## Chart point inspection and density

Chart ranges use calendar months/years anchored to the latest stored session.
All stored sessions in that window render price and volume/candles; no stride
filter drops intermediate volumes or extrema. Volume uses a linear scale against
the entire selected range. Line mode scales its closing values with small padding;
candle mode scales highs/lows. These are daily observations, not intraday ticks.

Pointer/touch selection and keyboard arrows/Home/End share the same selected
session. A bounded dark overlay follows the crosshair and shows session date,
OHLC and full volume, with no invented time-of-day. Escape/blur/leave dismiss
it. The bottom source/basis/session-count line stays static; a hidden live
readout retains accessible keyboard detail. Hover never requests a provider.
Return arrows use flex center alignment with their values, without a baseline
offset. Reported market cap retains its source quote date on the metric tooltip.

## ChatGPT Connection Verification

Run `pnpm smoke:chatgpt` for isolated React/Electron checks of completed replies,
failed-reply retry, cancellation and composer continuity. Synthetic transport never
uses real credentials or inference. `pnpm smoke:desktop` separately validates the
real sandboxed desktop capability. See
[official sources and setup](design-docs/chatgpt-desktop-connection.md).
