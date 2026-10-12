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
make ci
~~~

Web development binds to 127.0.0.1:5173. Run web development or desktop
development, not both on that port. Desktop development starts and owns Vite.
pnpm desktop loads the production renderer after pnpm build.

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
sample check. Research conversations contain deterministic illustrative responses.
Watchlists support adding/removing symbols; unknown symbols have no invented
quote. Portfolio numbers and charts are fixed examples. Library cards preview
existing repository skills without executing them. Settings controls theme and
local reset; provider cards describe future connections.

State is validated against schema v1 and saved under aifi.workspace.v1 in local
storage. Invalid saved data opens a temporary demo without overwriting the raw
value; reset is the explicit recovery action. Storage failures show a persistent
notice. Browser and Electron data are independent, with no synchronization.
