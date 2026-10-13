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

export interface SampleBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
