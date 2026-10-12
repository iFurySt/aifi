# Local Web and Electron Foundation

## Goal

Create a runnable local investment research app with one React renderer shared
by browser and Electron. Establish the directory boundaries and a coherent,
responsive interface with representative demo data before live integrations.

## Scope

- In scope: React/TypeScript/Tailwind, Electron shell, local demo persistence,
  Agents, Research, Watchlist, Portfolio, Library, Settings, light/dark themes.
- Out of scope: cloud services, live model calls, OAuth, brokers, trading,
  background monitoring, signed installers, and a Go binary without a real need.

## Context

- References: Rallies Agents and ChatGPT; root DESIGN.md defines AIFi's adaptation.
- Existing research archive and skills remain independent of the runtime.
- UI development and validation take place in an isolated worktree.

## Risks

- Reference access differs by browser: inspect the rendered Agents route through
  the requested Chrome Default profile with OBU; avoid private account content.
- Mock data could imply real execution: expose demo mode and preview labels.
- Electron could gain unnecessary privileges: isolate renderer, sandbox preload,
  and expose only narrow runtime metadata.

## Milestones

1. Commit and push the prior research archive.
2. Commit and push design, workspace layout, and runnable shared renderer shell.
3. Commit and push the complete demo workspace and local interactions.
4. Validate browser/mobile/Electron, complete docs, and push final refinements.

## Validation

- Repository checks, TypeScript, domain tests, and production builds via make ci.
- Browser creation, filters, persistence, chat, watchlist, theme, and navigation.
- Representative desktop/mobile layouts and an actual Electron launch.
- Electron smoke path checks successful renderer loading and captures a preview.

## Progress Log

- [x] Prior research committed and pushed as 3eae982.
- [x] Inspected accessible reference surfaces and adjacent design collection.
- [x] Shared runtime shell built and pushed as f7ab203.
- [x] Six demo pages and local interactions built; nine contract tests and basic
  Chrome interaction checks passed before milestone push.
- [ ] Visual/functional validation, documentation, and final push complete.

## Decision Log

- 2026-10-12: Use pnpm workspaces, Vite, React, TypeScript, and Tailwind. Use Radix
  for accessible overlays/menus and Lucide for icons; own the visual primitives.
- 2026-10-12: Electron loads the Web renderer's build. Keep domain models and
  platform capabilities outside UI packages. Reserve Go/Cobra for a future host
  capability that cannot be satisfied by the current local runtime.
