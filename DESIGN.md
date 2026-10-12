# Design System Inspiration of AIFi

Reference review: 2026-10-12. Apply this system to the shared React renderer.

## 1. Visual Theme & Atmosphere

A quiet investment research workspace: white canvas, a soft neutral sidebar,
clear typography, rounded inputs, and compact research cards. Combine ChatGPT's
conversation-first shell with Rallies' agents and financial activity surfaces.
Use AIFi's own navigation, copy, icons, and data; this is a style application.

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
| focus | #608BCE | #98B6EA | Keyboard focus only |

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

Primary: dark pill, 36–40px high, 16px horizontal padding. Secondary: transparent
or surface fill, 1px border, same height. Icon buttons: 32–36px square, 8px radius,
muted text, named accessible label. Hover uses surface-muted; focus uses a visible
2px focus ring. Disabled buttons keep a clear disabled appearance.

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

248px left sidebar, with 40px rows and 8px active-state radius. Group the six
primary destinations: Research, Agents, Watchlist, Portfolio, Library, Settings.
Agents is the starting route. Place the local workspace identity at the bottom.
Use a small wordmark and original SVG symbol; do not reuse reference logos.

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

- App shell: sidebar, 60px top toolbar, scrolling main canvas.
- Agents: heading and subtitle, natural-language composer, template chips,
  agent filters, agent cards, and a compact recent-update feed.
- Research: centered welcome and composer; after submission show a conversation
  and an explicitly illustrative response with evidence-shaped sections.
- Watchlist: compact ticker list, sparklines, and local add/remove controls.
- Portfolio: illustrative allocation chart and position table.
- Library: reusable skill categories and mock report previews.
- Settings: theme/local-data controls and clearly planned model/broker access.

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
Tables scroll inside their panel without causing page overflow. Dialogs retain
20px viewport margins; detail drawers become full-width on mobile.

Provide light and dark themes using the same tokens. The reference review used
light surfaces; AIFi's dark palette is an inferred complementary implementation.

## 9. Agent Prompt Guide

- Primary colors: neutral white/charcoal; green and red only for state/data.
- Key type rules: system sans, 14px body, 32px hero, tabular numeric values.
- Core components: thin borders, 16px cards, 20px composer, dark pill action.
- Page structure: sidebar plus a quiet reading canvas; Agents is the entry.
- Short prompt: Build a local investment research workspace with ChatGPT's
  readable shell and Rallies' agent/update organization. Follow these tokens,
  use original AIFi content, and implement all visible primary actions locally.

Validation note (2026-10-13): reviewed the rendered app in Chrome at desktop and
390px mobile widths, plus the actual Electron renderer. Keep financial tables
inside a scroll wrapper, wrap long user text, provide 40px mobile controls, and
restore the opening control's focus after dialogs. Still screenshots disable
motion so transient navigation colors are not mistaken for final states.
