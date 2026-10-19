# US equity regular-session calendar

Reviewed 2026-10-19 against the [NYSE hours and calendars](https://www.nyse.com/trade/hours-calendars)
and [Nasdaq holiday schedule](https://www.nasdaq.com/market-activity/stock-market-holiday-schedule).
NYSE publishes the 2026–2028 calendar; Nasdaq's 2026 schedule cross-checks the
current year. These are equity regular sessions, not options or extended hours.

## Runtime contract

`packages/core/src/market-session.ts` determines scheduled market status separately
from quote freshness. A Friday price can coexist with Monday's Market Open. The
price and its source timestamp are never advanced by the calendar or clock.

- Use `America/New_York`, including DST, for the date and 09:30–16:00 session.
- Close on weekends and the explicit reviewed 2026–2028 holiday dates.
- Close at 13:00 ET on 2026-11-27, 2026-12-24, 2027-11-26, 2028-07-03 and
  2028-11-24. December 31, 2027 remains open: NYSE does not observe the following
  Saturday's New Year's Day on that Friday. Bank holidays are not automatically
  equity-market holidays.
- Current-day validated provider session bounds may shorten or delay the regular
  session. Recognized provider states collected within five minutes can report a
  current exception within scheduled trading hours, even if the price is older.
  Ignore stale, invalid and future observations/session bounds. A provider Open
  never overrides a reviewed holiday, weekend or regular-session closed hours.
- Without usable provider evidence, use the reviewed calendar. Do not extrapolate
  holidays beyond 2028; inside regular hours an unreviewed year is unavailable.
  Extend the reviewed horizon with official dates and corresponding tests.

The calendar fallback describes the scheduled session; it is not an exchange halt
feed. The status title and existing quote-source popup expose its basis. It does
not initiate collection, network requests or price updates. The renderer updates
at minute boundaries and immediately on focus/visibility recovery after sleep.

## Regression gates

Run the core market-session and stock-research tests plus
`pnpm smoke:market-session`. The isolated renderer gate covers old Friday prices
on Monday, automatic open/early-close boundaries, holidays, DST and focus recovery,
while asserting unchanged prices and no collection. No real accounts are used.
