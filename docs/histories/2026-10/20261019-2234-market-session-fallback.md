## [2026-10-19 22:34] | Task: Correct market status with stale saved prices

### Execution Context

- Agent ID: `/root`
- Base Model: GPT-6
- Runtime: Codex desktop

### User Query

> AAPL is trading, but the App says Market status unavailable. Make this robust.

### Changes Overview

- Separated regular-session status from quote freshness. A saved Friday price
  no longer prevents Monday's scheduled Market Open.
- Added the reviewed 2026–2028 US equity holiday/early-close calendar using
  America/New_York, plus validated current provider exceptions. Invalid, expired
  and future evidence cannot suppress the calendar fallback. Unreviewed future
  years remain explicit rather than assuming holidays.
- Added the status basis to existing hover/source details. Minute-aligned clock
  updates recover immediately on focus and visibility changes after sleep.
- Added core and isolated renderer regressions; corrected the existing test that
  had encoded the stale-price/unavailable bug.

### Design Intent

The market's scheduled session and a stored price's observation date are separate
facts. Calendar fallback must not imply streaming quotes or initiate collection.
Provider observations can describe an exceptional session, while a bounded
official calendar supplies the normal missing-data fallback.

### Verification

- Independent staged snapshot: `pnpm check`, production web build, 20 core
  market-session/research tests, `pnpm smoke:market-session` and existing
  `pnpm smoke:stock-activity` passed.
- Renderer covers stale Friday quotes on Monday, exact open/early-close minute
  transitions, holidays, DST and wake recovery without changing prices or
  invoking collection. Core tests include all reviewed holidays/early closes,
  delayed provider sessions, malformed/future/expired metadata and calendar limits.
- Refreshed the actual App at 10:32 EDT on 2026-10-19. AAPL displays Market Open
  and retains its stored $343.46 quote.

### Files Modified

- `packages/core/src/market-session.ts` and corresponding tests
- `packages/core/src/stock-research.ts` and corresponding tests
- `packages/ui/src/use-exchange-time.ts`
- `packages/ui/src/components/ExchangeClock.tsx`
- `packages/ui/src/pages/Stocks.tsx`
- `scripts/check-market-session.mjs` and its isolated renderer fixture
- `package.json`, `docs/FRONTEND.md`, calendar reference and completed execution plan
