import { useEffect, useState, useSyncExternalStore } from "react";
import { Copy, File, FolderOpen, RefreshCw } from "lucide-react";
import { StorageSession, type StorageCategory } from "@aifi/core";
import {
  getRuntimeInfo,
  readStorageFiles,
  readStorageUsage,
  readStorageDetails,
  revealStorageFile,
  type RuntimeInfo,
} from "@aifi/platform";
import { Button } from "../components/primitives";
import { useWorkspace } from "../workspace-context";

const storageSession = new StorageSession(
  readStorageUsage,
  readStorageFiles,
  readStorageDetails,
);
let lastRuntime: RuntimeInfo | undefined;

export function formatStorageBytes(bytes: number) {
  if (bytes === 0) return "0 bytes";
  if (bytes < 1024) return `${bytes} bytes`;
  const units = ["KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  const value = bytes / 1024 ** power;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 2 : 1 })} ${units[power - 1]}`;
}
function Breakdown({
  categories,
  total,
  label,
}: {
  categories: StorageCategory[];
  total: number;
  label: string;
}) {
  // Keep category colors stable when a refresh changes their size ranking.
  const ordered = categories
    .map((category, color) => ({ ...category, color }))
    .sort((a, b) => b.bytes - a.bytes || a.id.localeCompare(b.id));
  return (
    <div className="storage-breakdown">
      <div
        className="storage-meter"
        role="img"
        aria-label={`${label}: ${ordered.map((c) => `${c.label} ${formatStorageBytes(c.bytes)}`).join(", ")}`}
      >
        {ordered.map((category) => (
          <span
            key={category.id}
            className={`storage-color-${category.color}`}
            title={`${category.label}: ${formatStorageBytes(category.bytes)}`}
            style={{ width: `${total ? (category.bytes / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <dl className="storage-legend">
        {ordered.map((category) => (
          <div key={category.id}>
            <dt>
              <i
                className={`storage-color-${category.color}`}
                aria-hidden="true"
              />
              {category.label}
            </dt>
            <dd>{formatStorageBytes(category.bytes)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
export function StorageSettings() {
  const { notify } = useWorkspace();
  const { data, refreshing, loadingFiles, error } = useSyncExternalStore(
    storageSession.subscribe,
    storageSession.snapshot,
  );
  const [runtime, setRuntime] = useState<RuntimeInfo | undefined>(lastRuntime);
  useEffect(() => {
    let alive = true;
    void getRuntimeInfo().then((info) => {
      lastRuntime = info;
      if (alive) setRuntime(info);
    });
    void storageSession.refresh();
    return () => {
      alive = false;
    };
  }, []);
  const desktop = runtime?.kind === "desktop";
  const revealLabel =
    runtime?.platform === "darwin" ? "Show in Finder" : "Show in folder";
  async function locate(relativePath = "") {
    try {
      await revealStorageFile(relativePath);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Couldn't open the folder.");
    }
  }
  async function copyPath(relativePath = "") {
    if (!data) return;
    const path = relativePath
      ? `${data.dataDir.replace(/[\\/]$/, "")}/${relativePath}`
      : data.dataDir;
    try {
      await navigator.clipboard.writeText(path);
      notify("Path copied.");
    } catch {
      notify("Couldn't copy the path. Select and copy it from the list.");
    }
  }
  return (
    <div className="storage-settings" aria-busy={refreshing}>
      <section className="storage-overview">
        <div className="storage-section-heading storage-overview-heading">
          {data ? (
            <div className="storage-total">
              <strong>{formatStorageBytes(data.totalBytes)}</strong>
              <span>used</span>
            </div>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            className="storage-refresh"
            aria-label={refreshing ? "Updating storage" : "Refresh storage"}
            title={
              data
                ? `Refresh storage · Last updated ${new Date(data.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Refresh storage"
            }
            disabled={refreshing || loadingFiles}
            onClick={() => void storageSession.refresh()}
          >
            <RefreshCw
              size={14}
              className={refreshing ? "storage-refreshing" : ""}
              aria-hidden="true"
            />
          </Button>
        </div>
        {error && (
          <div className="settings-service-error" role="status">
            {error}
          </div>
        )}
        {!data && (
          <p className="storage-loading" role="status">
            {!error
              ? "Calculating storage…"
              : "Storage unavailable. Refresh to try again."}
          </p>
        )}
        {data && (
          <Breakdown
            categories={data.categories}
            total={data.totalBytes}
            label="Local file storage"
          />
        )}
      </section>
      {data && (
        <>
          <section className="setting-group storage-database">
            <div className="storage-section-heading">
              <div>
                <h2
                  title={
                    data.database.updatedAt
                      ? `Last updated ${new Date(data.database.updatedAt).toLocaleTimeString()}`
                      : undefined
                  }
                >
                  Database contents
                  {data.database.pending && (
                    <RefreshCw
                      size={13}
                      className="storage-refreshing"
                      aria-label="Updating database details"
                    />
                  )}
                </h2>
              </div>
              {data.database.bytes > 0 && (
                <span className="storage-number">
                  {formatStorageBytes(data.database.bytes)}
                </span>
              )}
            </div>
            {data.database.categories.length > 0 && (
              <Breakdown
                categories={data.database.categories}
                total={data.database.bytes}
                label="SQLite contents"
              />
            )}
            {data.database.error && !data.database.pending && (
              <p className="storage-loading" role="status">
                Database details unavailable
              </p>
            )}
          </section>
          <section className="setting-group storage-files">
            <div className="storage-section-heading">
              <h2>
                Files & folders{" "}
                <span className="storage-file-count">
                  {data.entryCount.toLocaleString()}
                </span>
              </h2>
            </div>
            <div className="storage-file-list">
              {data.files.map((file) => (
                <div className="storage-file-row" key={file.relativePath}>
                  {file.kind === "directory" ? (
                    <FolderOpen
                      size={18}
                      className="storage-file-icon"
                      aria-hidden="true"
                    />
                  ) : (
                    <File
                      size={18}
                      className="storage-file-icon"
                      aria-hidden="true"
                    />
                  )}
                  <div className="storage-file-name">
                    <strong title={file.relativePath}>
                      {file.kind === "directory"
                        ? file.relativePath || "Data folder"
                        : file.relativePath.split("/").at(-1)}
                    </strong>
                    {(file.kind === "directory" ||
                      file.relativePath.includes("/")) && (
                      <span title={file.relativePath}>
                        {file.kind === "directory"
                          ? `${file.fileCount.toLocaleString()} files`
                          : file.relativePath.includes("/")
                            ? file.relativePath.slice(
                                0,
                                file.relativePath.lastIndexOf("/"),
                              )
                            : ""}
                      </span>
                    )}
                  </div>
                  <span className="storage-number">
                    {formatStorageBytes(file.bytes)}
                  </span>
                  <Button
                    variant="ghost"
                    className="storage-reveal"
                    aria-label={`${desktop ? (file.kind === "directory" ? "Open folder" : revealLabel) : "Copy path"}: ${file.relativePath || "Data folder"}`}
                    title={
                      desktop
                        ? file.kind === "directory"
                          ? "Open folder"
                          : revealLabel
                        : "Copy path"
                    }
                    onClick={() =>
                      void (desktop
                        ? locate(file.relativePath)
                        : copyPath(file.relativePath))
                    }
                  >
                    {desktop ? <FolderOpen size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              ))}
              {!data.entryCount && (
                <div className="settings-empty">No files in this folder</div>
              )}
            </div>
            {data.files.length < data.entryCount && (
              <Button
                className="storage-load-more"
                disabled={loadingFiles || refreshing}
                onClick={() => void storageSession.loadMore()}
              >
                {loadingFiles ? "Loading…" : "Show more"}
              </Button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
