import { describe, expect, it } from "vitest";
import {
  financialMetricSeries,
  financialPeriodEnds,
} from "./financial-analysis";
import { financialSeries, type FinancialFact } from "./stock-research";
const f = (
  metric: string,
  value: number,
  end: string,
  start?: string,
): FinancialFact => ({
  metric,
  value: String(value),
  end,
  start,
  tag: `us-gaap:${metric}`,
  unit: ["eps", "basicEps", "dividendsPerShare"].includes(metric)
    ? "USD/shares"
    : metric.startsWith("weightedShares")
      ? "shares"
      : "USD",
  filed: "2026-10-01",
  accession: "fixture",
  form: "10-K",
  fiscalYear: 2026,
  fiscalPeriod: "FY",
});
describe("financial statement presentation", () => {
  it("uses shares units and refuses cumulative weighted averages and per-share subtraction", () => {
    for (const metric of [
      "weightedSharesBasic",
      "weightedSharesDiluted",
      "basicEps",
      "dividendsPerShare",
    ]) {
      const annual = f(metric, 100, "2026-09-30", "2025-10-01");
      const cumulative = f(metric, 80, "2026-06-30", "2025-10-01");
      const direct = f(metric, 20, "2026-03-31", "2026-01-01");
      expect(
        financialSeries([annual, cumulative, direct], metric, "Quarter").map(
          (p) => p.value,
        ),
      ).toEqual([20]);
    }
  });
  it("calculates same-period ratios/FCF with correct units and retains missing values", () => {
    const end = "2026-06-30",
      start = "2026-04-01";
    const facts = [
      f("revenue", 100, end, start),
      f("netIncome", 25, end, start),
      f("operatingCashFlow", 30, end, start),
      f("capex", 5, end, start),
      f("currentAssets", 120, end),
      f("currentLiabilities", 60, end),
    ];
    expect(financialMetricSeries(facts, "netMargin", "Quarter")[0]?.value).toBe(
      25,
    );
    expect(
      financialMetricSeries(facts, "freeCashFlow", "Quarter")[0]?.value,
    ).toBe(25);
    expect(
      financialMetricSeries(facts, "currentRatio", "Quarter")[0]?.value,
    ).toBe(2);
    expect(
      financialMetricSeries(
        facts.filter((p) => p.metric !== "capex"),
        "freeCashFlow",
        "Quarter",
      ),
    ).toEqual([]);
    expect(
      financialMetricSeries(
        [f("revenue", 0, end, start), f("netIncome", 25, end, start)],
        "netMargin",
        "Quarter",
      ),
    ).toEqual([]);
    expect(
      financialMetricSeries(
        [f("revenue", 100, end, start), f("netIncome", 25, end, "2026-03-20")],
        "netMargin",
        "Quarter",
      ),
    ).toEqual([]);
    expect(
      financialMetricSeries(
        [
          f("revenue", 100, end, start),
          { ...f("netIncome", 25, end, start), unit: "EUR" },
        ],
        "netMargin",
        "Quarter",
      ),
    ).toEqual([]);
  });
  it("derives cash-flow quarters first before calculating FCF and prefers reported rows", () => {
    const facts = [
      f("operatingCashFlow", 60, "2026-06-30", "2026-01-01"),
      f("operatingCashFlow", 20, "2026-03-31", "2026-01-01"),
      f("capex", 15, "2026-06-30", "2026-01-01"),
      f("capex", 5, "2026-03-31", "2026-01-01"),
    ];
    const point = financialMetricSeries(facts, "freeCashFlow", "Quarter")[0];
    expect(point?.value).toBe(30);
    expect(point?.start).toBe("2026-04-01");
    expect(point?.derived).toBe(true);
    expect(
      financialMetricSeries(
        [
          f("revenue", 100, "2026-06-30", "2026-04-01"),
          f("costOfRevenue", 60, "2026-06-30", "2026-04-01"),
          f("grossProfit", 41, "2026-06-30", "2026-04-01"),
        ],
        "grossProfit",
        "Quarter",
      )[0]?.value,
    ).toBe(41);
  });
  it("compares YoY periods without assuming four array positions or using negative/zero bases", () => {
    const facts = [
      f("revenue", 120, "2026-06-27", "2026-03-29"),
      f("revenue", 100, "2025-06-28", "2025-03-30"),
      f("revenue", 1, "2026-03-28", "2025-12-28"),
    ];
    expect(
      financialMetricSeries(facts, "revenueGrowth", "Quarter")[0]?.value,
    ).toBeCloseTo(20);
    for (const base of [-10, 0])
      expect(
        financialMetricSeries(
          [
            f("netIncome", 20, "2026-06-30", "2026-04-01"),
            f("netIncome", base, "2025-06-30", "2025-04-01"),
          ],
          "netIncomeGrowth",
          "Quarter",
        ),
      ).toEqual([]);
  });
  it("keeps annual balance columns aligned with actual fiscal annual ends and exposes 20 quarters", () => {
    const facts = [
      f("revenue", 100, "2025-09-27", "2024-09-29"),
      f("assets", 200, "2025-09-27"),
      f("assets", 150, "2025-06-28"),
    ];
    expect(financialPeriodEnds(facts, "Yearly")).toEqual(["2025-09-27"]);
    const quarters = Array.from({ length: 24 }, (_, i) => ({
      ...f(
        "revenue",
        i,
        `${2020 + Math.floor(i / 4)}-${["03-31", "06-30", "09-30", "12-31"][i % 4]}`,
      ),
      period: "quarterly" as const,
    }));
    expect(financialPeriodEnds(quarters, "Quarter")).toHaveLength(20);
    expect(financialMetricSeries(quarters, "peRatio", "Quarter")).toEqual([]);
  });
});
