import { stockChartBars } from "./stocks";
import type { DailyBar } from "./stocks";

export const chartRanges = ["1M", "3M", "YTD", "1Y", "2Y", "All"] as const;
export type ChartRange = (typeof chartRanges)[number];
export interface ChartPoint {
  date: string;
  value: number;
}

function ordered(bars: readonly DailyBar[]) {
  return [
    ...new Map(
      bars
        .filter(
          (b) =>
            Number.isFinite(b.close) &&
            b.close > 0 &&
            /^\d{4}-\d{2}-\d{2}$/.test(b.date),
        )
        .map((b) => [b.date, b]),
    ).values(),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
/** Daily windows end at the latest stored session, not the computer's date. */
export function chartRangeBars(input: readonly DailyBar[], range: ChartRange) {
  const bars = ordered(input);
  if (!bars.length || range === "All") return bars;
  if (range === "YTD")
    return bars.filter(
      (b) => b.date >= `${bars.at(-1)!.date.slice(0, 4)}-01-01`,
    );
  return stockChartBars(bars, { "1M": 1, "3M": 3, "1Y": 12, "2Y": 24 }[range]);
}
/** Full-period session averages. Compute before clipping to the visible window. */
export function simpleMovingAverage(
  input: readonly DailyBar[],
  period: number,
): ChartPoint[] {
  if (!Number.isInteger(period) || period < 1) return [];
  const bars = ordered(input),
    result: ChartPoint[] = [];
  let total = 0;
  for (let i = 0; i < bars.length; i++) {
    total += bars[i]!.close;
    if (i >= period) total -= bars[i - period]!.close;
    if (i >= period - 1)
      result.push({ date: bars[i]!.date, value: total / period });
  }
  return result;
}
/** Price return only (no dividend reinvestment); caller supplies adjusted bars.
 * Every line starts/ends on an observed shared date. Interior gaps remain absent. */
export function relativeChartSeries(
  input: { symbol: string; bars: readonly DailyBar[] }[],
) {
  if (input.length < 2) return undefined;
  const series = input.map((s) => ({
    symbol: s.symbol,
    bars: ordered(s.bars),
  }));
  const maps = series.map((s) => new Map(s.bars.map((b) => [b.date, b.close])));
  const shared = series[0]!.bars.filter((b) =>
    maps.every((m) => m.has(b.date)),
  );
  if (shared.length < 2) return undefined;
  const start = shared[0]!.date,
    end = shared.at(-1)!.date;
  const bars = series[0]!.bars.filter((b) => b.date >= start && b.date <= end);
  return {
    start,
    end,
    bars,
    series: series.map((s, i) => ({
      symbol: s.symbol,
      points: bars.flatMap((b) => {
        const close = maps[i]!.get(b.date);
        return close === undefined
          ? []
          : [{ date: b.date, value: (close / maps[i]!.get(start)! - 1) * 100 }];
      }),
    })),
  };
}
