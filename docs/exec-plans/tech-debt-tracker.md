# Tech Debt Tracker

Track known debt that is real enough to preserve but not urgent enough to block the current task.

| Date | Area | Debt | Why It Exists | Planned Follow-Up |
| --- | --- | --- | --- | --- |
| 2026-10-13 | Local persistence | Separate browser/desktop workspaces; no multi-window reconciliation, backup, or schema migration. | First preview uses bounded local storage. | Choose the durable artifact store before live research; add migration and conflict behavior. |
| 2026-10-13 | Desktop distribution | macOS launch verified; Windows/Linux native checks and signed installers are pending. | This milestone establishes the local shared renderer. | Add platform smoke coverage, packaging, signing, and update policy before distribution. |
| 2026-10-13 | Research execution | Demo chats/checks do not execute repository skills or retrieve sources. | UI review precedes provider and runner integration. | Define sourced artifact/runner contracts before connecting ChatGPT or brokers. |
| 2026-10-13 | Stock identity | Some directory symbols can be browsed but do not fit saved watchlist grammar; aliases and security type/company enrichment are pending. | Preserve schema v1 and source notation without heuristic type/identity inference. | Design watchlist migration and explicit source alias/identity mapping before wider datasets. |
