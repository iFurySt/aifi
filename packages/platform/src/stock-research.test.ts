import { it, expect, vi } from "vitest";
import { createLocalStockResearch } from "./stock-research";
import { emptyResearch } from "@aifi/core";
it("uses only the injected local read port for arbitrary directory symbols", async () => {
  const transport = vi.fn().mockResolvedValue(emptyResearch("BRK.B"));
  const repository = createLocalStockResearch(transport);
  expect((await repository.get("brk.b")).symbol).toBe("BRK.B");
  expect(transport).toHaveBeenCalledExactlyOnceWith("research.read", {
    symbol: "BRK.B",
  });
  await expect(repository.get("../../private")).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
});
