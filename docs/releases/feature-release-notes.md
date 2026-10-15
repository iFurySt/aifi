# Feature Release Notes

## 2026-10

| Date | Area | User Impact | Change Summary |
| --- | --- | --- | --- |
| 2026-10-15 | Stock avatars | Scrolling prepares nearby logos before they enter the list viewport, without flashing temporary letters. | Fixed the inner-scroll observer root, separated pending/unavailable states, and decode/sample contrast before showing an image. |
| 2026-10-15 | Company logos | Previously loaded logos appear immediately when revisiting stocks; app restarts reuse local images. | Added bounded session caching and immediate disk reads with background refresh instead of waiting for remote images. |
| 2026-10-15 | App icon | AIFi now matches neighboring macOS Dock icons in apparent size. | Added a centered macOS-specific export with transparent inset; web and in-app marks keep their existing sizing. |
| 2026-10-14 | Branding | New three-part Logo across the workspace and AIFi desktop identity. | Added reusable color/background assets, theme-aware marks, browser icons and a named local macOS runtime. |
| 2026-10-14 | Company logos | Prefer reviewed company images, including shared logos for warrants/units, while retaining the existing provider fallback. | Added bundled catalog metadata, daily background checks, checksum validation and source-aware device caching. |
| 2026-10-14 | Stock browsing | Load more stocks by scrolling and see available company logos. | Removed page controls, clarified Nasdaq Trader source coverage, and added lazy device-cached PNG avatars with letter fallback. |
| 2026-10-13 | Stock source menu | View the active directory from Stocks without a footer label. | Added a heading dropdown with Nasdaq directory selected; desktop/mobile share the same menu. |
| 2026-10-13 | Stock directory | Search the full cached directory, browse paged securities and see source-backed names/exchanges in both apps. | Connected directory reads through a replaceable repository; added loading/error/retry states and kept market data explicitly sample-based. |
| 2026-10-13 | Data settings | Directory updates run with the app, with adjustable frequency and device-local source credentials. | Added app-owned Go scheduling and General/Appearance/Data sources/Sync/Storage settings, local encrypted credentials and preserved cached data. |
| 2026-10-13 | Directory collection | Collect and search a real US-listed security directory locally without an API key. | Added Go/Cobra sync/list/status, official Nasdaq files, atomic SQLite snapshots, provenance and failure recovery. The renderer remains sample-based. |
| 2026-10-13 | Stocks | Browse stocks from the inner sidebar and review six company tabs in Web/Electron. | Moved the app menu into the outer rail; added sample charts/financials and dataset-specific empty panels; kept saved chats available in Chat. |
| 2026-10-13 | Keyboard focus | Tab/Escape navigation now uses the app’s neutral styling throughout. | Removed blue focus outlines from the shared renderer and stock prototype; retained keyboard navigation and focus restoration. |
| 2026-10-13 | Workspace menu | A quieter sidebar with Settings and appearance available from the avatar. | Replaced sidebar footer rows with an avatar popup shared by Web/Electron and a mobile toolbar entry. |
| 2026-10-13 | App copy | Less reading across all six pages, with clearer actions and optional demo details. | Shortened titles, prompts, previews, and replies; removed internal roadmap/repository details; Settings now focuses on appearance and local data. |
| 2026-10-13 | App layout | A clearer window frame separates navigation from research, with an inset document panel and a collapsible sidebar. | Added a native desktop toolbar with back/forward and macOS window controls; Web/mobile retain compatible shared layouts. |
| 2026-10-12 | Local app | Preview a coherent research workspace in Web and Electron, create demo agents, keep a watchlist, and explore sample research and portfolio views. | Added a shared React/Tailwind renderer, six pages, local persistence, light/dark themes, and design documentation. Live AI, broker access, and background monitoring remain planned. |

## 2026-05

| Date | Area | User Impact | Change Summary |
| --- | --- | --- | --- |
| 2026-05-11 | Skills | Agents can now create and validate charts, analysis figures, browser-native interactive charts, text diagrams, and Sankey-style flow visuals from research data. | Added `chart-visualization` with a TOC-style entry point, lazy-loaded method references, and a dependency-free example renderer. |

## 2026-04

| Date | Area | User Impact | Change Summary |
| --- | --- | --- | --- |
| 2026-04-08 | Template | Introduced the base harness repository template for future services and products. | Added agent entry docs, execution-plan scaffolding, change-history templates, and docs checks. |
