import type {
  ResearchDatasetView,
  ResearchRecord,
  StockResearch,
} from "./stock-research";
import { activityDate, activityNumber } from "./stock-activity";
const text = (r: ResearchRecord, ...keys: string[]) => {
  for (const k of keys)
    if (typeof r[k] === "string" && r[k].trim()) return r[k].trim();
  return "";
};
const positive = (raw: unknown) => {
  const n = activityNumber(raw);
  return n !== undefined && n > 0 ? n : undefined;
};
export const ratingKeys = [
  "strongBuy",
  "buy",
  "hold",
  "sell",
  "strongSell",
] as const;
export const ratingLabels = [
  "Strong buy",
  "Buy",
  "Hold",
  "Sell",
  "Strong sell",
] as const;
export function analystDistribution(view?: ResearchDatasetView) {
  const r = view?.data.records?.find(
    (r) =>
      r.recordKind === "recommendations" &&
      (r.period === "0m" || r.period === undefined),
  );
  if (!r) return;
  const counts = ratingKeys.map((k) => {
    const n = activityNumber(r[k]);
    return n !== undefined && Number.isInteger(n) && n >= 0 ? n : undefined;
  });
  if (counts.some((n) => n === undefined)) return;
  const values = counts as number[];
  return { counts: values, total: values.reduce((a, b) => a + b, 0) };
}
export function analystConsensus(view?: ResearchDatasetView) {
  const r = view?.data.records?.find(
    (r) => r.recordKind === "price-target-consensus",
  );
  return {
    mean: positive(r?.targetConsensus),
    median: positive(r?.targetMedian),
    low: positive(r?.targetLow),
    high: positive(r?.targetHigh),
    count: positive(r?.analystCount),
    rating: r ? text(r, "recommendation").replaceAll("_", " ") : "",
    score: positive(r?.recommendationMean),
  };
}
export function analystReference(data: StockResearch) {
  const daily = data.bars.at(-1);
  const market = data.datasets.prices?.data.quote;
  const analysis = data.datasets.analyst?.data.quote;
  const quotes = [market, analysis]
    .filter((q) => q && positive(q.price))
    .sort((a, b) => b!.asOf.localeCompare(a!.asOf));
  const quote = quotes[0];
  if (daily && (!quote || quote.asOf.slice(0, 10) < daily.date))
    return { price: daily.close, asOf: daily.date };
  return quote
    ? { price: quote.price, asOf: quote.asOf }
    : daily
      ? { price: daily.close, asOf: daily.date }
      : undefined;
}
export interface AnalystEvent {
  id: string;
  date: string;
  firm: string;
  analyst?: string;
  action: string;
  rating?: string;
  previousRating?: string;
  target?: number;
  priorTarget?: number;
  targetAction?: string;
  upside?: number;
}
export const analystAction = (raw: string) =>
  ({
    main: "Maintained",
    init: "Initiated",
    up: "Upgraded",
    down: "Downgraded",
    reit: "Reiterated",
    res: "Resumed",
    drop: "Dropped",
  })[raw] ??
  (raw || "—");
export function analystEvents(
  view?: ResearchDatasetView,
  price?: number,
): AnalystEvent[] {
  const out: AnalystEvent[] = [];
  for (const [i, r] of (view?.data.records ?? []).entries()) {
    if (r.recordKind !== "grades") continue;
    const date = text(r, "date"),
      firm = text(r, "gradingCompany", "firm");
    if (!firm || !activityDate(date)) continue;
    const target = positive(r.currentPriceTarget ?? r.priceTarget),
      priorTarget = positive(r.priorPriceTarget ?? r.previousPriceTarget);
    out.push({
      id: `${text(r, "publishedAt") || date}:${firm}:${i}`,
      date,
      firm,
      analyst: text(r, "analystName", "analyst") || undefined,
      action: analystAction(text(r, "action")),
      rating: text(r, "newGrade", "toGrade") || undefined,
      previousRating: text(r, "previousGrade", "fromGrade") || undefined,
      target,
      priorTarget,
      targetAction: text(r, "priceTargetAction") || undefined,
      upside:
        target !== undefined && price !== undefined && price > 0
          ? (target / price - 1) * 100
          : undefined,
    });
  }
  return out.sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
  );
}
