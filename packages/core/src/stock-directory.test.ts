import { it, expect } from "vitest";
import {
  validateDirectoryQuery,
  validDirectorySymbol,
} from "./stock-directory";
import { parseStockRoute, stockHref } from "./stocks";
it("preserves opaque directory symbols in routes, separate from watchlist syntax", () => {
  for (const symbol of [
    "BRK.B",
    "BAC$B",
    "ATEST^A",
    "LONGSYMBOL1234",
    "CLASS/B",
  ]) {
    expect(validDirectorySymbol(symbol)).toBe(true);
    expect(parseStockRoute(stockHref(symbol, "financials"))).toEqual({
      symbol,
      tab: "financials",
    });
  }
  for (const symbol of [
    "",
    " AAPL",
    "AA PL",
    "AA|B",
    "AA\n",
    "ABCDEFGHIJKLMNO",
  ])
    expect(validDirectorySymbol(symbol)).toBe(false);
});
it("bounds directory queries at the host boundary", () => {
  expect(() =>
    validateDirectoryQuery({ query: "%_", limit: 200, offset: 100000 }),
  ).not.toThrow();
  for (const v of [
    null,
    [],
    { query: "", limit: 0, offset: 0 },
    { query: "", limit: 50, offset: -1 },
    { query: "", limit: 1.5, offset: 0 },
    { query: "界".repeat(100), limit: 50, offset: 0 },
    { query: "", limit: 50, offset: 0, path: "private" },
  ])
    expect(() => validateDirectoryQuery(v)).toThrow();
});
