import { it, expect } from "vitest";
import {
  analystConsensus,
  analystDistribution,
  analystEvents,
  analystReference,
} from "./stock-analyst";
import { emptyResearch, type ResearchDatasetView } from "./stock-research";
const view = (records: Record<string, unknown>[]): ResearchDatasetView => ({
  provider: "yahoo",
  fetchedAt: "2026-10-18T00:00:00Z",
  recordCount: records.length,
  sources: [],
  data: { complete: false, records },
});
it("keeps target/recommendation populations separate and never fills unknown counts", () => {
  const v = view([
    {
      recordKind: "price-target-consensus",
      targetConsensus: 120,
      analystCount: 39,
      recommendation: "buy",
    },
    {
      recordKind: "recommendations",
      period: "-1m",
      strongBuy: 99,
      buy: 0,
      hold: 0,
      sell: 0,
      strongSell: 0,
    },
    {
      recordKind: "recommendations",
      period: "0m",
      strongBuy: 6,
      buy: 19,
      hold: 13,
      sell: 3,
      strongSell: 3,
    },
  ]);
  expect(analystConsensus(v)).toMatchObject({
    mean: 120,
    count: 39,
    rating: "buy",
  });
  expect(analystDistribution(v)).toEqual({
    counts: [6, 19, 13, 3, 3],
    total: 44,
  });
  expect(
    analystDistribution(
      view([{ recordKind: "recommendations", period: "0m", buy: 5 }]),
    ),
  ).toBeUndefined();
});
it("retains target changes, zero sentinels and unknown analyst identities with signed upside", () => {
  const v = view([
    {
      recordKind: "grades",
      date: "2026-10-01",
      gradingCompany: "Example Firm",
      action: "main",
      currentPriceTarget: 120,
      priorPriceTarget: 110,
      newGrade: "Buy",
    },
    {
      recordKind: "grades",
      date: "2026-10-01",
      gradingCompany: "Another Firm",
      currentPriceTarget: 80,
      priorPriceTarget: 0,
    },
    {
      recordKind: "grades",
      date: "2026-10-01",
      gradingCompany: "Missing",
      currentPriceTarget: 0,
    },
  ]);
  const r = analystEvents(v, 100);
  expect(r.find((x) => x.firm === "Example Firm")).toMatchObject({
    analyst: undefined,
    action: "Maintained",
    target: 120,
    priorTarget: 110,
  });
  expect(r.find((x) => x.firm === "Example Firm")?.upside).toBeCloseTo(20);
  expect(r.find((x) => x.firm === "Another Firm")?.upside).toBeCloseTo(-20);
  expect(r.find((x) => x.firm === "Missing")?.target).toBeUndefined();
  expect(analystEvents(v)[0]?.upside).toBeUndefined();
});
it("uses the latest stored price rather than stale analysis quotes", () => {
  const data = emptyResearch("TEST");
  data.datasets.analyst = {
    ...view([]),
    data: {
      complete: false,
      quote: { price: 80, asOf: "2026-10-01T20:00:00Z" },
    },
  };
  data.datasets.prices = {
    ...view([]),
    data: {
      complete: false,
      quote: { price: 100, asOf: "2026-10-17T20:00:00Z" },
    },
  };
  expect(analystReference(data)).toEqual({
    price: 100,
    asOf: "2026-10-17T20:00:00Z",
  });
});
