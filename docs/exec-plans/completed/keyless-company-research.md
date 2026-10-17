# Keyless company research

Status: completed, 2026-10-17.

Goal: collect usable company identity, financial statements and public filings
without API keys, persist evidence/snapshots in SQLite, keep all UI reads local.

- [x] Probe primary/public endpoints and inspect existing reference adapters.
- [x] Add verified Yahoo financial series and company identity adapters with
      explicit vendor periods and no invented filing dates/start dates.
- [x] Retain optional SEC filings/facts and expose contact/network gates.
      Follow-up contact setup on 2026-10-17 enabled successful official ingestion.
- [x] Queue all directory candidates; separate enrichment from price budgets so
      a directory-size initial backlog cannot starve higher-value datasets.
- [x] Verify persistence/offline/last-good semantics, source selection, UI and
      live AAPL data; document limitations and make scoped commits.

Initial probes: Yahoo timeseries/search 200 without cookies or keys. SEC public
submissions/companyfacts/mapping returned 403; requested honest contact email.
Yahoo quoteSummary 401. No browser cookies, fabricated identity or proxy bypass.

Outcome: all 7,482 candidates receive Yahoo company/facts/filing jobs. Live
AAPL/MSFT/NVDA each have 108 financial rows and company descriptions, with
80/83/81 recent filing index entries respectively. These are secondary indices,
not downloaded SEC filing bodies or complete historical archives.

Validation: 84 TypeScript tests, Go race/vet, repository CI and isolated Electron
interaction smoke passed; Chrome displayed sourced financial statements. Tests
exercise provider selection, cache reuse, changed-page last-good preservation,
queue fairness, explicit periods and offline restart reads.

Decision: public-page embedded JSON extraction avoids authenticated quoteSummary
and browser sessions. Yahoo is an unofficial personal-research source; page
changes/throttling remain possible. The subsequent user-provided contact was
saved locally and official SEC facts/filings were validated; no fabricated
identity, proxy or challenge bypass was added.

Follow-up: all three official API probes returned 200. Local source selection
now prefers SEC facts/filings; AAPL/MSFT/NVDA persisted 426/455/396 fact rows and
recent filing records. Fresh-install defaults remain Yahoo. The private contact
value is not recorded in this plan or any other tracked file.
