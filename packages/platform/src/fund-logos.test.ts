import { it, expect, vi } from "vitest";
import { createLocalFundLogos } from "./fund-logos";
it("keys private session cache by exact CIK, coalesces requests and never sends URLs", async () => {
  const image = { dataUrl: "data:image/png;base64,fixture" };
  const transport = vi.fn().mockResolvedValue(image);
  const logos = createLocalFundLogos(transport);
  expect(logos.peek?.("0001067983")).toBeNull();
  const [a, b] = await Promise.all([
    logos.get("0001067983"),
    logos.get("0001067983"),
  ]);
  expect(a).toBe(b);
  expect(logos.peek?.("0001067983")).toBe(a);
  expect(await logos.get("0001067983")).toBe(a);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport).toHaveBeenCalledWith("fund.logo", { cik: "0001067983" });
  expect(() => logos.get("AAPL")).toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
});
