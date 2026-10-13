import { sampleQuotes } from "@aifi/core";
import type { SampleBar } from "@aifi/core";
export const stockProfiles: Record<
  string,
  {
    description: string;
    industry: string;
    revenue: number;
    income: number;
    seed: number;
  }
> = {
  AAPL: {
    description: "Consumer devices, software and services.",
    industry: "Consumer electronics",
    revenue: 400,
    income: 95,
    seed: 2,
  },
  MSFT: {
    description: "Productivity software, cloud infrastructure and computing.",
    industry: "Software & cloud",
    revenue: 260,
    income: 90,
    seed: 5,
  },
  NVDA: {
    description: "Accelerated computing and graphics platforms.",
    industry: "Semiconductors",
    revenue: 130,
    income: 65,
    seed: 8,
  },
  GOOGL: {
    description: "Search, advertising and cloud services.",
    industry: "Internet services",
    revenue: 350,
    income: 100,
    seed: 11,
  },
  AMD: {
    description: "Processors and computing platforms.",
    industry: "Semiconductors",
    revenue: 28,
    income: 3,
    seed: 14,
  },
};
export function sampleBars(symbol: string): SampleBar[] {
  const quote = sampleQuotes[symbol],
    profile = stockProfiles[symbol];
  if (!quote || !profile) return [];
  const dates: string[] = [];
  const day = new Date("2026-10-12T12:00:00Z");
  while (dates.length < 504) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6)
      dates.unshift(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() - 1);
  }
  const values = dates.map(
    (_, i) =>
      quote.price *
      (0.72 +
        (0.27 * i) / 503 +
        0.025 * Math.sin(i * 0.12 + profile.seed) +
        0.015 * Math.cos(i * 0.47)),
  );
  const shift = quote.price - values.at(-1)!;
  return dates.map((date, i) => {
    const close =
        i === 502 ? quote.price / (1 + quote.change / 100) : values[i]! + shift,
      open = close + Math.sin(i * 0.6) * quote.price * 0.007;
    return {
      date,
      open,
      high: Math.max(open, close) * 1.005,
      low: Math.min(open, close) * 0.995,
      close,
      volume: Math.round(
        (20 + Math.abs(Math.sin(i * 0.71 + profile.seed)) * 60) * 1000000,
      ),
    };
  });
}
