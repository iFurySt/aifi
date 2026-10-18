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

The outer neutral frame owns a 76px tool rail. A single rounded inset panel
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
toolbar. Rail buttons are centered with equal 6px side margins and no extra
panel gutter. The 44px bottom account trigger contains a 36px person icon before
sign-in or the active verified name initial after connection. Connected identities use two lines: name with a transparent 12px provider mark in a 14px slot, then email. The badge is local, theme-aware and describes the actual sign-in source; no third provider text line is shown. The shared Radix
account menu is 228px wide with 34px desktop action rows. Its identity area is
Sign in with ChatGPT before connection, then name/email opening Settings → ChatGPT.
Usage/Settings remain separate actions when connected. It reuses existing ChatGPT
host actions; Usage opens official management without inventing remaining quota. The GitHub row opens the fixed project repository in the system
browser on desktop or a separate tab on Web, in either account state. Theme stays in the toolbar/Appearance. Command/Ctrl+, opens Settings
and dismisses the account menu. Below 600px the rail is hidden and the same menu
appears in the page toolbar. Check keyboard selection, Escape/focus return,
outside dismissal, popup viewport bounds, and settings access with the sidebar
collapsed as well as on mobile. Settings uses 40px desktop content padding,
25px headings with 28px below, 14px group radii, and rows with 12px vertical
padding/58px minimum height. Mobile retains 40px menu rows and usable controls.
Settings → ChatGPT is a compact saved-account list: name/email, active marker,
explicit switch/reconnect and per-account sign-out. Add account is in the section
heading; official ChatGPT usage is a secondary link. Model choice stays in Chat.
`pnpm smoke:account` checks anonymous/connected identity routes, multi-account
switch/reconnect/sign-out, cancellation/errors, usage dispatch, keyboard shortcuts
and compact light/dark/narrow layout using synthetic isolated accounts.

Keyboard focus across the renderer and stock prototype uses neutral backgrounds,
text/underlines, and form borders instead of outlines. The shared CSS suppresses
browser focus outlines; no blue focus token/ring remains. Tab navigation and
Escape focus return stay enabled. Do not blur controls or intercept Tab to hide
focus styling.

## Workspace Search And Shortcuts

Search uses a dedicated modal class: at most 560px or viewport height minus 48px,
a fixed 40px input, one-line result names, and an internally scrolling result list.
Header/footer stay visible. Arrow keys focus/reveal results, Enter opens a result,
and Escape uses the existing Radix dismissal/focus restoration.

`workspace-shortcuts.ts` is the shared binding/help source. Command/Control+[ and
] call the same session-bounded history controls as the toolbar, including branch
invalidation. B toggles the sidebar/drawer, K search, comma Settings, and / help.
Desktop N opens a new chat and focuses the composer; Web leaves New Window to
the browser. Respect IME, extra modifiers, input formatting, open form dialogs
and held-key suppression. Account menus close before recognized commands.
`pnpm smoke:navigation` exercises these interactions with isolated local fixtures;
it does not authorize accounts, infer models or collect provider data.

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

Appearance, ChatGPT, Data sources, API keys, Sync, Storage use the supplied screenshot's
category sidebar, centered title, bordered groups and short rows. Desktop/mobile
share the same page; the drawer exposes settings categories on narrow screens.
Settings has no Demo badge because its service controls are real.
Appearance is the default category; old General links resolve there. It contains
only Visual style → Mode: System, Light and Dark compact preview radios. Each
preview shows a compact dark tooltip on hover or keyboard focus; Escape, leaving
or blur dismisses it. Native title bubbles are omitted. Existing
light/dark preferences are preserved. System persists the preference while the
rendered palette follows `prefers-color-scheme` changes. The toolbar toggles the
currently resolved palette into an explicit mode. Appearance does not poll the
data service or show service status. Directory automation and credentials remain
in Sync/Data sources/API keys.

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
[stock logos](design-docs/stock-logos.md). Avatars display original square PNGs across the full content box with contain sizing and no extra inset or automatic cropping. Rounded bounds clip the image; source whitespace is curated in the catalog. Decode/contrast results remain shared and cached.

## Brand Identity

The selected three-part symbol and AIFi wordmark are shared by the rail and chat
identity. One compact alpha mask inherits the theme color, with 32px rail and
24px compact marks. Browser icons and native icons use the approved dark tile. macOS has a separate
centered export with native-sized canvas inset for both bundle and Dock icons.
See [brand assets/provenance](../packages/ui/src/assets/brand/README.md) and
[identity boundaries](design-docs/brand-identity.md). No remote assets or fonts
are required. Name/icon changes preserve the existing app name and data paths.

