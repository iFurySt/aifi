import { lstat, opendir, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  DatabaseStorage,
  StorageCategory,
  StorageFile,
  StorageUsage,
} from "../../core/src/storage-usage.ts";

const pageSize = 50;
const individualFileBytes = 50 * 1024 * 1024;
function fileCategory(path: string) {
  if (/^aifi\.sqlite(?:-(?:wal|shm|journal))?$/.test(path)) return "database";
  if (path.startsWith("stock-logos/")) return "logos";
  if (path.startsWith("chatgpt/") || path === "aifi-vault.key")
    return "account";
  return "other";
}
const categories = (): StorageCategory[] => [
  { id: "database", label: "SQLite database", bytes: 0 },
  { id: "logos", label: "Company logos", bytes: 0 },
  { id: "account", label: "Account & settings", bytes: 0 },
  { id: "other", label: "Other files", bytes: 0 },
];

export class LocalStorageUsage {
  private snapshot?: { usage: StorageUsage; files: StorageFile[] };
  private reading?: Promise<StorageUsage>;
  private databaseRequest?: Promise<DatabaseStorage>;
  private latestDatabase?: DatabaseStorage;
  constructor(
    private dataDir: string,
    private database: () => Promise<DatabaseStorage>,
    private nativeReveal?: (
      path: string,
      directory: boolean,
    ) => Promise<void> | void,
  ) {}
  read(): Promise<StorageUsage> {
    if (this.reading) return this.reading;
    this.reading = this.scan().finally(() => {
      this.reading = undefined;
    });
    return this.reading;
  }
  details(): Promise<DatabaseStorage> {
    if (this.databaseRequest) return this.databaseRequest;
    this.databaseRequest = Promise.resolve()
      .then(this.database)
      .then(
        (value) => {
          this.latestDatabase = value;
          return value;
        },
        () => {
          const fallback: DatabaseStorage = {
            ...(this.latestDatabase ?? { bytes: 0, categories: [] }),
            pending: false,
            error: "Database details unavailable.",
          };
          this.latestDatabase = fallback;
          return fallback;
        },
      )
      .finally(() => {
        this.databaseRequest = undefined;
      });
    return this.databaseRequest;
  }
  private async scan(): Promise<StorageUsage> {
    // File metadata must never wait for optional SQL diagnostics or its RPC queue.
    void this.details();
    const root = await realpath(this.dataDir);
    const files: StorageFile[] = [];
    const groups = categories();
    const folders = new Map<
      string,
      { entry: StorageFile; totalFiles: number }
    >();
    const folderFor = (relativePath: string) => {
      let folder = folders.get(relativePath);
      if (!folder) {
        folder = {
          entry: {
            relativePath,
            kind: "directory",
            fileCount: 0,
            bytes: 0,
            category: fileCategory(relativePath + "/"),
          },
          totalFiles: 0,
        };
        folders.set(relativePath, folder);
      }
      return folder;
    };
    const deadline = Date.now() + 10000;
    let entries = 0;
    let fileCount = 0;
    const walk = async (parts: string[], container = "") => {
      let dir;
      try {
        dir = await opendir(join(root, ...parts));
      } catch (error) {
        if (
          ["ENOENT", "ENOTDIR"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          return;
        throw error;
      }
      for await (const entry of dir) {
        if (++entries > 100000 || Date.now() > deadline)
          throw Error(
            "Storage scan is too large. Try again after reducing the data directory.",
          );
        const child = [...parts, entry.name];
        const relativePath = child.join("/");
        if (relativePath.length > 2048)
          throw Error("Storage path is too long.");
        // Never follow symlinks, including links to other data-directory files.
        let info;
        try {
          info = await lstat(join(root, ...child));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        if (info.isSymbolicLink()) continue;
        if (info.isDirectory()) {
          const parent = parts.length === 0 ? relativePath : container;
          folderFor(parent);
          await walk(child, parent);
          continue;
        }
        if (!info.isFile()) continue;
        const category = fileCategory(relativePath);
        const folder = folderFor(container);
        folder.totalFiles++;
        fileCount++;
        if (info.size > individualFileBytes) {
          files.push({
            relativePath,
            kind: "file",
            fileCount: 1,
            bytes: info.size,
            category,
          });
        } else {
          folder.entry.bytes += info.size;
          folder.entry.fileCount++;
        }
        groups.find((g) => g.id === category)!.bytes += info.size;
      }
    };
    try {
      await walk([]);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Storage"))
        throw error;
      throw Error(
        "Storage scan failed. Check access to the data directory and refresh.",
      );
    }
    // Each file contributes to one row: a large-file outlier or its top-level
    // directory's remainder. Root-level small files share the data-folder row.
    for (const { entry, totalFiles } of folders.values()) {
      if (entry.fileCount || totalFiles === 0) files.push(entry);
    }
    files.sort(
      (a, b) =>
        b.bytes - a.bytes || a.relativePath.localeCompare(b.relativePath),
    );
    const usage: StorageUsage = {
      snapshotId: randomUUID(),
      offset: 0,
      dataDir: root,
      scannedAt: new Date().toISOString(),
      totalBytes: groups.reduce((sum, g) => sum + g.bytes, 0),
      fileCount,
      entryCount: files.length,
      categories: groups,
      database: {
        ...(this.latestDatabase ?? { bytes: 0, categories: [] }),
        pending: !!this.databaseRequest || !!this.latestDatabase?.pending,
      },
      files: files.slice(0, pageSize),
    };
    this.snapshot = { usage, files };
    return usage;
  }
  files(params: unknown) {
    const p = params as { snapshotId?: unknown; offset?: unknown };
    if (
      !p ||
      typeof p !== "object" ||
      Object.keys(p).length !== 2 ||
      typeof p.snapshotId !== "string" ||
      !Number.isSafeInteger(p.offset) ||
      (p.offset as number) < 0 ||
      (p.offset as number) % pageSize !== 0
    )
      throw Error("Invalid storage page.");
    if (!this.snapshot || p.snapshotId !== this.snapshot.usage.snapshotId)
      throw Error("Storage list expired. Refresh to load the current files.");
    const offset = p.offset as number;
    return {
      snapshotId: p.snapshotId,
      offset,
      files: this.snapshot.files.slice(offset, offset + pageSize),
    };
  }
  async reveal(params: unknown) {
    if (!this.nativeReveal)
      throw Error("Open the desktop app to reveal local files.");
    const p = params as { relativePath?: unknown };
    if (
      !p ||
      typeof p !== "object" ||
      Object.keys(p).length !== 1 ||
      typeof p.relativePath !== "string" ||
      p.relativePath.length > 2048 ||
      isAbsolute(p.relativePath) ||
      /[\\\0]/.test(p.relativePath) ||
      (p.relativePath !== "" &&
        p.relativePath
          .split("/")
          .some((part) => !part || part === "." || part === ".."))
    )
      throw Error("Invalid storage path.");
    const root = await realpath(this.dataDir);
    if (!p.relativePath) {
      await this.nativeReveal(root, true);
      return;
    }
    const entry = this.snapshot?.files.find(
      (file) => file.relativePath === p.relativePath,
    );
    if (root !== this.snapshot?.usage.dataDir || !entry)
      throw Error("Storage file unavailable. Refresh the file list.");
    const parts = p.relativePath.split("/");
    // Recheck all ancestors at the moment of reveal; stale rows cannot escape
    // the configured root through a replaced directory/symlink.
    for (let i = 0; i < parts.length; i++) {
      let info;
      try {
        info = await lstat(join(root, ...parts.slice(0, i + 1)));
      } catch {
        throw Error("Storage file unavailable. Refresh the file list.");
      }
      if (
        info.isSymbolicLink() ||
        (i < parts.length - 1 || entry.kind === "directory"
          ? !info.isDirectory()
          : !info.isFile())
      )
        throw Error("Storage file unavailable. Refresh the file list.");
    }
    const path = resolve(root, ...parts);
    await this.nativeReveal(path, entry.kind === "directory");
  }
}
