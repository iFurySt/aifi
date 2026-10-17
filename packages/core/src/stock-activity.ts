import type { ResearchDatasetView, ResearchRecord } from "./stock-research";
export type TradeSide = "buy" | "sell" | "other";
export interface PoliticalTrade {
  id: string;
  name: string;
  date: string;
  filed?: string;
  side: TradeSide;
  amount: string;
  min?: number;
  max?: number;
  owner?: string;
  chamber?: string;
  party?: string;
  asset?: string;
  url?: string;
  ambiguous: boolean;
}
export const activityNumber = (v: unknown): number | undefined => {
  if (typeof v !== "number" && (typeof v !== "string" || !v.trim())) return;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
export const activityDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const text = (r: ResearchRecord, ...keys: string[]) => {
  for (const k of keys)
    if (typeof r[k] === "string" && r[k].trim()) return r[k].trim();
  return "";
};
export function disclosureURL(raw: unknown): string | undefined {
  if (typeof raw !== "string") return;
  try {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      u.search ||
      u.hash
    )
      return;
    if (
      (u.hostname === "disclosures-clerk.house.gov" &&
        /^\/public_disc\/ptr-pdfs\/20\d{2}\/\d+\.pdf$/.test(u.pathname)) ||
      (u.hostname === "efdsearch.senate.gov" &&
        /^\/search\/view\/ptr\/[a-fA-F0-9-]{36}\/?$/.test(u.pathname))
    )
      return raw;
  } catch {}
  return;
}
export function politicalTrades(view?: ResearchDatasetView): PoliticalTrade[] {
  const rows: PoliticalTrade[] = [];
  for (const [i, r] of (view?.data.records ?? []).entries()) {
    const name =
      text(r, "name") ||
      [text(r, "firstName"), text(r, "lastName")].filter(Boolean).join(" ");
    const date = text(r, "transactionDate"),
      filed = text(r, "disclosureDate");
    if (!name || !activityDate(date)) continue;
    const rawSide = text(r, "type", "transactionType");
    const side: TradeSide = /^buy$|purchase/i.test(rawSide)
      ? "buy"
      : /^sell$|sale/i.test(rawSide)
        ? "sell"
        : "other";
    const amount = text(r, "amount");
    let min = activityNumber(r.amountMin),
      max = activityNumber(r.amountMax);
    const match = /^\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)$/.exec(amount);
    if (match && min === undefined && max === undefined) {
      min = Number(match[1]!.replaceAll(",", ""));
      max = Number(match[2]!.replaceAll(",", ""));
    }
    if (min === undefined || max === undefined || min < 0 || max < min) {
      min = max = undefined;
    }
    rows.push({
      id: text(r, "id") || `${name}:${date}:${i}`,
      name,
      date,
      filed: activityDate(filed) ? filed : undefined,
      side,
      amount: amount || "—",
      min,
      max,
      owner: text(r, "owner") || undefined,
      chamber:
        text(r, "chamber") ||
        (/house/.test(text(r, "recordKind"))
          ? "house"
          : /senate/.test(text(r, "recordKind"))
            ? "senate"
            : undefined),
      party: text(r, "party") || undefined,
      asset: text(r, "asset") || undefined,
      url: disclosureURL(r.url ?? r.link),
      ambiguous: r.ambiguousDuplicate === true,
    });
  }
  return rows.sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
  );
}
export interface ActivityPoint {
  date: string;
  buy: number;
  sell: number;
  net: number;
  count: number;
}
export function activityPoints(
  rows: { date: string; side: TradeSide; value?: number; excluded?: boolean }[],
  mode: "count" | "value",
): ActivityPoint[] {
  const dates = new Set(rows.filter((r) => !r.excluded).map((r) => r.date));
  const month = dates.size > 60;
  const buckets = new Map<string, ActivityPoint>();
  for (const r of rows) {
    if (r.excluded || r.side === "other" || !activityDate(r.date)) continue;
    const value = mode === "count" ? 1 : r.value;
    if (value === undefined || value < 0 || !Number.isFinite(value)) continue;
    const date = month ? r.date.slice(0, 7) + "-01" : r.date;
    const b = buckets.get(date) ?? { date, buy: 0, sell: 0, net: 0, count: 0 };
    b[r.side] += value;
    b.count++;
    buckets.set(date, b);
  }
  let net = 0;
  return [...buckets.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ ...b, net: (net += b.buy - b.sell) }));
}
export function activityCutoff(range: string, asOf: string): string {
  if (range === "All") return "0000-00-00";
  const d = new Date(asOf);
  if (!Number.isFinite(+d)) return "9999-12-31";
  d.setUTCMonth(d.getUTCMonth() - (range === "6M" ? 6 : 12));
  return d.toISOString().slice(0, 10);
}

