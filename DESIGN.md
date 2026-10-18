# Design System Inspiration of AIFi

Reference review: 2026-10-12; shell refined from user screenshots on 2026-10-13.
Apply this system to the shared React renderer.

## 1. Visual Theme & Atmosphere

A quiet investment research workspace: white canvas, a soft neutral sidebar,
clear typography, rounded inputs, and compact research cards. Combine ChatGPT's
conversation-first shell with Rallies' agents and financial activity surfaces.
Use AIFi's own navigation, copy, icons, and data; this is a style application.

Observed in the supplied Codex desktop and ChatGPT Web screenshots: a neutral
outer frame wraps the left tool rail and native desktop toolbar. A single inset
rounded panel contains the sidebar and white document canvas. Desktop places
traffic lights and back/forward controls outside that panel; Web uses its own
browser chrome. Apply this hierarchy to AIFi without copying private screenshot
content. Exact dimensions below are AIFi choices.

Observed: ChatGPT's public desktop shell has a 260px sidebar, system sans-serif
text, a 24px regular empty-state heading, dark pill actions, and generous space.
Rallies' Agents route, inspected through the user's Chrome Default profile, uses
a narrow icon rail, a compact toolbar, a centered agent-creation hero, and three
columns of popular agent cards. Cards have thin neutral borders, colored circular
icons, short descriptions, and compact metadata. Private account data was not
used as a design reference.