## Financials Workspace

`Financials.tsx` composes source chips, a comparison trend, a compact view/period
selector and a sticky-metric-column table. The overview has 13 metrics and six
expandable statement/KPI/derived groups. Shared read-only table/filing helpers
live in `stock-research-shared.tsx`; existing panel exports remain compatible.

Core owns metric unit/aggregation definitions, same-period derived calculations
and date selection. Up to 20 quarters/ten annual ends come from real reports;
annual balance columns never include every quarterly instant. Start quarterly
when available, fall back to annual-only coverage, and retain explicit user
period/series choices across company changes. No provider request is issued by
this page. Missing concepts/unsafe historical valuations remain gaps.

The plot compares at most three metrics on one unit scale, retains all periods,
and supports a dark bounded hover/keyboard tooltip. Horizontal table scroll is
retained when expanding groups. Raw and calculated values have inspectable tags,
periods and filing IDs; weighted shares never use currency formatting. Run
`pnpm smoke:financials` after changing this surface. It uses isolated synthetic
history for groups, 20-period range, math provenance, zero baselines, units,
selection, tooltip and scroll behavior. Actual AAPL/NVDA Web and native Electron
views were also checked; 390px layouts keep table overflow inside the table.

## Funds Workspace

`Funds.tsx` reads stored Funds through core `fundHistories`/`fundPeriods`.
`FundOwnershipRing` links manager selection to a sticky-name quarter table.
Reporting-period controls update ring and positions. Pills show Added/New/
Trimmed/Same/Exited; unknown reports stay blank. Adjacent 13F reports establish
holding changes, never actual trades. The ring denominator is tracked managers,
not total company ownership. Yahoo institution/mutual-fund scopes and independent
vendor aggregates remain available; monthly reporting dates remain exact.

Fund avatars use the CIK-only `fund.logo` host port and private disk/session PNG
caches. Narrow layouts keep wide table overflow inside its wrapper. Run
`pnpm smoke:funds` for 14 quarters, selection, filtering, true zero vs gaps,
period/keyboard/hover behavior and desktop/mobile layout. Its fixture never
opens providers or account data.

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

## Stocks In Narrow Windows

Stocks switches its 248px list to a left drawer below a 1280px viewport. The
existing toggle and Command/Control+B reopen it. At 1280px and above, restore the
user's wide sidebar preference; automatic changes never overwrite that choice.
Other pages keep their 900px drawer threshold. Category/app navigation stays in
the outer rail where visible; only phones repeat app destinations in the drawer.
The mounted wide list and the drawer share a filter, and resizing keeps the
selected stock, loaded list position, chart range and Line/Candle state.

Use document container widths, rather than screen width, for content: above
1000px retain three independent columns; 701–1000px place quote/About beside the
chart, then full-width metrics/peers and paired company/news panels. At 700px
and below, order quote, About, Analyst, Earnings, metrics/Peers, price chart,
Digest and filings vertically. No company section is hidden to fit the window.
At 440px and below, compact the watch control to an accessible 40px star button
and stack summary cards. Financial/activity tables scroll within their wrappers.
Tabs scroll horizontally without a scrollbar; a ResizeObserver reveals the
selected tab using only horizontal scroll, retaining document position.

`pnpm smoke:stocks-layout` checks real shared React/CSS in disposable Electron
windows at 1440/1279/1100/900/760px and Web at 600/390px. It verifies no page
horizontal overflow, all company sections, chart DOM/range/style retention,
list position/filter retention, drawer keyboard/selection/dismissal, wide
preference restoration and every tab's visibility/table containment. Populated
and empty fixtures also assert per-tab reading order, bounded controls, local
table scrolling and compact fund identity/ring stacking. Its injected
local fixtures do not use real credentials, inference or provider collection.

## Storage Settings

Storage displays data-directory file usage, a separate SQLite content breakdown,
and a largest-first file/folder inventory in pages of 50. Files strictly above
50 MB appear individually; smaller files roll into top-level directories, with
root-level small files grouped as Data folder. Large files are excluded from the
directory remainder so row sizes sum to the total. Folder/reveal actions live on
the list rows; the standalone absolute data-path row is removed. Re-entry immediately
reuses the renderer-session scan and expanded pages, then refreshes in the
background with a spinning Refresh icon. Background scans and failures retain the
visible result. Only the first uncached visit shows loading. File totals/listing do not wait
for Database contents: its exact category snapshot updates independently in the
background, reuses a durable ten-minute cache, and retains last-good values on
SQL errors. Active views poll only pending diagnostic metadata; no file rescan
is involved. Desktop offers Open
folder and Show in Finder
(Show in folder elsewhere); Web offers Copy path. The legacy demo workspace reset
control is removed. Counts exclude the app bundle and browser/profile data.
See [storage boundaries](design-docs/storage-usage.md).

