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

it("uses company identity and removes only known directory security suffixes", async () => {
  const { stockDisplayName } = await import("./stocks");
  expect(
    stockDisplayName("Apple Inc.", "Apple Inc. - Common Stock", "AAPL"),
  ).toBe("Apple Inc.");
  expect(
    stockDisplayName(
      undefined,
      "Alphabet Inc. - Class A Common Stock",
      "GOOGL",
    ),
  ).toBe("Alphabet Inc.");
  expect(
    stockDisplayName(undefined, "Agilent Technologies, Inc. Common Stock", "A"),
  ).toBe("Agilent Technologies, Inc.");
  expect(stockDisplayName(undefined, "Example - Warrants", "EXW")).toBe(
    "Example - Warrants",
  );
});
