import { normalizeSymbol } from "./workspace";
import { validDirectorySymbol } from "./stock-directory";

export const stockTabs = [
  "chart",
  "financials",
  "funds",
  "politicians",
  "insiders",
  "analyst",
] as const;
export type StockTab = (typeof stockTabs)[number];
export interface StockRoute {
  symbol: string;
  tab: StockTab;
}
export function parseStockRoute(hash: string): StockRoute {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  let symbol = "AAPL";
  try {
    const candidate = normalizeSymbol(
      decodeURIComponent(path?.split("/")[1] ?? "AAPL"),
    );
    if (validDirectorySymbol(candidate)) symbol = candidate;
  } catch {
    /* Invalid URL escapes fall back to the initial development target. */
  }
  const tab = new URLSearchParams(query).get("tab") as StockTab;
  return { symbol, tab: stockTabs.includes(tab) ? tab : "chart" };
}
export function stockHref(symbol: string, tab: StockTab = "chart") {
  const normalized = normalizeSymbol(symbol);
  if (!validDirectorySymbol(normalized))
    throw new Error("Invalid stock symbol.");
  return `#/stocks/${encodeURIComponent(normalized)}?tab=${tab}`;
}

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Company identity for presentation; the directory's full security name stays intact. */
export function stockDisplayName(
  profileName?: string,
  listingName?: string,
  symbol = "",
) {
  if (profileName?.trim()) return profileName.trim();
  return (
    listingName
      ?.replace(
        /\s*(?:-\s*)?(?:Class\s+[A-Z0-9.-]+\s+)?(?:Common Stock|Ordinary Shares)(?:\s+\([^)]*\))?$/i,
        "",
      )
      .trim() || symbol
  );
}

/** Calendar window anchored to the last stored session, not a guessed row count. */
export function stockChartBars(bars: DailyBar[], months: number) {
  const last = bars.at(-1);
  if (!last || !Number.isInteger(months) || months <= 0) return [];
  const [year, month, day] = last.date.split("-").map(Number);
  const cutoff = new Date(Date.UTC(year!, month! - 1 - months, 1));
  const monthEnd = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cutoff.setUTCDate(Math.min(day!, monthEnd));
  if (!Number.isFinite(cutoff.getTime())) return [];
  const start = cutoff.toISOString().slice(0, 10);
  return bars.filter((bar) => bar.date >= start && bar.date <= last.date);
}
