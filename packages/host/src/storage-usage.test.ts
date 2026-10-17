import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
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
  for (let i = 0; i < 55; i++)
    await writeFile(
      join(root, `extra-${String(i).padStart(2, "0")}.json`),
      "{}",
    );
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
  expect(result.files[0]?.relativePath).toBe("aifi.sqlite-wal");
  expect(JSON.stringify(result)).not.toContain("synthetic-private-value");
  expect(result.files).toHaveLength(50);
  await writeFile(join(root, "new-file"), "new");
  const next = storage.files({ snapshotId: result.snapshotId, offset: 50 });
  expect(next.files).toHaveLength(9);
  expect(
    new Set([...result.files, ...next.files].map((f) => f.relativePath)).size,
  ).toBe(59);
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
  expect(result.files.map((f) => f.relativePath)).toEqual(["nested/file"]);
  await storage.reveal({ relativePath: "nested/file" });
  expect(reveal).toHaveBeenLastCalledWith(
    join(result.dataDir, "nested/file"),
    false,
  );
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
  await expect(storage.reveal({ relativePath: "nested/file" })).rejects.toThrow(
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
