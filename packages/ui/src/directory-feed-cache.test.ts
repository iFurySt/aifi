import { expect, it, vi } from "vitest";
import { DirectoryFeedCache } from "./directory-feed-cache";
import type { DirectoryPage, StockDirectoryRepository } from "@aifi/core";
const page = (offset = 0): DirectoryPage => ({
  scope: "candidates",
  snapshotId: "local-v1",
  offset,
  total: 100,
  items: Array.from({ length: 50 }, (_, i) => ({
    id: `S${offset + i}`,
    symbol: `S${offset + i}`,
    name: `Company ${offset + i}`,
    source: "fixture",
    exchangeCode: "Q",
    securityType: "stock",
  })),
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
it("finishes a slow first read while unmounted and reuses its prepared result", async () => {
  const read = deferred<DirectoryPage>(),
    preparation = deferred<void>();
  const search = vi.fn(() => read.promise),
    prepare = vi.fn((source: StockDirectoryRepository) => ({
      ...source,
      search: async (...args: Parameters<typeof source.search>) => {
        const result = await source.search(...args);
        await preparation.promise;
        return result;
      },
    }));
  const cache = new DirectoryFeedCache({ search, get: vi.fn() }, prepare);
  const first = cache.view("", "all-us");
  const unmount = first.subscribe(vi.fn());
  const pending = first.ensure();
  unmount();
  const returning = cache.view("", "all-us");
  expect(returning).toBe(first);
  expect(returning.ensure()).toBe(pending);
  read.resolve(page());
  await Promise.resolve();
  expect(returning.snapshot().state.items).toEqual([]);
  preparation.resolve();
  await pending;
  expect(cache.view("", "all-us").snapshot().state.items).toHaveLength(50);
  await returning.ensure();
  expect(search).toHaveBeenCalledTimes(1);
  expect(prepare).toHaveBeenCalledTimes(1);
});
it("restores all pages and scroll synchronously; stale failures never clear good rows", async () => {
  let now = 1;
  const search = vi.fn(async (q) => page(q.offset));
  const cache = new DirectoryFeedCache(
    { search, get: vi.fn() },
    undefined,
    () => now,
  );
  const view = cache.view("", "sp500");
  await view.ensure();
  await view.loadMore();
  view.scrollTop = 700;
  const saved = view.snapshot().state.items;
  for (let i = 0; i < 3; i++) await cache.view("", "sp500").ensure();
  expect(search).toHaveBeenCalledTimes(2);
  expect(view.snapshot().state.items).toBe(saved);
  expect(view.scrollTop).toBe(700);
  now += 60_001;
  search.mockRejectedValueOnce(Error("local read unavailable"));
  await view.ensure();
  expect(view.snapshot().state.items).toBe(saved);
  expect(view.snapshot().state.error).toBe("Directory unavailable");
  await view.retry();
  expect(view.snapshot().state.items).toHaveLength(100);
  expect(view.scrollTop).toBe(700);
});
it("isolates repositories and scopes; watchlist edits retain matching rows until local reads finish", async () => {
  const search = vi.fn(async () => ({ ...page(), total: 50 }));
  const cache = new DirectoryFeedCache({ search, get: vi.fn() });
  const all = cache.view("", "all-us");
  await all.ensure();
  const index = cache.view("", "nasdaq100");
  expect(index.snapshot().state.items).toEqual([]);
  const other = new DirectoryFeedCache({ search, get: vi.fn() });
  expect(other.view("", "all-us").snapshot().state.items).toEqual([]);
  const narrowed = cache.view("Company 1", "all-us");
  expect(narrowed.snapshot().preview).toBe(true);
  expect(
    narrowed.snapshot().state.items.every((r) => r.name.includes("Company 1")),
  ).toBe(true);
  const watch = cache.view("", "watchlist", ["S1", "S2"]);
  await watch.ensure();
  const changed = cache.view("", "watchlist", ["S2"]);
  expect(changed.snapshot().state.items.map((r) => r.symbol)).toEqual(["S2"]);
  expect(cache.view("", "watchlist", ["S2"])).toBe(changed);
});
it("reuses valid empty snapshots and bounds inactive views while protecting active reads", async () => {
  const search = vi.fn(async () => ({ ...page(), total: 0, items: [] }));
  const cache = new DirectoryFeedCache(
    { search, get: vi.fn() },
    undefined,
    undefined,
    2,
  );
  const active = cache.view("", "all-us"),
    unsubscribe = active.subscribe(vi.fn());
  await active.ensure();
  expect(active.snapshot().state.loading).toBe(false);
  await cache.view("", "all-us").ensure();
  expect(search).toHaveBeenCalledTimes(1);
  const first = cache.view("one", "sp500");
  cache.view("two", "sp500");
  expect(cache.view("one", "sp500")).not.toBe(first);
  expect(cache.view("", "all-us")).toBe(active);
  unsubscribe();
});
