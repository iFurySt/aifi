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
| surface-muted | #F5F5F5 | #2C2C2C | Hover, chips, inset areas |
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
square, 8px radius, muted text, named accessible label. Hover uses surface-
muted; keyboard focus uses neutral hover-like feedback with no outline. Disabled
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

80px outer tool rail and a 248px stock sidebar inside the workspace panel. Rail
buttons are 64×56px with an icon and short label. Stocks, Chat, Agents,
Watchlist, Portfolio, and Library live only in that single column; Settings
lives in the avatar popup. Stocks is the starting route. The inner sidebar
contains searchable stock rows with ticker/name and sample quote, never a second
app menu. A visible toolbar control collapses/restores it. Keep the avatar at
the rail bottom. Use a small wordmark and original SVG symbol; do not reuse
reference logos.

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

- App shell: neutral outer chrome, 80px tool rail, and a single inset panel
  containing sidebar and main canvas. Panel radius 16px, outline 1px, outer gap
  8px. The frame and sidebar stay still while main content scrolls internally.
- Electron: 48px draggable outer toolbar with native Mac traffic lights,
  back/forward, sidebar toggle, page title, search, and theme. Reserve 96px before navigation at the
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
- Settings: category sidebar and centered grouped rows for General, Appearance,
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

Keep the sidebar focused on stock selection; chats remain selectable inside
Chat. The bottom outer-rail avatar opens a 264px popup with workspace identity,
Settings, and theme switching. Use a 40px trigger, 16px popup radius, and 40px
menu rows. At mobile widths move the same avatar menu into the page toolbar;
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
- Company header: monogram/name/ticker/exchange, search, Watchlist toggle.
- Six main tabs: Chart, Financials, Funds, Politicians, Insiders, Analyst. Tabs
  are 15px/500, selected 600 with a 2px underline and 40px minimum height.
  Filings is a Financials view; no separate Overview tab.
- Chart: quote/company/analyst/earnings column; metrics/peers column; wide
  daily price/volume chart followed by Digest and recent filings. Thin vertical
  dividers separate columns. Quote is 32px; metrics use tabular figures.
- At content widths below 1,000px move metrics below identity beside the chart;
  below 660px prioritize quote, chart, metrics. Tabs and tables scroll internally.
- Chart controls: 1M/3M/1Y/2Y and Line/Candle; hover/keyboard details use the same
  daily OHLCV fixtures. SVG dimensions follow rendered width to keep labels legible.
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

## 12. Settings

Use the supplied 2026-10-13 settings screenshot as the layout reference. Preserve
the outer frame/rail; replace the inner stock sidebar with category search and
Personal/Data groups. Document width 920px with 48px desktop padding, 28px tablet,
20px mobile; title 28px/550 with 48px space before content.

Each section uses a 14px title and a 16px rounded bordered group. Rows have 18px
vertical padding, 14px labels and optional 12px functional descriptions. Controls
align right: neutral switches, selects, compact buttons, and inline inputs. Tables
or cards must not overflow on mobile; use the existing drawer for categories.
Settings represents real local controls and has no Demo badge.

Saved credentials show only presence; blank password inputs replace values on
explicit Save, and Remove clears saved fields. Data adapters that are not active
say Not syncing; do not imply remote authentication success. Keep neutral focus,
Escape/dismissal, and actual enabled/disabled states.