export interface InsiderTrade {
  id: string;
  name: string;
  role?: string;
  date: string;
  filed?: string;
  side: TradeSide;
  code: string;
  shares?: number;
  price?: number;
  value?: number;
  sharesAfter?: number;
  derivative: boolean;
  amendment: boolean;
  superseded: boolean;
  eligible: boolean;
  security?: string;
  ownership?: string;
  url?: string;
  plan: boolean;
}
const nonnegative = (raw: unknown) => {
  const n = activityNumber(raw);
  return n !== undefined && n >= 0 ? n : undefined;
};
export function insiderTrades(view?: ResearchDatasetView): InsiderTrade[] {
  const rows: InsiderTrade[] = [];
  for (const [i, r] of (view?.data.records ?? []).entries()) {
    const name = text(r, "name", "reportingName"),
      date = text(r, "date", "transactionDate");
    if (!name || !activityDate(date)) continue;
    const code = text(r, "code"),
      side: TradeSide = code === "P" ? "buy" : code === "S" ? "sell" : "other";
    const shares = nonnegative(r.shares),
      price = nonnegative(r.price),
      sharesAfter = nonnegative(r.sharesAfter);
    const derivative = r.securityKind === "derivative",
      amendment = r.amendment === true,
      superseded = r.superseded === true;
    const direction = text(r, "direction");
    const eligible =
      !derivative &&
      !amendment &&
      !superseded &&
      side !== "other" &&
      ((side === "buy" && direction === "A") ||
        (side === "sell" && direction === "D"));
    const rawValue =
      shares !== undefined && price !== undefined ? shares * price : undefined;
    const value =
      rawValue !== undefined && Number.isFinite(rawValue)
        ? rawValue
        : undefined;
    let url: string | undefined;
    try {
      const u = new URL(text(r, "url"));
      if (
        u.protocol === "https:" &&
        u.hostname === "www.sec.gov" &&
        !u.username &&
        !u.password &&
        !u.port &&
        !u.search &&
        !u.hash &&
        /^\/Archives\/edgar\/data\/\d+\/\d{18}\/(?:xslF345X\d+\/)?[a-zA-Z0-9_.-]+\.xml$/.test(
          u.pathname,
        )
      )
        url = u.href;
    } catch {}
    const filed = text(r, "filed");
    rows.push({
      id: text(r, "id") || `${r.accession}:${r.securityKind}:${r.row ?? i}`,
      name,
      role: text(r, "role") || undefined,
      date,
      filed: activityDate(filed) ? filed : undefined,
      side,
      code,
      shares,
      price,
      value,
      sharesAfter,
      derivative,
      amendment,
      superseded,
      eligible,
      security: text(r, "security") || undefined,
      ownership: text(r, "ownership") || undefined,
      url,
      plan: r.plan10b5 === true,
    });
  }
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.filed ?? "").localeCompare(a.filed ?? "") ||
      a.id.localeCompare(b.id),
  );
}
export const insiderCodeLabel = (code: string) =>
  ({
    P: "Purchase",
    S: "Sale",
    A: "Award",
    M: "Exercise",
    F: "Tax withholding",
    G: "Gift",
    C: "Conversion",
    D: "Disposition",
    J: "Other",
    K: "Equity swap",
    U: "Tender",
    W: "Inheritance",
    X: "Exercise",
  })[code] ??
  (code || "Other");
