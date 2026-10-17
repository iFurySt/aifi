import { afterEach, expect, it, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  symlink,
  truncate,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalStorageUsage } from "./storage-usage";
import { DataHost } from "./runtime";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "aifi-storage-test-"));
  roots.push(dir);
  return dir;
}
const database = async () => ({
  bytes: 4096,
  categories: [{ id: "system", label: "Settings", bytes: 4096 }],
});
it("inventories actual files, WAL and unknown files once, sorts descending, and keeps stable pages", async () => {
  const root = await directory();
  await mkdir(join(root, "stock-logos"));
  await writeFile(join(root, "aifi.sqlite"), Buffer.alloc(10000));
  await writeFile(join(root, "aifi.sqlite-wal"), Buffer.alloc(12000));
  await writeFile(join(root, "stock-logos/logo.png"), Buffer.alloc(1000));
  await writeFile(join(root, "aifi-vault.key"), "synthetic-private-value");
  for (let i = 0; i < 55; i++) {
    const folder = join(root, `extra-${String(i).padStart(2, "0")}`);
    await mkdir(folder);
    await writeFile(join(folder, "data.json"), "{}");
  }
  const storage = new LocalStorageUsage(root, database);
  const result = await storage.read();
  expect(result.fileCount).toBe(59);
  expect(result.totalBytes).toBe(
    23000 + 110 + Buffer.byteLength("synthetic-private-value"),
  );
  expect(result.categories.reduce((sum, c) => sum + c.bytes, 0)).toBe(
    result.totalBytes,
  );
  expect(result.categories.find((c) => c.id === "database")?.bytes).toBe(22000);
  expect(result.files[0]?.relativePath).toBe("");
  expect(result.files[0]?.kind).toBe("directory");
  expect(result.entryCount).toBe(57);
  expect(JSON.stringify(result)).not.toContain("synthetic-private-value");
  expect(result.files).toHaveLength(50);
  await writeFile(join(root, "new-file"), "new");
  const next = storage.files({ snapshotId: result.snapshotId, offset: 50 });
  expect(next.files).toHaveLength(7);
  expect(
    new Set([...result.files, ...next.files].map((f) => f.relativePath)).size,
  ).toBe(57);
  const refreshed = await storage.read();
  expect(refreshed.fileCount).toBe(60);
  expect(() =>
    storage.files({ snapshotId: result.snapshotId, offset: 50 }),
  ).toThrow("expired");
  for (const params of [
    { snapshotId: refreshed.snapshotId, offset: -50 },
    { snapshotId: refreshed.snapshotId, offset: 1 },
    { snapshotId: refreshed.snapshotId, offset: 0, arbitrary: true },
  ])
    expect(() => storage.files(params)).toThrow("Invalid");
});
it("never follows file/directory symlinks and rechecks native reveal ancestors", async () => {
  const root = await directory(),
    outside = await directory();
  await mkdir(join(root, "nested"));
  await writeFile(join(root, "nested/file"), "local");
  await writeFile(join(outside, "file"), "outside-secret");
  await symlink(join(outside, "file"), join(root, "linked-file"));
  await symlink(outside, join(root, "linked-directory"));
  const reveal = vi.fn();
  const storage = new LocalStorageUsage(root, database, reveal);
  const result = await storage.read();
  expect(result.files.map((f) => f.relativePath)).toEqual(["nested"]);
  await storage.reveal({ relativePath: "nested" });
  expect(reveal).toHaveBeenLastCalledWith(join(result.dataDir, "nested"), true);
  await storage.reveal({ relativePath: "" });
  expect(reveal).toHaveBeenLastCalledWith(result.dataDir, true);
  for (const path of [
    "../file",
    "/tmp/file",
    "nested/../file",
    "nested\\file",
    "nested//file",
    "linked-file",
    "unknown",
    "nested/file\0",
  ])
    await expect(storage.reveal({ relativePath: path })).rejects.toThrow();
  await rm(join(root, "nested"), { recursive: true });
  await symlink(outside, join(root, "nested"));
  await expect(storage.reveal({ relativePath: "nested" })).rejects.toThrow(
    "unavailable",
  );
  expect(reveal).toHaveBeenCalledTimes(2);
});
it("coalesces refreshes and never replaces a successful snapshot on failure", async () => {
  const root = await directory();
  const db = vi.fn(database);
  const storage = new LocalStorageUsage(root, db);
  const first = storage.read();
  expect(storage.read()).toBe(first);
  const result = await first;
  expect(result.fileCount).toBe(0);
  expect(db).toHaveBeenCalledTimes(1);
  db.mockRejectedValueOnce(Error("unavailable"));
  await expect(storage.read()).rejects.toThrow("unavailable");
  expect(
    storage.files({ snapshotId: result.snapshotId, offset: 0 }).files,
  ).toEqual([]);
  await expect(storage.reveal({ relativePath: "" })).rejects.toThrow("desktop");
});
it("routes through the host allowlist and does not send native paths to the Go service", async () => {
  const root = await directory();
  const reveal = vi.fn();
  const host = new DataHost("unused", root, true, reveal);
  const rpc = vi.fn(database);
  Object.assign(host, { rpc });
  await expect(host.request("storage.read", { path: "/tmp" })).rejects.toThrow(
    "Invalid",
  );
  const usage = await host.request("storage.read");
  expect(usage).toHaveProperty("fileCount", 0);
  expect(rpc).toHaveBeenCalledWith("storage.database");
  await host.request("storage.reveal", { relativePath: "" });
  expect(reveal).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("rolls legacy and v2 logo caches into one sorted directory entry without double counting", async () => {
  const root = await directory();
  await mkdir(join(root, "stock-logos/v2/nested"), { recursive: true });
  await writeFile(join(root, "stock-logos/v2/a.png"), Buffer.alloc(400));
  await writeFile(join(root, "stock-logos/v2/nested/b.png"), Buffer.alloc(600));
  await writeFile(join(root, "stock-logos/catalog.json"), Buffer.alloc(200));
  await writeFile(join(root, "aifi.sqlite"), Buffer.alloc(800));
  await symlink(
    join(root, "aifi.sqlite"),
    join(root, "stock-logos/v2/link.png"),
  );
  const reveal = vi.fn();
  const storage = new LocalStorageUsage(root, database, reveal);
  const usage = await storage.read();
  expect(usage.totalBytes).toBe(2000);
  expect(usage.fileCount).toBe(4);
  expect(usage.entryCount).toBe(2);
  expect(usage.categories.find((c) => c.id === "logos")?.bytes).toBe(1200);
  expect(usage.files[0]).toEqual({
    relativePath: "stock-logos",
    kind: "directory",
    fileCount: 3,
    bytes: 1200,
    category: "logos",
  });
  expect(usage.files.some((f) => f.relativePath.endsWith(".png"))).toBe(false);
  await storage.reveal({ relativePath: "stock-logos" });
  expect(reveal).toHaveBeenLastCalledWith(
    join(usage.dataDir, "stock-logos"),
    true,
  );
  await expect(
    storage.reveal({ relativePath: "stock-logos/v2/a.png" }),
  ).rejects.toThrow("unavailable");
  await rm(join(root, "stock-logos"), { recursive: true });
  await writeFile(join(root, "stock-logos"), "replaced");
  await expect(storage.reveal({ relativePath: "stock-logos" })).rejects.toThrow(
    "unavailable",
  );
});
it("includes empty logo cache folders as one entry with zero underlying files", async () => {
  const root = await directory();
  await mkdir(join(root, "stock-logos/v2"), { recursive: true });
  const usage = await new LocalStorageUsage(root, database).read();
  expect(usage.fileCount).toBe(0);
  expect(usage.entryCount).toBe(1);
  expect(usage.files[0]).toMatchObject({
    kind: "directory",
    bytes: 0,
    fileCount: 0,
  });
});
it("groups all small files by top-level directory and extracts only files strictly above 50 MB", async () => {
  const root = await directory();
  const limit = 50 * 1024 * 1024;
  await mkdir(join(root, "research/deep"), { recursive: true });
  await mkdir(join(root, "only-large"));
  for (const [path, bytes] of [
    ["exact.bin", limit],
    ["large.bin", limit + 1],
    ["small.json", 100],
    ["research/small.json", 200],
    ["research/deep/equal.bin", limit],
    ["research/deep/big.bin", limit + 2],
    ["only-large/big.bin", limit + 3],
  ] as const) {
    await writeFile(join(root, path), "");
    await truncate(join(root, path), bytes);
  }
  const reveal = vi.fn();
  const storage = new LocalStorageUsage(root, database, reveal);
  const usage = await storage.read();
  expect(usage.fileCount).toBe(7);
  expect(usage.entryCount).toBe(5);
  const singles = usage.files.filter((entry) => entry.kind === "file");
  expect(singles.map((f) => f.relativePath).sort()).toEqual([
    "large.bin",
    "only-large/big.bin",
    "research/deep/big.bin",
  ]);
  const folders = usage.files.filter((entry) => entry.kind === "directory");
  expect(folders).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        relativePath: "",
        bytes: limit + 100,
        fileCount: 2,
      }),
      expect.objectContaining({
        relativePath: "research",
        bytes: limit + 200,
        fileCount: 2,
      }),
    ]),
  );
  expect(usage.files.reduce((sum, f) => sum + f.bytes, 0)).toBe(
    usage.totalBytes,
  );
  expect(usage.files.reduce((sum, f) => sum + f.fileCount, 0)).toBe(
    usage.fileCount,
  );
  expect(usage.files.map((f) => f.bytes)).toEqual(
    usage.files.map((f) => f.bytes).sort((a, b) => b - a),
  );
  await storage.reveal({ relativePath: "research/deep/big.bin" });
  expect(reveal).toHaveBeenLastCalledWith(
    join(usage.dataDir, "research/deep/big.bin"),
    false,
  );
  await storage.reveal({ relativePath: "research" });
  expect(reveal).toHaveBeenLastCalledWith(
    join(usage.dataDir, "research"),
    true,
  );
  await storage.reveal({ relativePath: "" });
  expect(reveal).toHaveBeenLastCalledWith(usage.dataDir, true);
});
