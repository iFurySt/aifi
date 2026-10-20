import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StockChart } from "./StockChart";

// Keep this volume-rendering unit test independent of the comparison picker’s live directory hooks.
vi.mock("./StockComparePicker", () => ({ StockComparePicker: () => null }));

it("draws every stored daily volume, including a peak formerly skipped by the stride", () => {
  const bars = Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 9, 17 + i)).toISOString().slice(0, 10),
    open: 100,
    high: 110,
    low: 90,
    close: 101,
    volume: i === 101 ? 10000 : 100,
  }));
  const html = renderToStaticMarkup(
    <StockChart symbol="TEST" bars={bars} adjusted />,
  );
  expect((html.match(/class="stock-volume-bar"/g) ?? []).length).toBe(365);
  expect(html).toContain('height="52"');
  expect(html).toContain("2025-10-17");
  expect(html).toContain("2026-10-16");
  expect(html).not.toContain("NaN");
});
