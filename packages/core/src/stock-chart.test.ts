import { describe, expect, it } from "vitest";
import {
  chartRangeBars,
  simpleMovingAverage,
  relativeChartSeries,
} from "./stock-chart";
import type { DailyBar } from "./stocks";
const bar = (date: string, close: number): DailyBar => ({
  date,
  close,
  open: close,
  high: close,
  low: close,
  volume: 100,
});
describe("local chart calculations", () => {
  it("uses stored calendar windows and leaves the input untouched", () => {
    const bars = [
      bar("2025-12-31", 10),
      bar("2026-01-02", 11),
      bar("2026-04-30", 12),
      bar("2026-05-31", 13),
    ].reverse();
    expect(chartRangeBars(bars, "1M").map((b) => b.date)).toEqual([
      "2026-04-30",
      "2026-05-31",
    ]);
    expect(chartRangeBars(bars, "YTD")).toHaveLength(3);
    expect(chartRangeBars(bars, "All")).toHaveLength(4);
    expect(bars[0]!.date).toBe("2026-05-31");
    expect(chartRangeBars([], "YTD")).toEqual([]);
  });
  it("requires a full SMA warmup, including sessions before a clipped range", () => {
    const bars = Array.from({ length: 205 }, (_, i) =>
      bar(new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), i + 1),
    );
    const values = simpleMovingAverage(bars, 200);
    expect(values).toHaveLength(6);
    expect(values[0]!.value).toBe(100.5);
    expect(values.at(-1)!.value).toBe(105.5);
    const firstVisible = chartRangeBars(bars, "1M")[0]!.date;
    expect(
      simpleMovingAverage(bars, 20).find((p) => p.date === firstVisible),
    ).toBeDefined();
    expect(simpleMovingAverage(bars.slice(0, 10), 20)).toEqual([]);
    expect(simpleMovingAverage(bars, 0)).toEqual([]);
  });
  it("compares the same actual baseline/end, with separate percentage scales", () => {
    const data = relativeChartSeries([
      {
        symbol: "A",
        bars: [
          bar("2026-01-01", 80),
          bar("2026-01-02", 100),
          bar("2026-01-03", 120),
          bar("2026-01-04", 130),
          bar("2026-01-05", 200),
        ],
      },
      { symbol: "B", bars: [bar("2026-01-02", 200), bar("2026-01-04", 220)] },
    ])!;
    expect([data.start, data.end]).toEqual(["2026-01-02", "2026-01-04"]);
    expect(data.series[0]!.points[0]!.value).toBe(0);
    expect(data.series[0]!.points.at(-1)!.value).toBeCloseTo(30);
    expect(data.series[1]!.points.at(-1)!.value).toBeCloseTo(10);
    expect(
      data.series[1]!.points.find((p) => p.date === "2026-01-03"),
    ).toBeUndefined();
    expect(data.bars).toHaveLength(3);
  });
  it("does not invent baselines or infinities for absent/invalid history", () => {
    expect(
      relativeChartSeries([
        { symbol: "A", bars: [bar("2026-01-01", 10)] },
        { symbol: "B", bars: [bar("2026-01-02", 20)] },
      ]),
    ).toBeUndefined();
    expect(
      relativeChartSeries([
        { symbol: "A", bars: [bar("2026-01-01", 0)] },
        { symbol: "B", bars: [] },
      ]),
    ).toBeUndefined();
    expect(relativeChartSeries([])).toBeUndefined();
  });
});
