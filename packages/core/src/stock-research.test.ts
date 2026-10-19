import { describe, it, expect } from "vitest";
import {
  emptyResearch,
  financialSeries,
  trailingMetric,
  splitAdjustedBars,
  priceMetrics,
  isResearchSourceURL,
  type FinancialFact,
} from "./stock-research";
const fact = (
  metric: string,
  value: number,
  start: string | undefined,
  end: string,
): FinancialFact => ({
  metric,
  value: String(value),
  start,
  end,
  tag: `us-gaap:${metric}`,
  unit: metric === "eps" ? "USD/shares" : "USD",
  filed: "2026-10-15",
  accession: "test",
  form: "10-K",
  fiscalYear: 2026,
  fiscalPeriod: "FY",
});
describe("stored research calculations", () => {
  it("derives fiscal quarters from matching cumulative periods and keeps actual period ends", () => {
    const facts = [
      fact("operatingCashFlow", 10, "2025-10-01", "2025-12-31"),
      fact("operatingCashFlow", 25, "2025-10-01", "2026-03-31"),
      fact("operatingCashFlow", 45, "2025-10-01", "2026-06-30"),
      fact("operatingCashFlow", 70, "2025-10-01", "2026-09-30"),
    ];
    expect(
      financialSeries(facts, "operatingCashFlow", "Quarter").map(
        (p) => p.value,
      ),
    ).toEqual([25, 20, 15, 10]);
    expect(
      financialSeries(facts, "operatingCashFlow", "Yearly").map((p) => p.value),
    ).toEqual([70]);
    expect(trailingMetric(facts, "operatingCashFlow")).toEqual({
      value: 70,
      end: "2026-09-30",
      basis: "TTM",
    });
    expect(
      financialSeries(facts, "operatingCashFlow", "Quarter")[0]?.derived,
    ).toBe(true);
  });
  it("does not divide annuals into quarters, combine currencies or subtract weighted EPS", () => {
    const annual = fact("eps", 8, "2025-10-01", "2026-09-30"),
      ytd = fact("eps", 6, "2025-10-01", "2026-06-30");
    expect(financialSeries([annual, ytd], "eps", "Quarter")).toEqual([]);
    const revenue = fact("revenue", 100, "2025-10-01", "2026-09-30");
    expect(financialSeries([revenue], "revenue", "Quarter")).toEqual([]);
    expect(
      financialSeries([{ ...revenue, unit: "EUR" }], "revenue", "Yearly"),
    ).toEqual([]);
  });
  it("uses later restatements and does not silently stitch gaps into TTM", () => {
    const q = fact("revenue", 10, "2026-04-01", "2026-06-30");
    expect(
      financialSeries(
        [q, { ...q, value: "12", filed: "2026-10-16" }],
        "revenue",
        "Quarter",
      )[0]?.value,
    ).toBe(12);
    const gaps = [
      fact("revenue", 1, "2025-01-01", "2025-03-31"),
      fact("revenue", 2, "2025-07-01", "2025-09-30"),
      fact("revenue", 3, "2025-10-01", "2025-12-31"),
      fact("revenue", 4, "2026-01-01", "2026-03-31"),
    ];
    expect(trailingMetric(gaps, "revenue")).toBeUndefined();
  });
  it("adjusts stored raw history once for each effective split and preserves raw input", () => {
    const data = emptyResearch("TEST");
    data.bars = [
      {
        date: "2026-01-01",
        open: 100,
        high: 110,
        low: 90,
        close: 100,
        volume: 10,
      },
      {
        date: "2026-01-05",
        open: 50,
        high: 55,
        low: 45,
        close: 50,
        volume: 20,
      },
    ];
    expect(splitAdjustedBars(data).adjusted).toBe(false);
    data.datasets.actions = {
      provider: "massive",
      fetchedAt: "",
      sources: [],
      recordCount: 2,
      data: {
        complete: true,
        records: [
          {
            kind: "splits",
            execution_date: "2026-01-02",
            split_from: 1,
            split_to: 2,
          },
          {
            kind: "splits",
            execution_date: "2027-01-01",
            split_from: 1,
            split_to: 10,
          },
        ],
      },
    };
    const adjusted = splitAdjustedBars(data);
    expect(adjusted.bars.map((b) => b.close)).toEqual([50, 50]);
    expect(adjusted.bars[0]?.volume).toBe(20);
    expect(data.bars[0]?.close).toBe(100);
  });
  it("uses prior year close for YTD and returns absent indicators for insufficient history", () => {
    const make = (date: string, close: number) => ({
      date,
      open: close,
      high: close,
      low: close,
      close,
      volume: 1,
    });
    const metrics = priceMetrics([
      make("2025-12-31", 100),
      make("2026-01-02", 110),
      make("2026-01-05", 121),
    ]);
    expect(metrics.ytd).toBeCloseTo(21);
    expect(metrics.change).toBeCloseTo(10);
    expect(metrics.rsi).toBeUndefined();
    expect(metrics.high52).toBeUndefined();
    expect(priceMetrics([])).toEqual({});
  });
  it("only opens primary HTTPS research hosts outside the desktop sandbox", () => {
    expect(
      isResearchSourceURL(
        "https://api.nasdaq.com/api/company/A/company-profile",
      ),
    ).toBe(true);
    expect(
      isResearchSourceURL(
        "https://www.sec.gov/Archives/edgar/data/320193/report.htm",
      ),
    ).toBe(true);
    for (const url of [
      "file:///private/secret",
      "javascript:alert(1)",
      "http://www.sec.gov/",
      "https://www.sec.gov.evil.invalid/",
      "https://token@www.sec.gov/",
      "https://www.sec.gov:8443/",
    ])
      expect(isResearchSourceURL(url)).toBe(false);
  });
});
it("does not label distant sparse observations as daily or year-start returns", () => {
  const bar = (date: string, close: number) => ({
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  });
  const metrics = priceMetrics([
    bar("2025-06-30", 100),
    bar("2026-01-12", 200),
  ]);
  expect(metrics.change).toBeUndefined();
  expect(metrics.ytd).toBeUndefined();
  expect(metrics.high52).toBeUndefined();
});

