# Robust US equity market status

Completed 2026-10-19.

## Root cause
The header requires a quote/session for today's date to display Open. Stale Friday
prices on Monday therefore suppress a determinable current exchange schedule.
The existing regression explicitly expects this incorrect unavailable state.

## Scope and decisions
- Separate regular-session status from saved price freshness. Use reviewed US
  equity holidays/early closes and America/New_York with DST, independently of
  quotes. Retain genuine current provider exceptions, ignoring stale/future data.
- Calendar fallback is scheduled status, not a live halt feed or current price.
  Explain its basis in existing source details/title rather than extra body copy.
- Sync the exchange clock at minute boundaries, on focus and visibility changes.
- Keep source collection/read boundaries unchanged; no provider fetch on navigation.

## Verification
- Monday with old/no quote, opening/closing exact boundaries, DST, holidays,
  observed holiday exceptions and early closes; valid/malformed/future/expired
  provider evidence and unsupported calendar years.
- Renderer transitions at open/close and after sleep without refresh; quote value/
  timestamp unchanged. Native AAPL review at current exchange time.
- TypeScript/build, existing research/clock/UI tests and scoped snapshot checks.

## Outcome
- Implemented a reviewed 2026–2028 NYSE equity calendar, cross-checked against
  Nasdaq 2026, with validated current provider exceptions and explicit basis.
- Shared minute-boundary/focus/visibility clock updates keep status and the
  displayed exchange time synchronized without collection or quote changes.
- An isolated staged snapshot passed TypeScript, production web build, 20 core
  tests, the new market-session renderer gate and existing stock-activity gate.
- Refreshed the actual App on Monday 2026-10-19 at 10:32 EDT: AAPL now displays
  Market Open while preserving its stored $343.46 quote.
