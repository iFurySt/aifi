# Keyless daily prices

Status: completed, 2026-10-16.

Goal: a fresh local install can collect real daily US prices without an API key.
Yahoo's public chart endpoint returned AAPL/MSFT data in host probes; Stooq
returned browser verification rather than CSV. Yahoo is an unofficial personal
research source, with no availability or universal symbol coverage guarantee.

- [x] Add bounded Yahoo chart collector and explicit split-adjusted basis.
- [x] Queue all directory candidates; preserve budgets, SQLite, offline reads,
      source evidence and last-good data. Keep Massive selectable.
- [x] Update settings/source labels and regression tests.
- [x] Validate actual AAPL data through the app-owned service, restart app,
      document outcome and commit scoped changes.

Risks: throttling, symbol aliases (class shares/warrants), null sessions,
in-progress sessions, historical split restatements. Never request browser
cookies or present Yahoo split-adjusted OHLC as raw Massive bars.

Validation: 82 TypeScript tests, Go race/vet, CI, Electron smoke/interaction checks;
actual AAPL/MSFT/NVDA each persisted 501 EOD bars. Settings showed growing
coverage (97/7,482 at review), and coverage SQL was fixed to aggregate symbols
before joins after a live-load timeout exposed the former scaling bug.