`pnpm build && pnpm smoke:storage` validates the actual Electron renderer against
a disposable offline Go/Node host, including page sorting, pagination without a
rescan, refresh/error recovery, native dispatch and narrow/light/dark presentation.
Run from an isolated checkout; results live in `.artifacts/storage-ui/`.

## Shared Value Selectors

Use the controlled `Select` component for Usage, settings, stock collections,
Financials, Chat model/effort and agent cadence. It provides optional local search,
neutral selected rows, a nearby chevron, viewport-bounded portals and keyboard
selection. Keep action and citation menus separate. See
[selection controls](design-docs/selection-controls.md) for the API and
`pnpm smoke:selects` regression gate.

## Text Selection Boundaries

`selection.css` makes application chrome nonselectable by default: window/web
headers, navigation/sidebars, buttons, tabs, menus, filters, avatars and chart
graphics. The main document remains selectable for company descriptions,
financial values/tables, chat messages and other reading content. Agent sheets
and workflow details also opt in; future reading surfaces can use
`data-selectable-content`. Internal app-navigation links remain controls.

Inputs, textareas and editable content allow selection when focused, preserving
editing/Select All without including unfocused placeholders in document-wide
selection. This is CSS only; no blanket key/copy/pointer cancellation is added.

Run `pnpm smoke:selection` to visit implemented main pages, six stock tabs and
settings categories in a disposable visible Electron window. It checks chrome,
focused field ranges, document Select All and reading/control areas in portals.
It uses offline fixtures and never opens a real account or source collector.

## Shared interaction color

`--interaction-hover` is the single neutral hover/open/highlight background,
using the rail's 6% text tint in either theme. Navigation, secondary/icon buttons,
search fields, menu/listbox rows and settings controls consume this token;
`--surface-muted` remains a resting surface/chip color. Primary actions and
semantic chart colors retain their own states. Search uses a short title with
keyboard help available through its Shortcuts action; collection headings omit
redundant stock counts. Toolbar Chat glyphs have a 1px optical inset within the
same 18px icon slot.


## Stock activity pages

Politicians reads stored disclosure records through core normalization. Top buyers
and its signed/cumulative chart count disclosed purchases/sales, excluding source
ambiguities. Local actor/chamber/type/date/search filters share the same rows.
Amounts remain ranges; source links open official reports. Price moves require
stored split-adjusted closes and are never labeled portfolio gains. The shared
ActivityChart supports dark hover/keyboard details and contained mobile overflow.
Run `node scripts/check-stock-activity.mjs` for its isolated interaction fixture.


Insiders uses the same signed chart/table pattern with monetary values. Its default
view contains non-derivative P/S purchases/sales; awards, withholding, exercises,
derivatives and amended/superseded records are accessible through event scopes
without inflating totals. Tables retain reported shares-after, ownership, role,
filing date and official source links. Source details explain issuer-wide scope
and the bounded recent-filings window.

Analysts uses a five-axis recommendation radar, current consensus/target summary
and a historical firm-event table. Source populations are separate: target
opinions are not the recommendation count or historical event count. Individual
identities/targets remain blank when absent. Target deltas and upside reference
stored prices and are not labeled returns. Firm/action/date/search controls and
local Show more share one stored event array. Activity charts resize their SVG
coordinate space to keep mobile axes readable and tooltip bounds contained.

## Stock list session lifecycle

`DirectoryFeedCache` keeps a sidebar's pages, pending read, preparation and scroll
outside React mounts. Re-entry uses its snapshot synchronously; ordinary
mount/focus checks share a 60-second local freshness window. No provider collection
is involved. Failed background reads retain usable rows. See
[the directory contract](design-docs/stock-directory-reads.md) and run
`pnpm smoke:stocks-cache` for delayed-read/remount/offline regressions.

Settings navigation links and shared Select options have 2px between highlights.
Select hover/keyboard-active fill matches the selected row without an inset border;
keep the selected checkmark and the trigger's keyboard focus indication.
