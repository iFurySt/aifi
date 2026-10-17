import type { StorageFilePage, StorageUsage } from "./storage-usage";

export interface StorageSessionState {
  data?: StorageUsage;
  refreshing: boolean;
  loadingFiles: boolean;
  error: string;
}

/** One renderer session: retain the visible inventory across Settings visits. */
export class StorageSession {
  private state: StorageSessionState = {
    refreshing: false,
    loadingFiles: false,
    error: "",
  };
  private listeners = new Set<() => void>();
  private reading?: Promise<void>;
  private paging?: Promise<void>;
  constructor(
    private read: () => Promise<StorageUsage>,
    private files: (
      snapshotId: string,
      offset: number,
    ) => Promise<StorageFilePage>,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<StorageSessionState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  refresh = (): Promise<void> => {
    if (this.reading) return this.reading;
    if (this.paging) return this.paging.then(this.refresh);
    const visible = this.state.data?.files.length ?? 0;
    this.publish({ refreshing: true, error: "" });
    this.reading = Promise.resolve()
      .then(async () => {
        try {
          let next = await this.read();
          // Publish a refreshed snapshot atomically with the already-visible range.
          // A successful background scan must not collapse a previously paged list.
          while (next.files.length < Math.min(visible, next.entryCount)) {
            const page = await this.files(next.snapshotId, next.files.length);
            if (
              page.snapshotId !== next.snapshotId ||
              page.offset !== next.files.length ||
              !page.files.length
            )
              throw Error("Incomplete storage page");
            next = { ...next, files: [...next.files, ...page.files] };
          }
          this.publish({ data: next, refreshing: false, error: "" });
        } catch {
          this.publish({
            refreshing: false,
            error: "Couldn't update storage. Try refreshing again.",
          });
        }
      })
      .finally(() => {
        this.reading = undefined;
      });
    return this.reading;
  };
  loadMore = (): Promise<void> => {
    if (this.paging) return this.paging;
    const data = this.state.data;
    if (!data || this.reading || data.files.length >= data.entryCount)
      return Promise.resolve();
    this.publish({ loadingFiles: true, error: "" });
    this.paging = Promise.resolve()
      .then(async () => {
        try {
          const page = await this.files(data.snapshotId, data.files.length);
          if (
            page.snapshotId !== data.snapshotId ||
            page.offset !== data.files.length ||
            !page.files.length
          )
            throw Error("Incomplete storage page");
          this.publish({
            data: { ...data, files: [...data.files, ...page.files] },
            loadingFiles: false,
          });
        } catch {
          this.publish({
            loadingFiles: false,
            error: "Couldn't load more files. Refresh and try again.",
          });
        }
      })
      .finally(() => {
        this.paging = undefined;
      });
    return this.paging;
  };
}
