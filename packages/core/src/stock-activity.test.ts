import { it, expect } from "vitest";
import {
  politicalTrades,
  activityPoints,
  activityCutoff,
  disclosureURL,
} from "./stock-activity";
import type { ResearchDatasetView } from "./stock-research";
it("preserves disclosed ranges and dates and never estimates exact purchase values", () => {
  const view = {
    provider: "congress",
    fetchedAt: "2026-10-18T00:00:00Z",
    recordCount: 3,
    sources: [],
    data: {
      records: [
        {
          name: "Example",
          type: "buy",
          transactionDate: "2026-10-01",
          disclosureDate: "2026-10-10",
          amount: "$1,001 - $15,000",
          url: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/123.pdf",
        },
        {
          name: "Ambiguous",
          type: "sell",
          transactionDate: "2026-10-01",
          amount: "$1,001 - $15,000",
          ambiguousDuplicate: true,
        },
        { name: "Bad", type: "buy", transactionDate: "2026-02-30" },
      ],
      complete: false,
    },
  } as ResearchDatasetView;
  const rows = politicalTrades(view);
  expect(rows).toHaveLength(2);
  expect(rows.find((r) => r.name === "Example")).toMatchObject({
    min: 1001,
    max: 15000,
    filed: "2026-10-10",
  });
  expect(
    activityPoints(
      rows.map((r) => ({ ...r, excluded: r.ambiguous })),
      "count",
    ),
  ).toEqual([{ date: "2026-10-01", buy: 1, sell: 0, net: 1, count: 1 }]);
  expect(activityPoints(rows, "value")).toEqual([]);
  expect(activityCutoff("6M", "2026-10-18T00:00:00Z")).toBe("2026-04-18");
  expect(disclosureURL("https://evil.example/report.pdf")).toBeUndefined();
  expect(
    disclosureURL("https://disclosures-clerk.house.gov/private"),
  ).toBeUndefined();
});
it("groups real dates and signed purchases/sales with zero-safe cumulative totals", () => {
  expect(
    activityPoints(
      [
        { date: "2026-10-01", side: "buy", value: 0 },
        { date: "2026-10-02", side: "sell", value: 10 },
        { date: "2026-10-02", side: "other", value: 999 },
        { date: "2026-10-03", side: "buy", value: 3 },
      ],
      "value",
    ),
  ).toEqual([
    { date: "2026-10-01", buy: 0, sell: 0, net: 0, count: 1 },
    { date: "2026-10-02", buy: 0, sell: 10, net: -10, count: 1 },
    { date: "2026-10-03", buy: 3, sell: 0, net: -7, count: 1 },
  ]);
});
it("keeps insider codes, shares-after, zero and non-trade exclusions honest", async () => {
  const { insiderTrades } = await import("./stock-activity");
  const base = {
    name: "Example Officer",
    date: "2026-10-01",
    filed: "2026-10-02",
    code: "S",
    direction: "D",
    shares: "10",
    price: "12.50",
    sharesAfter: "90",
    securityKind: "nonDerivative",
  };
  const view = {
    provider: "sec",
    recordCount: 5,
    fetchedAt: "2026-10-18T00:00:00Z",
    sources: [],
    data: {
      complete: false,
      records: [
        base,
        { ...base, code: "F" },
        { ...base, securityKind: "derivative" },
        { ...base, amendment: true },
        { ...base, superseded: true },
        { ...base, price: "", sharesAfter: "0" },
      ],
    },
  } as ResearchDatasetView;
  const rows = insiderTrades(view);
  expect(rows.filter((r) => r.eligible)).toHaveLength(2);
  expect(rows[0]).toMatchObject({ value: 125, sharesAfter: 90 });
  expect(rows.at(-1)).toMatchObject({ value: undefined, sharesAfter: 0 });
  expect(
    activityPoints(
      rows.map((r) => ({ ...r, excluded: !r.eligible })),
      "value",
    ),
  ).toEqual([{ date: "2026-10-01", buy: 0, sell: 125, net: -125, count: 1 }]);
});
