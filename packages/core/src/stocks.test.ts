import { describe, expect, it } from "vitest";
import { parseStockRoute, stockHref } from "./stocks";
describe("stock deep links", () => {
  it("round-trips share-class symbols and selected tabs", () => {
    expect(parseStockRoute(stockHref(" brk.b ", "insiders"))).toEqual({
      symbol: "BRK.B",
      tab: "insiders",
    });
  });
  it("keeps valid unknown symbols but rejects malformed paths and tabs", () => {
    expect(parseStockRoute("#/stocks/TSLA?tab=funds")).toEqual({
      symbol: "TSLA",
      tab: "funds",
    });
    expect(parseStockRoute("#/stocks/%GG?tab=script")).toEqual({
      symbol: "AAPL",
      tab: "chart",
    });
    expect(() => stockHref("<script>")).toThrow("Invalid");
  });
});
