# Feature Release Notes

## 2026-10

| Date | Area | User Impact | Change Summary |
| --- | --- | --- | --- |
| 2026-10-18 | Politicians | Browse cached congressional disclosures by member, chamber and trade type. | Added keyless collection, disclosed ranges, count timeline, source links and ambiguity handling. |
| 2026-10-18 | Insiders | Review richer SEC history and reported holdings after each event. | Added configurable 40/120/240 filing backfill, signed chart, event scopes and amendment-safe totals. |
| 2026-10-18 | Analyst | Compare recommendations and historical firm targets. | Added recommendation radar, current/prior targets, signed upside and firm/action/date filters. |
| 2026-10-18 | Repository and license | Open the project repository from the account menu; AIFi is licensed under AGPLv3. | Added a safe external GitHub link and aligned LICENSE, READMEs, first-party manifests and contribution terms on AGPL-3.0-only. |
| 2026-10-17 | Fund history | Explore historical reported holdings with fund logos and quarterly comparisons. | Added keyless 13f.info backfill for 16 tracked managers, a selectable ownership ring, colored positions, reporting-period controls and locally cached catalog logos. |
| 2026-10-17 | Storage | See local data usage by category and find the largest files quickly. | Added file totals, SQLite allocation, directory summaries with individual files above 50 MB, instant cached re-entry with background refresh, desktop folder reveal and Web path copying. |
| 2026-10-17 | Responsive Stocks | Narrow windows give research more room; all company sections remain available. | Added automatic stock-list drawers, container-based chart/content reflow, compact headers/summaries and selected-tab reveal with retained chart/list state. |
| 2026-10-17 | Funds | Browse real top institutional/fund holders, select a holder and compare collected report dates. | Added keyless Yahoo ownership collection, bounded SQLite history, source/schedule settings, linked chart/table, filters and explicit sample coverage. |
| 2026-10-17 | Enriched Financials | Compare up to 20 collected quarters, expand financial statement groups and chart selected metrics. | Expanded keyless SEC/Yahoo collection to 64 standard concepts; added safe margins/YoY/FCF, persisted snapshot upgrades and explicit custom-KPI/valuation gaps. |
| 2026-10-17 | Workspace search and shortcuts | Search stays compact with scrollable single-line results; navigate with keyboard shortcuts. | Added bounded back/forward, sidebar toggle, desktop New chat, shortcut help and arrow/Enter search selection. |
| 2026-10-17 | Account and Settings | A tighter rail, larger account entry and compact Settings; Command/Ctrl+, opens Settings. | Reused ChatGPT sign-in and verified display identity; connected menus expose official Usage management without an invented quota. |
| 2026-10-17 | ChatGPT connection | Connect a ChatGPT plan in the desktop app and chat without an API key. | Added official dynamic OAuth, protected account sessions, model selection, streamed replies, cancellation and usage controls; verified real sign-in, replies and connection persistence after restart. |
| 2026-10-17 | Chart inspection and valuation | Hover or use arrow keys to inspect dated OHLC/volume in a dark crosshair tooltip; reported market cap is available where supplied. | Restored every daily volume/candle bar, switched to calendar ranges and mode-specific scales, centered return arrows and persisted source-reported company cap. |
| 2026-10-17 | Compact stock workspace | A tighter company/quote header, unified global search and automatically advancing exchange-local time. | Added tab and toolbar dividers, adjacent page-specific breadcrumb icons and an independent clock; stored quote timestamps remain in source details. |
| 2026-10-17 | Stock research details | Cleaner source citations, compact ticker tags, financial colors, earnings dot comparisons and related stocks. | Moved static after-hours quotes into dated source details; added expandable provider chips and persisted keyless related-stock collection with local quote reads. |
| 2026-10-17 | Quotes and outlook | Company names are shorter, completed-session prices refresh after close, and Analyst/Earnings show collected data without a key. | Separated regular/after-hours quotes and source times; added analyst consensus/ratings/grades and GAAP EPS estimates/calendar through SQLite-backed collection. |
| 2026-10-17 | Keyless company research | Company profiles, annual/quarterly financials and recent SEC filing indices collect without API keys. | Added bounded Yahoo public-source collectors, SQLite persistence, independent source selection, fair dataset scheduling and short expandable company descriptions. Official SEC adapters remain optional. |
| 2026-10-16 | Keyless stock prices | Daily charts collect real data without entering an API key. | Added default Yahoo daily collection for all directory candidates, SQLite persistence, source/basis labels and selectable Massive access. Other datasets retain their own setup requirements. |
| 2026-10-15 | Stock research | Browse locally collected stock research across the directory and configure sources in dedicated API key settings. | Added durable background price, company, financial, filing and activity collection; six tabs and Watchlist read SQLite. Missing credentials/permissions stay explicit; live coverage grows after configuration. |
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
