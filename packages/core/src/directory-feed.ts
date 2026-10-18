import type {
  DirectoryEntry,
  CollectionInfo,
  DirectoryPage,
  StockDirectoryRepository,
} from "./stock-directory";
export interface DirectoryFeedState {
  collection?: CollectionInfo;
  query: string;
  items: DirectoryEntry[];
  total: number;
  snapshotId: string;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  hasMore: boolean;
}
export const emptyDirectoryFeed = (query = ""): DirectoryFeedState => ({
  query,
  items: [],
  total: 0,
  snapshotId: "",
  loading: true,
  loadingMore: false,
  error: "",
  hasMore: false,
});
/** Offset paging remains behind the domain port; UI asks only for the next batch. */
export class DirectoryFeed {
  state = emptyDirectoryFeed();
  private generation = 0;
  private busy = false;
  private offset = 0;
  private retryAppend = false;
  constructor(
    private repository: StockDirectoryRepository,
    private publish: (state: DirectoryFeedState) => void,
    private batchSize = 50,
    initial?: DirectoryFeedState,
  ) {
    if (initial) {
      this.state = {
        ...initial,
        loading: !initial.snapshotId,
        loadingMore: false,
      };
      this.offset = initial.items.length;
    }
  }
  private update(state: DirectoryFeedState) {
    this.state = state;
    this.publish(state);
  }
  reset(query: string) {
    this.generation++;
    this.busy = false;
    this.offset = 0;
    this.update(emptyDirectoryFeed(query.trim()));
    return this.read(false);
  }
  dispose() {
    this.generation++;
    this.busy = false;
  }
  loadMore() {
    return this.busy || !this.state.hasMore
      ? Promise.resolve()
      : this.read(true);
  }
  retry() {
    return this.read(this.retryAppend);
  }
  refresh() {
    return this.read(false);
  }
  private check(page: DirectoryPage, offset: number) {
    if (
      page.scope !== "candidates" ||
      page.offset !== offset ||
      !Number.isInteger(page.total) ||
      page.total < 0 ||
      (page.total < offset + page.items.length && page.items.length > 0) ||
      page.items.length > this.batchSize ||
      (page.items.length === 0 && page.total > offset) ||
      new Set(page.items.map((e) => e.id)).size !== page.items.length
    )
      throw Error("Invalid directory page.");
  }
  private async read(append: boolean) {
    if (this.busy) return;
    this.busy = true;
    const generation = this.generation,
      query = this.state.query,
      offset = append ? this.offset : 0;
    this.update({
      ...this.state,
      loading: true,
      loadingMore: append,
      error: "",
    });
    try {
      let page = await this.repository.search({
        query,
        limit: this.batchSize,
        offset,
      });
      if (generation !== this.generation) return;
      this.check(page, offset);
      // The head can advance between offset requests. Start at the new head,
      // preserving old rows until that first page succeeds rather than mixing versions.
      if (append && page.snapshotId !== this.state.snapshotId) {
        append = false;
        page = await this.repository.search({
          query,
          limit: this.batchSize,
          offset: 0,
        });
        if (generation !== this.generation) return;
        this.check(page, 0);
      }
      const sameSnapshot =
        !!page.snapshotId && page.snapshotId === this.state.snapshotId;
      let incoming = page.items;
      // Rebase the entire visible range atomically when the source head advances.
      // Publishing only the new first page would remove already-visible rows and
      // clamp scroll, even though the old good snapshot was still usable.
      if (
        !append &&
        !sameSnapshot &&
        this.state.items.length > incoming.length
      ) {
        const target = Math.min(this.state.items.length, page.total);
        while (incoming.length < target) {
          const more = await this.repository.search({
            query,
            limit: this.batchSize,
            offset: incoming.length,
          });
          if (generation !== this.generation) return;
          this.check(more, incoming.length);
          if (more.snapshotId !== page.snapshotId)
            throw Error("Directory changed during refresh.");
          incoming = [...incoming, ...more.items];
        }
      }
      const oldById = new Map(
        this.state.items.map((entry) => [entry.id, entry]),
      );
      incoming = incoming.map((entry) => {
        const old = oldById.get(entry.id);
        return old &&
          old.symbol === entry.symbol &&
          old.name === entry.name &&
          old.exchangeCode === entry.exchangeCode &&
          old.source === entry.source &&
          old.securityType === entry.securityType
          ? old
          : entry;
      });
      const items = append
        ? [
            ...this.state.items,
            ...incoming.filter((entry) => !oldById.has(entry.id)),
          ]
        : sameSnapshot && this.state.items.length > incoming.length
          ? [...incoming, ...this.state.items.slice(incoming.length)]
          : incoming;
      this.offset = append
        ? offset + page.items.length
        : sameSnapshot
          ? Math.max(this.offset, incoming.length)
          : incoming.length;
      this.update({
        query,
        collection: page.collection,
        items,
        total: page.total,
        snapshotId: page.snapshotId,
        loading: false,
        loadingMore: false,
        error: "",
        hasMore: this.offset < page.total,
      });
    } catch {
      if (generation === this.generation) this.retryAppend = append;
      if (generation === this.generation)
        this.update({
          ...this.state,
          loading: false,
          loadingMore: false,
          error: "Directory unavailable",
        });
    } finally {
      if (generation === this.generation) this.busy = false;
    }
  }
}
