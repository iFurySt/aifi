/** US equity regular sessions. Calendar references/review horizon live in
 * docs/references/us-equity-market-calendar.md. No quote-price freshness dependency. */
export interface MarketSessionEvidence {
  asOf: string;
  fetchedAt: string;
  state?: string;
  sessionStart?: number;
  sessionEnd?: number;
}
export interface MarketSessionStatus {
  status: "Market Open" | "Market Closed" | "Market status unavailable";
  basis: "calendar" | "provider-session" | "provider-state" | "unavailable";
  detail: string;
}
const exchangeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function exchangeTime(time: number) {
  if (!Number.isFinite(time) || !Number.isFinite(new Date(time).getTime()))
    return undefined;
  const parts = exchangeFormatter.formatToParts(time);
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    year: Number(get("year")),
    weekday: get("weekday"),
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}
export const newYorkSessionDate = (time: number) => exchangeTime(time)?.date;
// Published NYSE 2026–2028 equity calendar, cross-checked with Nasdaq 2026.
// In particular: 2027-12-31 is OPEN (New Year's Day 2028 is on Saturday).
const holidays = new Set([
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
  "2028-01-17",
  "2028-02-21",
  "2028-04-14",
  "2028-05-29",
  "2028-06-19",
  "2028-07-04",
  "2028-09-04",
  "2028-11-23",
  "2028-12-25",
]);
const earlyCloses = new Set([
  "2026-11-27",
  "2026-12-24",
  "2027-11-26",
  "2028-07-03",
  "2028-11-24",
]);
const result = (
  open: boolean,
  basis: MarketSessionStatus["basis"],
  detail: string,
): MarketSessionStatus => ({
  status: open ? "Market Open" : "Market Closed",
  basis,
  detail,
});
const unknown = (): MarketSessionStatus => ({
  status: "Market status unavailable",
  basis: "unavailable",
  detail: "No reviewed trading calendar or current session evidence",
});
const label = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export function usEquityMarketStatus(
  now = Date.now(),
  evidence: readonly MarketSessionEvidence[] = [],
): MarketSessionStatus {
  const local = exchangeTime(now);
  if (!local) return unknown();
  if (["Sat", "Sun"].includes(local.weekday))
    return result(false, "calendar", "Weekend · America/New_York");
  if (holidays.has(local.date))
    return result(false, "calendar", "Exchange holiday · NYSE/Nasdaq calendar");
  const reviewed = local.year >= 2026 && local.year <= 2028;
  const close = earlyCloses.has(local.date) ? 780 : 960;
  if (local.minute < 570 || local.minute >= close)
    return result(
      false,
      "calendar",
      `${earlyCloses.has(local.date) ? "Early close" : "Regular session"} · ${label(570)}–${label(close)} ET`,
    );
  const records = evidence
    .filter((q) => {
      const collected = Date.parse(q.fetchedAt),
        observed = Date.parse(q.asOf);
      return (
        Number.isFinite(collected) &&
        collected <= now &&
        now - collected <= 36 * 3600000 &&
        Number.isFinite(observed) &&
        observed <= now
      );
    })
    .sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt));
  const session = records.find((q) => {
    if (
      !Number.isSafeInteger(q.sessionStart) ||
      !Number.isSafeInteger(q.sessionEnd)
    )
      return false;
    const start = exchangeTime(q.sessionStart! * 1000),
      end = exchangeTime(q.sessionEnd! * 1000);
    return (
      start?.date === local.date &&
      end?.date === local.date &&
      start.minute >= 570 &&
      end.minute <= 960 &&
      start.minute < end.minute
    );
  });
  if (
    session &&
    (now < session.sessionStart! * 1000 || now >= session.sessionEnd! * 1000)
  )
    return result(
      false,
      "provider-session",
      "Outside the provider's current regular session · America/New_York",
    );
  const freshState = records.find(
    (q) =>
      now - Date.parse(q.fetchedAt) <= 5 * 60000 &&
      ["REGULAR", "CLOSED", "PRE", "PREPRE", "POST", "POSTPOST"].includes(
        q.state?.trim().toUpperCase() ?? "",
      ),
  );
  if (freshState)
    return result(
      freshState.state!.trim().toUpperCase() === "REGULAR",
      "provider-state",
      "Recent provider market state · Regular session",
    );
  if (session)
    return result(
      true,
      "provider-session",
      "Provider's current regular session · America/New_York",
    );
  if (!reviewed) return unknown();
  return result(
    true,
    "calendar",
    `NYSE/Nasdaq regular-session schedule · ${label(570)}–${label(close)} ET`,
  );
}