it("does not adjust Yahoo split-adjusted bars a second time", () => {
  const data = emptyResearch("OTHER.B");
  data.basis = "split-adjusted";
  data.bars = [
    {
      date: "2026-01-02",
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
    },
  ];
  data.datasets.actions = {
    provider: "massive",
    fetchedAt: "2026-10-15",
    sources: [],
    recordCount: 1,
    data: {
      complete: true,
      records: [
        {
          kind: "splits",
          execution_date: "2026-05-01",
          split_from: 1,
          split_to: 10,
        },
      ],
    },
  };
  expect(splitAdjustedBars(data)).toEqual({ bars: data.bars, adjusted: true });
});

it("keeps vendor annual and quarterly periods separate without invented start dates", () => {
  const vendor = (
    period: "annual" | "quarterly",
    end: string,
    value: number,
  ): FinancialFact => ({
    period,
    metric: "revenue",
    tag: `yahoo:${period}TotalRevenue`,
    unit: "USD",
    value: String(value),
    end,
    filed: "",
    accession: "",
    form: "",
    fiscalYear: 0,
    fiscalPeriod: "",
  });
  const facts = [
    vendor("annual", "2025-09-30", 1000),
    vendor("quarterly", "2025-09-30", 300),
    vendor("quarterly", "2025-12-31", 350),
    vendor("quarterly", "2026-03-31", 400),
    vendor("quarterly", "2026-06-30", 450),
  ];
  expect(
    financialSeries(facts, "revenue", "Yearly").map((p) => p.value),
  ).toEqual([1000]);
  expect(
    financialSeries(facts, "revenue", "Quarter").map((p) => p.value),
  ).toEqual([450, 400, 350, 300]);
  expect(trailingMetric(facts, "revenue")).toEqual({
    value: 1500,
    end: "2026-06-30",
    basis: "TTM",
  });
});

