import { Select } from "./Select";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { StockAvatar } from "./StockAvatar";
import {
  stockCollections,
  stockDisplayName,
  validStockCollection,
  validDirectorySymbol,
} from "@aifi/core";
import { useWorkspace } from "../workspace-context";
import {
  useDirectoryFeed,
  directoryExchange,
} from "../stock-directory-context";

export function StockSidebar({
  onSelect,
  query,
  onQueryChange: setQuery,
}: {
  onSelect?: () => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const {
    stockRoute,
    openStock,
    page,
    workspace,
    stockCollection,
    selectStockCollection,
    navigate,
  } = useWorkspace();
  const selected = stockCollections.find(
    (collection) => collection.id === stockCollection,
  )!;
  const data = useDirectoryFeed(query, stockCollection, workspace.watchlist);
  const { loading, error, retry, loadMore } = data;
  const list = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: 0 });
  }, [query, stockCollection, data.snapshotId]);
  useEffect(() => {
    if (!list.current || !sentinel.current || loading || error || !data.hasMore)
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root: list.current, rootMargin: "0px 0px 900px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [data.items.length, data.hasMore, loading, error, loadMore]);
  return (
    <div className="sidebar-inner stock-sidebar">
      <div className="stock-sidebar-heading">
        <h2>
          <Select
            label="Stock collection"
            value={stockCollection}
            triggerLabel={selected.heading}
            variant="heading"
            align="start"
            options={stockCollections.map((collection) => ({
              value: collection.id,
              label: collection.label,
            }))}
            onValueChange={(value) => {
              if (validStockCollection(value)) {
                selectStockCollection(value);
                setQuery("");
              }
            }}
          />
        </h2>

      </div>
      {!!data.collection?.unresolvedSymbols.length && (
        <p
          className="stock-collection-date"
          title={data.collection.unresolvedSymbols.join(", ")}
        >
          {data.collection.availableCount} / {data.collection.memberCount}{" "}
          available
        </p>
      )}
      <label className="search-field stock-list-search">
        <Search size={15} />
        <input
          aria-label="Filter stocks"
          placeholder="Find a stock…"
          value={query}
          maxLength={80}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />
      </label>
      <nav
        ref={list}
        className="stock-list"
        aria-label="Stock list"
        aria-busy={loading}
      >
        {data.items.map((entry) => (
          <button
            key={entry.id}
            disabled={!validDirectorySymbol(entry.symbol)}
            className={`stock-list-row ${page === "stocks" && stockRoute.symbol === entry.symbol ? "selected" : ""}`}
            aria-current={
              page === "stocks" && stockRoute.symbol === entry.symbol
                ? "page"
                : undefined
            }
            onClick={() => {
              openStock(entry.symbol, stockRoute.tab);
              onSelect?.();
            }}
          >
            <StockAvatar symbol={entry.symbol} />
            <span className="stock-list-name">
              <strong>{entry.symbol}</strong>
              <small title={entry.name}>
                {stockDisplayName(undefined, entry.name, entry.symbol)}
              </small>
            </span>
            <span className="stock-list-quote">
              <small>{directoryExchange(entry)}</small>
            </span>
          </button>
        ))}
        {loading && (!data.items.length || data.loadingMore) && (
          <p className="sidebar-hint" role="status">
            {data.items.length ? "Loading more…" : "Loading stocks…"}
          </p>
        )}
        {error && (
          <p className="sidebar-hint" role="status">
            {error}.{" "}
            <button className="text-link" onClick={retry}>
              Retry
            </button>
          </p>
        )}
        {!loading && !error && !data.items.length && (
          <p className="sidebar-hint">
            {stockCollection === "watchlist" &&
            workspace.watchlist.length === 0 ? (
              <>
                Your watchlist is empty.{" "}
                <button
                  className="text-link"
                  onClick={() => {
                    navigate("watchlist");
                    onSelect?.();
                  }}
                >
                  Add stocks
                </button>
              </>
            ) : data.snapshotId ? (
              "No matches."
            ) : (
              "No directory yet. Sync in Settings."
            )}
          </p>
        )}
        <div
          ref={sentinel}
          className="stock-list-sentinel"
          aria-hidden="true"
        />
      </nav>
    </div>
  );
}
