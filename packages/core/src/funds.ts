import type { ResearchDatasetView, ResearchRecord } from "./stock-research";
export type HolderKind = "institution" | "fund";
export type FundPosition =
  "New" | "Added" | "Reduced" | "Same" | "Exited" | "Unknown";
export interface FundHolding {
  id: string;
  name: string;
  kind: HolderKind;
  date: string;
  shares: number;
  value?: number;
  ownershipPercent?: number;
  changePercent?: number;
  changeShares?: number;
  position: FundPosition;
  current: boolean;
  observedAt?: string;
}
export interface FundHistory {
  id: string;
  name: string;
  kind: HolderKind;
  points: FundHolding[];
  latest: FundHolding;
}
const number = (value: unknown): number | undefined => {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim()))
    return;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};
const text = (r: ResearchRecord, ...keys: string[]) => {
  for (const key of keys)
    if (typeof r[key] === "string" && r[key].trim()) return r[key].trim();
  return "";
};
const date = (raw: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
  Number.isFinite(Date.parse(raw)) &&
  new Date(raw).toISOString().slice(0, 10) === raw;
export function fundHistories(view?: ResearchDatasetView): FundHistory[] {
  const rows = new Map<string, Map<string, FundHolding>>();
  for (const r of view?.data.records ?? []) {
    const normalized = r.recordKind === "holding";
    const name = text(r, "name", "investorName");
    const reportDate = text(r, "reportDate", "date") || view?.data.window || "";
    const shares = number(r.shares ?? r.sharesNumber);
    if (
      !name ||
      name.length > 512 ||
      !date(reportDate) ||
      shares === undefined ||
      shares < 0
    )
      continue;
    const kind: HolderKind = r.holderKind === "fund" ? "fund" : "institution";
    const holder =
      text(r, "holderId") || name.toLowerCase().replace(/\s+/g, " ");
    const id = `${kind}:${holder}`;
    const current = r.current !== false;
    const changePercent = number(r.changePercent);
    const changeShares = number(
      r.changeShares ?? r.changeInSharesNumber ?? r.sharesNumberChange,
    );
    const change = changeShares ?? changePercent;
    // A missing top-ten entry is never proof of an exit/new position.
    const position: FundPosition = !current
      ? "Unknown"
      : r.isSoldOut === true && shares === 0
        ? "Exited"
        : r.isNew === true && shares > 0
          ? "New"
          : change === undefined
            ? "Unknown"
            : change > 0
              ? "Added"
              : change < 0
                ? "Reduced"
                : "Same";
    const value = number(r.value ?? r.marketValue);
    const ownership = number(r.ownershipPercent);
    const point: FundHolding = {
      id,
      name,
      kind,
      date: reportDate,
      shares,
      current,
      position,
      ...(value !== undefined && value >= 0 ? { value } : {}),
      ...(ownership !== undefined && ownership >= 0
        ? { ownershipPercent: ownership }
        : {}),
      ...(changePercent !== undefined ? { changePercent } : {}),
      ...(changeShares !== undefined ? { changeShares } : {}),
      ...(normalized && text(r, "observedAt")
        ? { observedAt: text(r, "observedAt") }
        : {}),
    };
    const points = rows.get(id) ?? new Map<string, FundHolding>();
    const old = points.get(reportDate);
    if (!old || (point.observedAt ?? "") >= (old.observedAt ?? ""))
      points.set(reportDate, point);
    rows.set(id, points);
  }
  return [...rows]
    .map(([id, map]) => {
      const points = [...map.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20);
      const latest = points[0];
      return { id, name: latest.name, kind: latest.kind, points, latest };
    })
    .sort(
      (a, b) =>
        Number(b.latest.current) - Number(a.latest.current) ||
        b.latest.shares - a.latest.shares ||
        a.name.localeCompare(b.name),
    );
}
export function fundPeriods(rows: FundHistory[]): string[] {
  return [...new Set(rows.flatMap((r) => r.points.map((p) => p.date)))]
    .sort()
    .reverse()
    .slice(0, 20);
}
export function holdingPeriodLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const quarterEnd =
    month % 3 === 0 && day === new Date(Date.UTC(year, month, 0)).getUTCDate();
  return quarterEnd
    ? `Q${month / 3} ${year}`
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(date));
}
