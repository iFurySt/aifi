import { DirectoryFeed, emptyDirectoryFeed } from "@aifi/core";
import type {
  DirectoryFeedState,
  StockCollection,
  StockDirectoryRepository,
} from "@aifi/core";

const freshness = 60_000;
interface ViewSnapshot {
  state: DirectoryFeedState;
  preview: boolean;
}
/** A local read belongs to the repository session, not to a mounted sidebar. */
export class DirectoryView {
  private feed: DirectoryFeed;
  private value: ViewSnapshot;
  private listeners = new Set<() => void>();
  private request?: Promise<void>;
  private checkedAt?: number;
  scrollTop = 0;
  constructor(
    repository: StockDirectoryRepository,
    query: string,
    initial?: DirectoryFeedState,
    private now = Date.now,
    private settled = () => {},
  ) {
    this.value = {
      state: initial ?? emptyDirectoryFeed(query),
      preview: !!initial,
    };
    this.feed = new DirectoryFeed(
      repository,
      (state) => {
        this.value = {
          state,
          preview: this.value.preview && (state.loading || !!state.error),
        };
        for (const listener of this.listeners) listener();
      },
      50,
      this.value.state,
    );
  }
  snapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      this.settled();
    };
  };
  get retained() {
    return !!this.request || this.listeners.size > 0;
  }
  private run(action: () => Promise<void>, head: boolean) {
    if (this.request) return this.request;
    const request = action()
      .then(() => {
        if (head && !this.value.state.error) this.checkedAt = this.now();
      })
      .finally(() => {
        if (this.request === request) this.request = undefined;
        this.settled();
      });
    this.request = request;
    return request;
  }
  ensure = () => {
    if (this.checkedAt !== undefined && this.now() - this.checkedAt < freshness)
      return Promise.resolve();
    return this.run(() => this.feed.refresh(), true);
  };
  loadMore = () => this.run(() => this.feed.loadMore(), false);
  retry = () => this.run(() => this.feed.retry(), true);
  dispose() {
    this.feed.dispose();
  }
}

/** Bounded presentation snapshots; SQLite is still the only durable directory. */
export class DirectoryFeedCache {
  private views = new Map<string, DirectoryView>();
  constructor(
    private repository: StockDirectoryRepository,
    private prepare = (source: StockDirectoryRepository) => source,
    private now = Date.now,
    private capacity = 32,
  ) {}
  private trim(protect?: string) {
    for (const [key, view] of this.views) {
      if (this.views.size <= this.capacity) break;
      if (key !== protect && !view.retained) {
        view.dispose();
        this.views.delete(key);
      }
    }
  }
  view(query: string, collection: StockCollection, watchlist: string[] = []) {
    query = query.trim();
    const symbols =
      collection === "watchlist" ? [...new Set(watchlist)].sort() : [];
    const key = JSON.stringify([collection, query, symbols]);
    let view = this.views.get(key);
    if (!view) {
      const prior = [...this.views.entries()]
        .reverse()
        .find(([oldKey, prior]) => {
          const [scope, oldQuery] = JSON.parse(oldKey) as [
            StockCollection,
            string,
          ];
          return (
            scope === collection &&
            prior.snapshot().state.snapshotId &&
            query.toLowerCase().startsWith(oldQuery.toLowerCase())
          );
        })?.[1];
      const rows = prior
        ?.snapshot()
        .state.items.filter(
          (entry) =>
            `${entry.symbol} ${entry.name}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (collection !== "watchlist" || symbols.includes(entry.symbol)),
        );
      const initial =
        prior && rows?.length
          ? {
              ...prior.snapshot().state,
              query,
              items: rows,
              total: rows.length,
              loading: true,
              loadingMore: false,
              hasMore: false,
              error: "",
            }
          : undefined;
      view = new DirectoryView(
        this.prepare({
          get: (symbol) => this.repository.get(symbol),
          search: (input) =>
            this.repository.search({
              ...input,
              collection,
              ...(collection === "watchlist" ? { symbols } : {}),
            }),
        }),
        query,
        initial,
        this.now,
        () => this.trim(key),
      );
      if (prior && query === prior.snapshot().state.query)
        view.scrollTop = prior.scrollTop;
      this.views.set(key, view);
    } else {
      this.views.delete(key);
      this.views.set(key, view);
    }
    this.trim(key);
    return view;
  }
}
