import { it, expect, vi } from "vitest";
import { DirectoryFeed } from "./directory-feed";
import type { DirectoryPage, DirectoryEntry } from "./stock-directory";
const entry = (id: string): DirectoryEntry => ({
  id,
  symbol: id,
  name: id,
  source: "nasdaqlisted",
  exchangeCode: "NASDAQ",
  securityType: "unknown",
});
const page = (
  offset: number,
  ids: string[],
  snapshotId = "one",
  total = 4,
): DirectoryPage => ({
  offset,
  items: ids.map(entry),
  snapshotId,
  total,
  scope: "candidates",
});
function setup(search = vi.fn()) {
  const feed = new DirectoryFeed({ search, get: vi.fn() }, () => {}, 2);
  return { feed, search };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
it("appends a batch once for repeated bottom intersections and stops at the end", async () => {
  const { feed, search } = setup();
  search.mockResolvedValueOnce(page(0, ["A", "B"]));
  await feed.reset("");
  const next = deferred<DirectoryPage>();
  search.mockReturnValueOnce(next.promise);
  const work = feed.loadMore();
  await feed.loadMore();
  expect(search).toHaveBeenCalledTimes(2);
  expect(feed.state.items.map((e) => e.id)).toEqual(["A", "B"]);
  next.resolve(page(2, ["C", "D"]));
  await work;
  expect(feed.state.items.map((e) => e.id)).toEqual(["A", "B", "C", "D"]);
  expect(feed.state.hasMore).toBe(false);
  await feed.loadMore();
  expect(search).toHaveBeenCalledTimes(2);
});
it("ignores an old query response and disposal, even while a next page is pending", async () => {
  const { feed, search } = setup();
  const old = deferred<DirectoryPage>();
  search
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(page(0, ["NEW"], "two", 1));
  const first = feed.reset("old");
  await feed.reset("new");
  old.resolve(page(0, ["OLD"]));
  await first;
  expect(feed.state.query).toBe("new");
  expect(feed.state.items[0]?.id).toBe("NEW");
  const late = deferred<DirectoryPage>();
  search.mockReturnValueOnce(late.promise);
  const request = feed.refresh();
  feed.dispose();
  late.resolve(page(0, ["LATE"]));
  await request;
  expect(feed.state.items[0]?.id).toBe("NEW");
});
it("rebases instead of mixing snapshots and preserves loaded rows on an unchanged refresh", async () => {
  const { feed, search } = setup();
  search
    .mockResolvedValueOnce(page(0, ["A", "B"]))
    .mockResolvedValueOnce(page(2, ["C", "D"]))
    .mockResolvedValueOnce(page(0, ["A", "B"]));
  await feed.reset("");
  await feed.loadMore();
  await feed.refresh();
  expect(feed.state.items).toHaveLength(4);
  // Background import changes head, then the next batch sees the new snapshot.
  search.mockResolvedValueOnce(page(0, ["A", "B"], "one", 6));
  await feed.refresh();
  search
    .mockResolvedValueOnce(page(4, [], "two", 2))
    .mockResolvedValueOnce(page(0, ["X", "Y"], "two", 2));
  await feed.loadMore();
  expect(feed.state.items.map((e) => e.id)).toEqual(["X", "Y"]);
  expect(feed.state.snapshotId).toBe("two");
  expect(feed.state.hasMore).toBe(false);
});
it("keeps cached rows and retries the failed offset without skipping data", async () => {
  const { feed, search } = setup();
  search
    .mockResolvedValueOnce(page(0, ["A", "B"]))
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce(page(2, ["C", "D"]));
  await feed.reset("");
  await feed.loadMore();
  expect(feed.state.error).toBeTruthy();
  expect(feed.state.items).toHaveLength(2);
  await feed.retry();
  expect(search).toHaveBeenLastCalledWith({ query: "", offset: 2, limit: 2 });
  expect(feed.state.items).toHaveLength(4);
  expect(feed.state.error).toBe("");
});
it("distinguishes empty cache and empty search and rejects non-progressing pages", async () => {
  const { feed, search } = setup();
  search.mockResolvedValueOnce(page(0, [], "", 0));
  await feed.reset("");
  expect(feed.state.snapshotId).toBe("");
  expect(feed.state.hasMore).toBe(false);
  search.mockResolvedValueOnce(page(0, [], "one", 0));
  await feed.reset("missing");
  expect(feed.state.snapshotId).toBe("one");
  expect(feed.state.error).toBe("");
  search.mockResolvedValueOnce(page(0, [], "one", 4));
  await feed.reset("broken");
  expect(feed.state.error).toBeTruthy();
  expect(feed.state.hasMore).toBe(false);
});
