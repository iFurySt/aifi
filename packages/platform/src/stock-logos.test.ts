import { it, expect, vi } from "vitest";
import { createLocalStockLogos } from "./stock-logos";
it("keeps logo transport replaceable and missing images nullable", async () => {
  const transport = vi.fn().mockResolvedValue(null);
  const repository = createLocalStockLogos(transport);
  expect(await repository.get("AAPL")).toBeNull();
  expect(transport).toHaveBeenCalledWith("stock.logo", { symbol: "AAPL" });
  await expect(repository.get("<script>")).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
});
