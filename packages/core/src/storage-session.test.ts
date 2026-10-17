import { expect, it, vi } from "vitest";
import { StorageSession } from "./storage-session";
import type { StorageUsage } from "./storage-usage";
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function usage(snapshotId = "first", count = 120): StorageUsage {
  return {
    snapshotId,
    offset: 0,
    dataDir: "/fixture",
    scannedAt: "2026-10-17T08:00:00Z",
    totalBytes: count,
    fileCount: count,
    entryCount: count,
    database: { bytes: 0, categories: [] },
    categories: [],
    files: Array.from({ length: Math.min(50, count) }, (_, i) => ({
      relativePath: `file-${i}`,
      kind: "file",
      fileCount: 1,
      bytes: 1,
      category: "other",
    })),
  };
}
const page = async (snapshotId: string, offset: number) => ({
  snapshotId,
  offset,
  files: usage().files.map((f, i) => ({
    ...f,
    relativePath: `file-${offset + i}`,
  })),
});
it("keeps a completed scan when the view unsubscribes, and coalesces re-entry while refreshing", async () => {
  const waiting = deferred<StorageUsage>();
  const read = vi
    .fn()
    .mockReturnValueOnce(waiting.promise)
    .mockResolvedValueOnce(usage("second"));
  const session = new StorageSession(read, page);
  const listener = vi.fn();
  const unmount = session.subscribe(listener);
  const first = session.refresh();
  expect(session.refresh()).toBe(first);
  unmount();
  waiting.resolve(usage());
  await first;
  expect(listener).toHaveBeenCalledTimes(1);
  expect(session.snapshot().data?.files).toHaveLength(50);
  const previous = session.snapshot().data;
  const second = session.refresh();
  expect(session.snapshot().data).toBe(previous);
  expect(session.snapshot().refreshing).toBe(true);
  await second;
  expect(read).toHaveBeenCalledTimes(2);
  expect(session.snapshot().data?.snapshotId).toBe("second");
});
it("retains totals and rows on background failure", async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce(usage())
    .mockRejectedValueOnce(Error("offline"));
  const session = new StorageSession(read, page);
  await session.refresh();
  const good = session.snapshot().data;
  await session.refresh();
  expect(session.snapshot().data).toBe(good);
  expect(session.snapshot().refreshing).toBe(false);
  expect(session.snapshot().error).toContain("Couldn't update");
});
it("rebases the already-visible pages atomically after a refresh", async () => {
  const wait = deferred<Awaited<ReturnType<typeof page>>>();
  const files = vi.fn(page);
  const read = vi
    .fn()
    .mockResolvedValueOnce(usage())
    .mockResolvedValueOnce(usage("second"));
  const session = new StorageSession(read, files);
  await session.refresh();
  const append = session.loadMore();
  expect(session.loadMore()).toBe(append);
  await append;
  expect(session.snapshot().data?.files).toHaveLength(100);
  const old = session.snapshot().data;
  files.mockReturnValueOnce(wait.promise);
  const refresh = session.refresh();
  await Promise.resolve();
  await Promise.resolve();
  expect(session.snapshot().data).toBe(old);
  expect(files).toHaveBeenLastCalledWith("second", 50);
  wait.resolve(await page("second", 50));
  await refresh;
  expect(session.snapshot().data?.snapshotId).toBe("second");
  expect(session.snapshot().data?.files).toHaveLength(100);
});
it("keeps the old complete view if a refresh page is incomplete, and handles a shrinking list", async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce(usage())
    .mockResolvedValueOnce(usage("second"))
    .mockResolvedValueOnce(usage("third", 3));
  const files = vi.fn(page);
  const session = new StorageSession(read, files);
  await session.refresh();
  await session.loadMore();
  const old = session.snapshot().data;
  files.mockResolvedValueOnce({ snapshotId: "second", offset: 50, files: [] });
  await session.refresh();
  expect(session.snapshot().data).toBe(old);
  expect(session.snapshot().error).not.toBe("");
  await session.refresh();
  expect(session.snapshot().data?.files).toHaveLength(3);
  expect(session.snapshot().data?.entryCount).toBe(3);
  expect(session.snapshot().error).toBe("");
});
