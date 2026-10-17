export interface StorageCategory {
  id: string;
  label: string;
  bytes: number;
}
/** Logical SQLite pages, including indexes/free pages, independent of WAL size. */
export interface DatabaseStorage {
  bytes: number;
  categories: StorageCategory[];
}
export interface StorageFile {
  kind: "file" | "directory";
  /** Number of regular files represented by this entry. */
  fileCount: number;
  relativePath: string;
  bytes: number;
  category: string;
}
export interface StorageFilePage {
  snapshotId: string;
  offset: number;
  files: StorageFile[];
}
export interface StorageUsage extends StorageFilePage {
  dataDir: string;
  scannedAt: string;
  totalBytes: number;
  fileCount: number;
  entryCount: number;
  categories: StorageCategory[];
  database: DatabaseStorage;
}
