import { it, expect, vi } from "vitest";
import { createLocalStockDirectory } from "./stock-directory";
it("uses injected transport for paged search and exact identity without fixture fallback", async () => {
  const page = {
    snapshotId: "snapshot",
    scope: "candidates",
    total: 0,
    offset: 0,
    items: [],
  };
  const transport = vi.fn().mockResolvedValue(page);
  const repository = createLocalStockDirectory(transport);
  expect(
    await repository.search({ query: "Apple", limit: 50, offset: 0 }),
  ).toBe(page);
  expect(transport).toHaveBeenCalledWith("directory.list", {
    query: "Apple",
    limit: 50,
    offset: 0,
  });
  transport.mockResolvedValueOnce({ snapshotId: "snapshot", item: null });
  expect((await repository.get("BRK.B")).item).toBeNull();
  expect(transport).toHaveBeenLastCalledWith("directory.get", {
    symbol: "BRK.B",
  });
  transport.mockRejectedValueOnce(Error("Service unavailable"));
  await expect(repository.get("AAPL")).rejects.toThrow("Service unavailable");
  await expect(
    repository.search({ query: "", limit: 201, offset: 0 }),
  ).rejects.toThrow();
  await expect(
    repository.search({ query: "界".repeat(100), limit: 20, offset: 0 }),
  ).rejects.toThrow();
  await expect(repository.get("invalid symbol")).rejects.toThrow();
});
it("passes scoped index/watchlist reads through the same replaceable directory port", async () => {
  const transport = vi.fn().mockResolvedValue({ items: [] });
  const repository = createLocalStockDirectory(transport);
  await repository.search({
    query: "Apple",
    limit: 50,
    offset: 50,
    collection: "sp500",
  });
  expect(transport).toHaveBeenLastCalledWith("directory.list", {
    query: "Apple",
    limit: 50,
    offset: 50,
    collection: "sp500",
  });
  await repository.search({
    query: "",
    limit: 50,
    offset: 0,
    collection: "watchlist",
    symbols: ["AAPL"],
  });
  expect(transport).toHaveBeenLastCalledWith("directory.list", {
    query: "",
    limit: 50,
    offset: 0,
    collection: "watchlist",
    symbols: ["AAPL"],
  });
  await expect(
    repository.search({
      query: "",
      limit: 50,
      offset: 0,
      collection: "sp500",
      symbols: ["AAPL"],
    }),
  ).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(2);
});
