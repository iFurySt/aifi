import {
  financialSeries,
  type FinancialFact,
  type FinancialPoint,
} from "./stock-research";
import { financialMetric } from "./financial-definitions";
export type FinancialPeriod = "Yearly" | "Quarter";
const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000;

/** All calculations use one selected provider/currency and identical periods.
 * Missing operands stay missing; negative-base percentage growth is undefined. */
export function financialMetricSeries(
  facts: FinancialFact[],
  metric: string,
  period: FinancialPeriod,
): FinancialPoint[] {
  const raw = (id: string) => financialSeries(facts, id, period);
  const reported = raw(metric);
  const combine = (
    left: FinancialPoint[],
    right: FinancialPoint[],
    calculation: string,
    calculate: (a: number, b: number) => number | undefined,
  ) =>
    left.flatMap((a) => {
      const b = right.find(
        (b) => b.end === a.end && (a.start ?? "") === (b.start ?? ""),
      );
      if (!b) return [];
      const value = calculate(a.value, b.value);
      if (value === undefined || !Number.isFinite(value)) return [];
      return [
        {
          ...a,
          value,
          derived: true,
          calculation,
          filed: a.filed > b.filed ? a.filed : b.filed,
          accession: [
            ...new Set([a.accession, b.accession].filter(Boolean)),
          ].join(", "),
        },
      ];
    });
  const subtract = (left: string, right: string) =>
    combine(
      raw(left),
      raw(right),
      `${financialMetric(left)?.label} − ${financialMetric(right)?.label}`,
      (a, b) => a - b,
    );
  let calculated: FinancialPoint[] = [];
  if (metric === "freeCashFlow")
    calculated = subtract("operatingCashFlow", "capex");
  if (metric === "costOfRevenue")
    calculated = subtract("revenue", "grossProfit");
  if (metric === "grossProfit")
    calculated = subtract("revenue", "costOfRevenue");
  if (metric === "operatingExpenses")
    calculated = subtract("grossProfit", "operatingIncome");
  if (metric === "nonOperatingIncome")
    calculated = subtract("pretaxIncome", "operatingIncome");
  if (metric === "noncurrentAssets")
    calculated = subtract("assets", "currentAssets");
  if (metric === "noncurrentLiabilities")
    calculated = subtract("liabilities", "currentLiabilities");
  const ratios: Record<string, [string, string]> = {
    grossMargin: ["grossProfit", "revenue"],
    netMargin: ["netIncome", "revenue"],
    operatingMargin: ["operatingIncome", "revenue"],
    researchToRevenue: ["researchAndDevelopment", "revenue"],
    freeCashFlowMargin: ["freeCashFlow", "revenue"],
    currentRatio: ["currentAssets", "currentLiabilities"],
  };
  if (ratios[metric]) {
    const [a, b] = ratios[metric]!;
    calculated = combine(
      financialMetricSeries(facts, a, period),
      raw(b),
      `${financialMetric(a)?.label} / ${financialMetric(b)?.label}`,
      (a, b) =>
        b > 0 ? (a / b) * (metric === "currentRatio" ? 1 : 100) : undefined,
    );
  }
  if (metric === "revenueGrowth" || metric === "netIncomeGrowth") {
    const id = metric === "revenueGrowth" ? "revenue" : "netIncome";
    const rows = raw(id);
    calculated = rows.flatMap((current) => {
      const prior = rows
        .filter(
          (p) =>
            day(current.end) - day(p.end) >= 330 &&
            day(current.end) - day(p.end) <= 380,
        )
        .sort(
          (a, b) =>
            Math.abs(day(current.end) - day(a.end) - 365) -
            Math.abs(day(current.end) - day(b.end) - 365),
        )[0];
      if (!prior || prior.value <= 0) return [];
      return [
        {
          ...current,
          value: (current.value / prior.value - 1) * 100,
          derived: true,
          calculation: `Year-over-year change · comparison ${prior.end}`,
        },
      ];
    });
  }
  const points = new Map(calculated.map((p) => [p.end, p]));
  for (const point of reported) points.set(point.end, point);
  return [...points.values()].sort((a, b) => b.end.localeCompare(a.end));
}

/** Columns come from real duration reports, so annual balance views cannot
 * accidentally include every quarterly instant. Never synthesize empty years. */
export function financialPeriodEnds(
  facts: FinancialFact[],
  period: FinancialPeriod,
): string[] {
  let dates: string[] = [];
  for (const id of [
    "revenue",
    "netIncome",
    "operatingIncome",
    "operatingCashFlow",
    "eps",
  ]) {
    dates = financialSeries(facts, id, period).map((p) => p.end);
    if (dates.length) break;
  }
  if (!dates.length)
    dates = facts
      .filter((f) =>
        period === "Yearly"
          ? f.period === "annual" ||
            (!f.start && /^(10-K|20-F)(\/A)?$/.test(f.form))
          : f.period === "quarterly" ||
            (!f.start && /^Q[123]$/.test(f.fiscalPeriod)),
      )
      .map((f) => f.end);
  return [...new Set(dates)]
    .sort()
    .reverse()
    .slice(0, period === "Quarter" ? 20 : 10);
}