it("keeps regular close and post-market prices distinct and keeps stale prices while determining the current market session", async () => {
  const { stockQuotePresentation } = await import("./stock-research");
  const data = emptyResearch("AAPL");
  data.datasets.prices = {
    provider: "yahoo",
    fetchedAt: "2026-10-17T04:00:00Z",
    sources: [],
    recordCount: 0,
    data: {
      complete: true,
      quote: {
        price: 343.46,
        previousClose: 342,
        asOf: "2026-10-16T20:00:01Z",
        sessionStart: 1792157400,
        sessionEnd: 1792180800,
        postPrice: 342.62,
        postAsOf: "2026-10-16T23:59:00Z",
      },
    },
  };
  const weekend = stockQuotePresentation(
    data,
    Date.parse("2026-10-17T04:12:00Z"),
  );
  expect(weekend.status).toBe("Market Closed");
  expect(weekend.price).toBe(343.46);
  expect(weekend.change).toBeCloseTo(1.46);
  expect(weekend.postPrice).toBe(342.62);
  expect(weekend.date).toBe("2026-10-16");
  const monday = stockQuotePresentation(
    data,
    Date.parse("2026-10-19T14:00:00Z"),
  );
  expect(monday.status).toBe("Market Open");
  expect(monday.market.basis).toBe("calendar");
  expect(monday.price).toBe(343.46);
  expect(monday.asOf).toBe("2026-10-16T20:00:01Z");
  const empty = stockQuotePresentation(
    emptyResearch("AAPL"),
    Date.parse("2026-10-19T14:00:00Z"),
  );
  expect(empty.status).toBe("Market Open");
  expect(empty.price).toBeUndefined();
});

it("does not replace a newer local close with an older company-page quote", async () => {
  const { stockQuotePresentation } = await import("./stock-research");
  const data = emptyResearch("AAPL");
  data.bars = [
    {
      date: "2026-10-16",
      open: 340,
      high: 345,
      low: 339,
      close: 343.46,
      volume: 100,
    },
  ];
  data.datasets.profile = {
    provider: "yahoo",
    fetchedAt: "2026-10-17T04:00:00Z",
    sources: [],
    recordCount: 0,
    data: {
      complete: false,
      quote: { price: 330, asOf: "2026-10-09T20:00:00Z" },
    },
  };
  const quote = stockQuotePresentation(
    data,
    Date.parse("2026-10-17T04:10:00Z"),
  );
  expect(quote.price).toBe(343.46);
  expect(quote.date).toBe("2026-10-16");
  expect(quote.asOf).toBeUndefined();
});

it("keeps reported company cap from a dated quote when a fresher price has no valuation", async () => {
  const { stockQuotePresentation } = await import("./stock-research");
  const data = emptyResearch("AAPL");
  data.datasets.prices = {
    provider: "yahoo",
    fetchedAt: "2026-10-17T05:00:00Z",
    sources: [],
    recordCount: 0,
    data: {
      complete: false,
      quote: { price: 343.46, asOf: "2026-10-16T20:00:01Z" },
    },
  };
  data.datasets.analyst = {
    provider: "yahoo",
    fetchedAt: "2026-10-17T04:00:00Z",
    sources: [],
    recordCount: 0,
    data: {
      complete: false,
      quote: {
        price: 343.46,
        asOf: "2026-10-16T20:00:01Z",
        marketCap: 5012516765696,
      },
    },
  };
  const quote = stockQuotePresentation(
    data,
    Date.parse("2026-10-17T06:00:00Z"),
  );
  expect(quote.price).toBe(343.46);
  expect(quote.marketCap).toBe(5012516765696);
  expect(quote.marketCapAsOf).toBe("2026-10-16T20:00:01Z");
});
