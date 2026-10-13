# Frontend Guide

The local workspace uses React, TypeScript, Tailwind CSS, and Vite. Electron
loads the same renderer; there is no second desktop UI or cloud backend.

## Local Commands

Use Node 24+ and pnpm 10.13.1:

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
No environment variables are required. The desktop launcher sets AIFI_DEV_URL
internally to the one allowed development origin; production leaves it unset.

## Boundaries

- apps/web: HTML/bootstrap and Vite configuration.
- apps/desktop: sandboxed Electron main/preload and narrow host metadata.
- packages/ui: shared components, page layouts, and design tokens.
- packages/core: platform-independent domain contracts and demo data rules.
- packages/platform: browser/local storage and desktop capability adaptation.
- apps/cli: documented future Go/Cobra direction; no binary exists yet.

Root DESIGN.md defines the visual system. Use Radix for dialog/menu accessibility
and Lucide for icons. Avoid a large visual component library and duplicate page
trees. Fonts and icons are local; no remote font or telemetry service is required.

## Verification

make ci runs repository gates, TypeScript, nine domain/storage tests, and both
production builds. Use the local
app for desktop and mobile visual checks. Validate the actual Electron renderer,
not only the browser build, before claiming desktop support.

Work in an isolated checkout for UI verification. Screenshots and smoke output
belong in the ignored .artifacts directory unless curated into documentation.

## Local Demo Behavior

Agents can be created, filtered, paused/resumed, deleted, and given an explicit
preview. Research conversations contain deterministic illustrative responses.
Watchlists support adding/removing symbols; unknown symbols have no invented
quote. Portfolio numbers and charts are fixed examples. Library cards preview
existing repository skills without executing them. Settings controls theme and
local reset. A single Demo toolbar entry explains the sample-mode limits on
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
and returns to Agents. It also checks the framed desktop toolbar, sidebar collapse,
back/forward bounds, and forward-history invalidation after a new route. It exits with a nonzero status on failure or timeout.
Evidence is written to .artifacts/electron-smoke.json and aifi-electron.png.
The smoke profile is removed on normal exit; no personal workspace is used.

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

The outer neutral frame owns a 56px tool rail. A single rounded inset panel holds
the 248px sidebar and document. Only main content scrolls; the frame, toolbar, and
sidebar stay in place. Collapsing the sidebar expands the document. At tablet
widths navigation becomes a drawer; mobile hides the rail and keeps an 8px inset.

Electron renders a 48px draggable outer toolbar. macOS uses real native traffic
lights at x=14/y=17, with reserved space before back/forward and sidebar controls.
Controls, menus, and dialogs are no-drag. App back/forward is bounded to the
current route session, including same-hash traversal; a new route truncates the
forward branch. No new host privileges or IPC methods are required.

Web relies on browser window controls and places a 52px page toolbar inside the
workspace panel. Both hosts share the rail, sidebar, pages, theme, and shell CSS.
The refinement was checked against the user-provided Codex/ChatGPT screenshots,
using OBU in Chrome Default for Web and the real macOS Electron window for native
controls. Native close/minimize/full-screen controls remain owned by the OS.

The sidebar contains navigation and recent research only. The outer-rail avatar
opens the shared Radix workspace menu for Settings and theme switching. Below
600px the rail is hidden and the same menu appears in the page toolbar. Check
keyboard selection, Escape/focus return, outside dismissal, popup viewport bounds,
and settings access with the sidebar collapsed as well as on mobile.

The avatar's keyboard focus uses its neutral background instead of the global
blue outline. Escape still returns focus to the trigger, allowing immediate
keyboard reopening; other controls keep their standard focus indicator.