Sources: [ChatGPT](https://chatgpt.com/),
[Rallies Agents](https://rallies.ai/agents), and
[public Agents screenshot](https://rallies.ai/features/agents).
The adjacent DESIGN.md collection informed this document's structure, not a
third product's branding. Values below are AIFi choices unless marked observed.

## 2. Color Palette & Roles

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| frame | #F0F0F0 | #161616 | Outer application chrome |
| frame-border | #E3E3E3 | #363636 | Inset workspace outline |
| canvas | #FFFFFF | #191919 | Main page |
| sidebar | #F8F8F8 | #212121 | Navigation |
| surface | #FFFFFF | #242424 | Cards and dialogs |
| surface-muted | #F5F5F5 | #2C2C2C | Resting chips and inset areas |
| interaction-hover | text at 6% | text at 6% | Shared neutral hover, open and highlighted controls |
| text | #202020 | #ECECEC | Main text and headings |
| secondary | #636363 | #B5B5B5 | Descriptions |
| muted | #777777 | #A0A0A0 | Metadata |
| border | #E8E8E8 | #393939 | 1px separators |
| primary | #202020 | #ECECEC | Primary action background |
| on-primary | #FFFFFF | #202020 | Primary action text |
| positive | #217A54 | #83CCA7 | Positive movement and active status |
| positive-soft | #EDF6F0 | #263A2F | Positive badge background |
| negative | #B34C47 | #EC9C97 | Negative movement |

No decorative gradients, blue navigation rails, or colored page backgrounds.
Use green and red for financial direction or explicit states, paired with text.
Chart colors are semantic; they do not indicate recommendations.

## 3. Typography Rules

### Font Family

- Primary: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif.
- Secondary: same family; no remote font dependency.
- Monospace: ui-monospace, SFMono-Regular, Menlo, monospace.
- Enable tabular figures on prices, percentages, dates, and summary values.

### Hierarchy

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Page hero | 32px | 550 | 1.25 | -0.9px |
| Chat welcome | 30px | 500 | 1.3 | -0.7px |
| Section heading | 18px | 600 | 1.4 | -0.3px |
| Card title | 15px | 600 | 1.45 | -0.15px |
| Body | 14px | 400 | 1.6 | normal |
| Navigation and button | 14px | 500 | 1.4 | normal |
| Metadata | 12px | 400 | 1.5 | normal |

## 4. Component Stylings

### Buttons

Primary: dark pill, 36–40px high, 16px horizontal padding. Secondary:
transparent or surface fill, 1px border, same height. Icon buttons: 32–36px
square, 8px radius, muted text, named accessible label. Hover uses the shared `--interaction-hover` token (6% text tint over the current
surface); keyboard focus uses the same neutral feedback with no outline. Disabled
buttons keep a clear disabled appearance.

### Cards & Containers

Research cards: 1px border, 16px radius, 20px padding, no resting shadow.
Hover may strengthen the border but must not move the card. Two columns of
agent cards on wide screens, one on smaller screens. Financial data tables use
row separators, aligned numbers, and a horizontally scrollable inner wrapper.

### Inputs & Forms

The prompt composer is a rounded 20px bordered surface with a 16px textarea and
a bottom toolbar. Never place the placeholder over a label required to operate
a dialog form. Textareas support keyboard submission and multiline entry.
Selected ticker chips are small outlined pills. Forms show validation inline.

### Navigation

76px outer tool rail and a 248px stock sidebar inside the workspace panel. Rail
buttons are 64×56px with an icon and short label. Stocks, Chat, Agents,
Watchlist, Portfolio, and Library live only in that single column; Settings
lives in the avatar popup. Stocks is the starting route. The inner sidebar
contains searchable stock rows with ticker/security name and exchange label, never a second
app menu. A visible toolbar control collapses/restores it. Keep the avatar at
the rail bottom. Use the selected original three-part symbol and the exact wordmark AIFi. The
shared alpha mask inherits the theme foreground; rail marks are 32px, compact
marks 24px. Use the dark rounded tile for native/browser app icons. Do not reuse
reference product logos. See [brand assets](packages/ui/src/assets/brand/README.md).

### Badges / Tags

Neutral tags: 11–12px text, 6px radius, muted background. Active badge: small
green dot plus text on positive-soft. Paused badge: neutral. Mark the workspace
as demo data in the shell; name simulated checks explicitly as previews.

### Links / Interactive States

Interactive text inherits the main color, with underline on hover when needed.
Use real buttons for actions and links for navigation. Dialogs and menus must
support Escape, keyboard traversal, focus containment, and focus restoration.
Use Radix primitives for those behaviors, not a large visual component library.

## 5. Layout Principles

### Page Composition

- App shell: neutral outer chrome, 76px tool rail, and a single inset panel
  containing sidebar and main canvas. Panel radius 16px, outline 1px, outer gap
  8px. The frame and sidebar stay still while main content scrolls internally.
- Electron: 48px draggable outer toolbar with native Mac traffic lights,
  back/forward, sidebar toggle, adjacent divider and page-specific breadcrumb,
  search, and theme. Controls use consistent 18px icons. Reserve 96px before navigation at the
  left on macOS; interactive controls are no-drag. Do not draw traffic lights.
- Web: 8px top gap, no desktop window toolbar; a 52px page toolbar lives inside
  the main panel with sidebar toggle, page title, search, and theme.
- Agents: short functional heading, natural-language composer, template chips,
  agent filters, agent cards, and a compact recent-update feed.
- Research: centered welcome and composer; after submission show a conversation
  and an explicitly illustrative response with evidence-shaped sections.
- Watchlist: compact ticker list, sparklines, and local add/remove controls.
- Portfolio: illustrative allocation chart and position table.
- Library: reusable skill categories and mock report previews.
- Settings: category sidebar and centered grouped rows for Appearance,
  Data sources, Sync, Storage; short labels and neutral switches.

### Spacing System

Use 4, 8, 12, 16, 20, 24, 32, 40, and 48px. Keep long descriptions within 65ch.

### Grid & Container

Main content max-width: 1040px; chat reading width: 760px. Desktop horizontal
padding: 40px, tablet: 24px, mobile: 20px. Keep primary controls within the main
reading column instead of stretching them across the whole screen.

### Section Rhythm

Hero to composer: 24px. Composer to content: 32px. Card gaps: 16px. Data sections:
28–32px. Reserve whitespace for hierarchy, not giant marketing hero artwork.

### Border Radius Scale

8px: navigation and menus. 12px: small panels. 16px: cards. 20px: composer and
dialogs. 999px: pill buttons and ticker chips.

### Workspace Menu

The stock heading selects All US listings, S&P 500, Nasdaq-100 or My watchlist;
the selected collection replaces the heading label with its actual filtered count.
Keep provider names in Settings, snapshot dates compact and incomplete coverage
explicit. Built-in definitions have no user edit/rename/delete controls. Hide
vertical scrollbar chrome while preserving normal scrolling; horizontal table
wrappers retain their own scroll affordance.

Keep the sidebar focused on stock selection; chats remain selectable inside
Chat. Center 64px icon+text buttons in the 76px rail with equal 6px side margins;
keep no extra gutter before the inset panel. The bottom account control uses a
44px trigger and 36px avatar: a person icon before sign-in, verified name initial
after connection. Its 228px popup uses 6px padding, a 14px radius and 34px desktop
rows. Before sign-in use the identity area itself as Sign in with ChatGPT;
after connection show name/email, with identity opening account settings and
Usage/Settings as separate actions. Usage opens the official management page; show
no unverified remaining percentage. Theme lives in the toolbar/Appearance.
Command/Ctrl+, opens Settings and dismisses an open account menu. At mobile widths move the same avatar menu into the page toolbar;
avoid duplicating sidebar footers. Menus support keyboard navigation, Escape,
outside dismissal, and focus return. All controls suppress browser/default focus
outlines. Keyboard focus uses the existing neutral hover background, text,
underline, or form-border treatment. Keep Tab navigation, focused inputs, menu
selection, and Escape focus return. Never add blue outlines or ring utilities to
individual components.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | Background and border only | App shell and cards |
| Floating | 0 8px 30px rgba(0,0,0,.08) | Menus |
| Modal | 0 20px 70px rgba(0,0,0,.16), dim backdrop | Forms and search |

Respect reduced motion. Default transitions: color/background 140ms; panel
entry 160ms. Never animate prices or imply a live market feed.

## 7. Do's and Don'ts

### Do

- Use thin separators, limited color, and short explanatory copy.
- Make every primary action work locally and persist useful demo changes.
- Keep demo status visible and distinguish previews from real execution.
- Share the renderer between browser and Electron.
- Keep desktop drag regions separate from buttons and input fields.

### Don't

- Add cloud login, fake broker connection success, or fabricated live quotes.
- Put technical runtime details into routine investment flows.
- Mix saturated dashboard themes, decorative gradients, or stock imagery.
- Add a second desktop component tree or duplicate this design system.

## 8. Responsive Behavior

Inferred AIFi adaptation: below 900px use a collapsible sidebar drawer and one
column of agent cards. Below 600px reduce hero type to 26px, stack settings
controls, and let chip rows wrap. Touch targets should be at least 40px.
Below 600px hide the outer tool rail, keep an 8px inset and a 12px workspace
radius, and retain drawer navigation in the page toolbar. The body never scrolls;
main content and financial table wrappers scroll inside the workspace.
Tables scroll inside their panel without causing page overflow. Dialogs retain
20px viewport margins; detail drawers become full-width on mobile.

Provide light and dark themes using the same tokens. The reference review used
light surfaces; AIFi's dark palette is an inferred complementary implementation.

## 9. Agent Prompt Guide

- Primary colors: neutral white/charcoal; green and red only for state/data.
- Key type rules: system sans, 14px body, 32px hero, tabular numeric values.
- Core components: thin borders, 16px cards, 20px composer, dark pill action.
- Page structure: outer chrome surrounds an inset sidebar/document panel;
  Stocks is the entry; the rail owns global navigation.
- Short prompt: Build a local investment research workspace with ChatGPT's
  readable shell and Rallies' agent/update organization. Follow these tokens,
  use original AIFi content, and implement all visible primary actions locally.

Validation note (2026-10-13): reviewed the rendered app in Chrome at desktop and
390px mobile widths, plus the actual Electron renderer. Keep financial tables
inside a scroll wrapper, wrap long user text, provide 40px mobile controls, and
restore the opening control's focus after dialogs. Still screenshots disable
motion so transient navigation colors are not mistaken for final states.

## 10. Product Copy

- Use short, functional titles and action labels. Add help only when it changes
  what the user should do; avoid automatic page subtitles and repeated summaries.
- Keep one visible Demo entry in the toolbar, with details available on demand.
  Label financial examples and sample replies where their provenance matters.
- Keep roadmap, provider eligibility, repository paths, implementation details,
  and development conversations in repository docs, outside routine product UI.
- Errors explain the impact and recovery action. Destructive confirmations name
  what will be removed or replaced.
- Seed copy can improve for new workspaces; never rewrite saved user content or
  conversations to enforce a new writing style.

## 11. Stock Detail Page

Reference reviewed on 2026-10-13 through Chrome Default / OBU: Rallies AAPL has
six underline tabs, a three-column Chart view, and Financials with a Metrics
selector plus Quarter/Yearly controls. Missing-data layouts and responsive
rearrangement below are AIFi choices.

- Reuse the shared frame, rail, stock sidebar, avatar, and native toolbar.
- Company header: compact company mark, name and ticker/exchange on one row,
  with the Watchlist toggle aligned right. Use the global Command/Ctrl+K search
  instead of a second company-page search. Separate this header from the tabs
  with a thin border; wrap identity metadata only on narrow screens.
- Six main tabs: Chart, Financials, Funds, Politicians, Insiders, Analyst. Tabs
  are 15px/500, selected 600 with a 2px underline and 40px minimum height.
  Filings is a Financials view; no separate Overview tab.
- Chart: quote/company/analyst/earnings column; metrics/peers column; wide
  daily price/volume chart followed by Digest and recent filings. Thin vertical
  dividers separate columns. Quote is 32px; metrics use tabular figures.
- At content widths below 1,000px move metrics below identity beside the chart;
  at 700px and below keep quote, About, Analyst and Earnings together before
  metrics/Peers and the price chart. Tabs and tables scroll internally.
- Chart controls: 1M/3M/1Y/2Y and Line/Candle; hover/keyboard details use the same
  persisted daily OHLCV observations. SVG dimensions follow rendered width to keep
  labels legible. Use a compact dark crosshair tooltip for session date, OHLC and
  volume; the footer stays static. Render every session in calendar ranges, without
  dropping volume/candle bars. Line and candle modes use appropriate value bounds.
- Financials: Metrics/Income/Balance/Cash flow/Filings selector, Quarter/Yearly,
  period/unit labels, sparse tables. Fixtures say Sample financials.
- Funds, Politicians, Insiders: relevant summary metrics, filters, disclosure
  table, concise empty state. Analyst: targets, unmarked rating scale, rating table.
  Unsupported values stay an em dash; no fictional holdings/trades/ratings/news.
- Short missing-data copy replaces explanatory roadmap text. Unknown tickers can
  be bookmarked but have no invented company, exchange, quote, or financials.
- All hosts use one React implementation; the former standalone preview is an
  entry link. Preserve neutral keyboard focus and native window controls.

Detailed scope: [stock page design](docs/design-docs/stock-research-page.md).

### Financial Statements

Financials uses a compact heading/source chip, a 230px comparison plot, a view
selector and Quarter/Yearly toggle. Start with quarterly history when available;
annual-only issuers display available annual data. Use up to 20 collected
quarters/ten annual period ends, showing exact source dates rather than inferred
fiscal labels. SEC and vendor-standardized dates must remain distinguishable.

A 13-row summary precedes expandable Income statement, Balance sheet, Cash flows,
Comprehensive income, Key performance indicators and Derived metrics groups.
Keep missing source concepts as em dashes with optional explanations. Preserve
Corporate actions and Filings views. Metric columns stay fixed while dates scroll
horizontally; expanded groups preserve the scroll position.

Row controls select up to three comparable series; a different unit replaces the
selection. Shares, dollars, per-share values and percentages must not share one
scale. Keep all available period bars, signed zero baselines, endpoint labels,
neutral/green series and red losses. A bounded dark tooltip follows the crosshair
with dates/values, including keyboard inspection. Calculated cells carry an
asterisk and inspectable source/filing/calculation details; missing operands are
never replaced with zero. Keep custom KPIs and historical valuation unavailable
until a real, coherent source exists.

### Fund Ownership

Funds pairs a selectable reported-share ring with a sticky-name quarterly table.
Keep the tracked-manager denominator explicit; separate vendor-wide aggregates
from sampled holders. A source chip contains collection details. Use compact
rounded position pills: Added green, New dark, Trimmed purple, Same neutral and
Exited red. Missing reports remain em dashes; only complete reports prove zero.

The selected manager appears beside the ring with a locally cached logo. The
center shows exact reported holding changes when known, otherwise shares held.
Reporting-period controls update both ring and position labels. Preserve keyboard
selection and a bounded dark holder tooltip. Monthly Yahoo fund dates stay exact;
never invent quarter ends or previous shares from rounded percentages. Narrow
containers keep the ring compact and the wide table inside a horizontal scroller.

### Reported Activity and Analyst Ratings

Politicians and Insiders pair a signed daily bar chart with a cumulative line and
a compact source-linked event table. Purchases use green, sales red, and event
type pills remain small. Keep readable axes on narrow screens and bounded dark
hover/keyboard details. Person/firm search, scopes and period filters stay local.
Politician amounts remain disclosed ranges; its chart/ranking counts disclosures
and excludes ambiguous duplicate lines. Never display estimated dollar gains.
Use initials when a public identity/portrait has not been verified.

Insider default scope shows non-derivative P/S purchases/sales. Other SEC events,
derivatives and amendments remain separately inspectable; keep reported shares
after the transaction, ownership and filing source. Analyst uses a five-axis
recommendation radar with source counts, consensus and average target beneath it.
The historical table includes firm, optional analyst, action, rating, target and
signed upside. Missing targets/names are em dashes. Upside references a stored
price/date, not an assumed investment return.

## 12. Settings

Use the supplied 2026-10-13 settings screenshot as the layout reference. Preserve
the outer frame/rail; replace the inner stock sidebar with category search and
Personal/Data groups. Document width 920px with 40px desktop padding, 28px tablet,
20px mobile; title 25px/550 with 28px space before content. Sidebar category rows
use 7px vertical padding and 16px between groups.

Each section uses a 14px title and a 14px rounded bordered group. Rows have 12px
vertical padding, a 58px minimum height, 14px labels and optional 12px functional descriptions. Controls
align right: neutral switches, selects, compact buttons, and inline inputs. Tables
or cards must not overflow on mobile; use the existing drawer for categories.
Settings represents real local controls and has no Demo badge. Appearance is the
default category; omit General and duplicate service/status rows. Appearance
contains one Visual style group and a Mode row with three compact app previews:
System (split light/dark), Light, Dark. Use a neutral selected outline, shared
hover tint, named radio semantics and arrow-key selection. Preview names appear
in a compact dark tooltip above the card on hover or focus; Escape dismisses it.
Keep extra themes,
accents, fonts and explanatory copy out of this surface.

Saved credentials show only presence; blank password inputs replace values on
explicit Save, and Remove clears saved fields. Data adapters that are not active
say Not syncing; do not imply remote authentication success. Keep neutral focus,
Escape/dismissal, and actual enabled/disabled states.

Stock quote refinement (2026-10-17): keep market state, currency, price and
change compact. The visible clock is current exchange-local time (US listings:
America/New_York, DST aware) and advances automatically. Stored regular and
after-hours observation times remain in source details; the clock never implies
that prices stream. Keep the native breadcrumb next to the sidebar toggle with
a vertical divider, independent of the sidebar's width/collapse state.

## 13. Workspace Search And Shortcuts

Keep the search dialog at most 560px high or viewport height minus 48px. The
header, 40px input and compact footer stay visible; only results scroll. Desktop
rows are 40px, mobile 44px; names stay on one line with ellipsis/full-name titles.
Use neutral focus feedback and keyboard arrow selection, Enter to open and Esc
for dismissal. The footer opens shortcut help with Command/Control+/.

Command/Control+[ and ] use the existing session-bounded history. B toggles the
sidebar (drawer on narrow screens), K opens search and comma opens Settings.
Desktop-only N opens New chat and focuses its composer; Web preserves browser
New Window. Ignore composition/additional modifiers and retain input formatting
for B. Held commands do not repeatedly toggle/navigate. Utility shortcuts are
listed in one small help dialog rather than additional navigation items.

## 14. Responsive Stocks

Below a 1280px viewport, move the stock list into a left drawer opened by the
sidebar button or Command/Control+B. Keep the wide sidebar preference independent
of this automatic mode. Restore the mounted list when returning to a wide window;
share its filter with the drawer. The rail remains visible above phone widths.

Use the actual document container to reflow content. Above 1000px keep the three
columns. Between 701 and 1000px, pair quote/About with the chart, followed by
metrics/peers and paired secondary panels. Below 701px, show quote, About,
Analyst, Earnings, metrics/Peers, price chart, Digest and filings. Keep every
section and a single mounted chart; resizing must preserve its range and mode.

Keep company identity compact, ellipsize long names and retain the watch action.
Below a 440px document, use a 40px icon-only watch button with an accessible name,
16px content padding and stacked summary rows. Tabs use horizontal scrolling and
automatically reveal the selected label. Dense tables retain internal scrolling;
they must not widen the document or the window.

Below a 440px detail body, put the selected fund identity above its ownership
ring. Let holder search and activity search use their own row, with filters
following in source order. Keep period controls and long selected values bounded.
Financial tables compact their pinned metric column based on document width so
at least part of the period data stays visible. Research tabs keep overview or
visualization before their data headings, filters and internally scrolling tables.

## Shared value selectors

Use the shared `Select` for value choices: content-sized 34px triggers, 8px
label/chevron gap, 10px trigger radius, 16px popup radius and compact 34px rows
(38px on narrow touch screens). Menus use a neutral selected row and check,
optional search, internal scrolling and a 360px height cap. Preserve keyboard
selection and focus return; avoid native system-blue popups.

Settings category links and shared Select option rows leave 2px between rounded
highlights. Active/hover and selected options share the neutral interaction fill;
do not add an inset outline to the hovered option. Preserve the selected check
and normal keyboard focus cues on the trigger.

### Account management

Settings → ChatGPT contains one compact account list. Show name/email and an
Active check, an explicit Use account action on other authorized profiles, and
Sign in/Reconnect on profiles that need authorization. Keep per-account Sign out
in the row's more menu. Put Add account in the section heading, cancellation in
its place while sign-in is pending, and official ChatGPT usage below as a subtle
external link. Keep model selection in Chat. Avoid Connected/Connections/status
explanations and duplicated login or usage rows; errors remain actionable.

Account action menus align icons and labels horizontally in one compact row.
Secondary usage links keep 10px horizontal padding inside their hover surface.

### Loading

Use the shared Skeleton primitives for initial data reads. Match the content's
layout with neutral, softly shimmering blocks; honor reduced motion with static
shapes. Retain cached content on refresh and existing rows during pagination.
See [loading states](docs/design-docs/loading-states.md).

### Stock chart controls

Keep watch actions beside company identity as labeled icon controls. Divide tab
spacing between outer gaps and hover padding. Chart controls form one wrapping,
left-aligned row: range, style, source, studies and comparison. Technical coverage
belongs in source details; chart hover owns point-in-time values. See
[stock chart tools](docs/design-docs/stock-chart-tools.md).
