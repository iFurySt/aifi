import type {
  DirectoryEntry,
  DirectoryPage,
  StockDirectoryRepository,
} from "./stock-directory";
export interface DirectoryFeedState {
  query: string;
  items: DirectoryEntry[];
  total: number;
  snapshotId: string;
  loading: boolean;
  error: string;
  hasMore: boolean;
}
export const emptyDirectoryFeed = (query = ""): DirectoryFeedState => ({
  query,
  items: [],
  total: 0,
  snapshotId: "",
  loading: true,
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
  ) {}
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
    this.update({ ...this.state, loading: true, error: "" });
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
      const items = append
        ? [
            ...this.state.items,
            ...page.items.filter(
              (e) => !this.state.items.some((old) => old.id === e.id),
            ),
          ]
        : sameSnapshot && this.state.items.length > page.items.length
          ? [...page.items, ...this.state.items.slice(page.items.length)]
          : page.items;
      this.offset = append
        ? offset + page.items.length
        : sameSnapshot
          ? Math.max(this.offset, page.items.length)
          : page.items.length;
      this.update({
        query,
        items,
        total: page.total,
        snapshotId: page.snapshotId,
        loading: false,
        error: "",
        hasMore: this.offset < page.total,
      });
    } catch {
      if (generation === this.generation) this.retryAppend = append;
      if (generation === this.generation)
        this.update({
          ...this.state,
          loading: false,
          error: "Directory unavailable",
        });
    } finally {
      if (generation === this.generation) this.busy = false;
    }
  }
}
