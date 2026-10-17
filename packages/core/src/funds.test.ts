import { describe, it, expect } from "vitest";
import { fundHistories, fundPeriods, holdingPeriodLabel } from "./funds";
import type { ResearchDatasetView } from "./stock-research";
const view = (records: Record<string, unknown>[]): ResearchDatasetView => ({
  provider: "yahoo",
  fetchedAt: "2026-10-17T00:00:00Z",
  sources: [],
  recordCount: records.length,
  data: { complete: false, records },
});
const point = (name: string, date: string, shares: number, more = {}) => ({
  recordKind: "holding",
  holderKind: "institution",
  holderId: name,
  name,
  reportDate: date,
  shares,
  ...more,
});
describe("fund ownership meaning", () => {
  it("retains true zero/history gaps and never invents new/exited from sample absence", () => {
    const rows = fundHistories(
      view([
        point("Same", "2026-06-30", 100, { changePercent: 0 }),
        point("Earlier", "2026-03-31", 100, { current: false }),
        point("Trim", "2026-06-30", 90, { changePercent: -1.2 }),
        point("Same", "2025-12-31", 0),
      ]),
    );
    expect(rows.find((r) => r.name === "Same")?.latest.position).toBe("Same");
    expect(rows.find((r) => r.name === "Earlier")?.latest.position).toBe(
      "Unknown",
    );
    expect(rows.find((r) => r.name === "Trim")?.latest.position).toBe(
      "Reduced",
    );
    expect(fundPeriods(rows)).toEqual([
      "2026-06-30",
      "2026-03-31",
      "2025-12-31",
    ]);
    expect(rows.find((r) => r.name === "Same")?.points[1].shares).toBe(0);
  });
  it("keeps manager and fund scopes separate and rejects invalid/missing values", () => {
    const rows = fundHistories(
      view([
        point("Same", "2026-06-30", 100),
        point("Same", "2026-08-31", 25, { holderKind: "fund" }),
        point("Invalid", "2026-02-30", 12),
        point("Missing", "2026-06-30", undefined as never),
        point("Bad", "2026-06-30", NaN),
      ]),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(holdingPeriodLabel("2026-06-30")).toBe("Q2 2026");
    expect(holdingPeriodLabel("2026-08-31")).toBe("Aug 31, 2026");
  });
  it("accepts explicit FMP changes but does not turn rounded percentages into shares", () => {
    const rows = fundHistories(
      view([
        {
          investorName: "Manager",
          date: "2026-06-30",
          sharesNumber: 50,
          changeInSharesNumber: -10,
          marketValue: 1000,
        },
        {
          investorName: "New",
          date: "2026-06-30",
          sharesNumber: 100,
          isNew: true,
        },
        point("Rounded", "2026-06-30", 101, { changePercent: 1.234 }),
      ]),
    );
    expect(rows.find((r) => r.name === "Manager")?.latest).toMatchObject({
      position: "Reduced",
      changeShares: -10,
      value: 1000,
    });
    expect(rows.find((r) => r.name === "New")?.latest.position).toBe("New");
    expect(
      rows.find((r) => r.name === "Rounded")?.latest.changeShares,
    ).toBeUndefined();
  });
});

it("compares adjacent complete 13F periods, retaining reported zeros and missing-report gaps", () => {
  const data = view([
    point("New", "2026-06-30", 20, { managerCik: "0001067983" }),
    point("New", "2026-03-31", 0),
    point("Exited", "2026-06-30", 0),
    point("Exited", "2026-03-31", 30),
    point("Gap", "2026-06-30", 50),
    point("Gap", "2025-12-31", 40),
    point("Trim", "2026-06-30", 80),
    point("Trim", "2026-03-31", 100, { current: false }),
  ]);
  data.provider = "thirteenf";
  const rows = fundHistories(data);
  expect(rows.find((r) => r.name === "New")?.latest).toMatchObject({
    position: "New",
    changeShares: 20,
    cik: "0001067983",
  });
  expect(rows.find((r) => r.name === "Exited")?.latest).toMatchObject({
    position: "Exited",
    changeShares: -30,
  });
  expect(rows.find((r) => r.name === "Trim")?.latest).toMatchObject({
    position: "Reduced",
    changeShares: -20,
    changePercent: -20,
  });
  expect(rows.find((r) => r.name === "Gap")?.latest.position).toBe("Unknown");
  expect(
    fundPeriods(rows, [
      "2026-06-30",
      "2026-03-31",
      "2026-06-30",
      "bad",
      "2026-02-30",
    ]),
  ).toEqual(["2026-06-30", "2026-03-31"]);
});
