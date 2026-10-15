import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { StockAvatar } from "./StockAvatar";
import {
  stockCollections,
  validStockCollection,
  validDirectorySymbol,
} from "@aifi/core";
import { useWorkspace } from "../workspace-context";
import {
  useDirectoryFeed,
  directoryExchange,
} from "../stock-directory-context";

export function StockSidebar({ onSelect }: { onSelect?: () => void }) {
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
  const [query, setQuery] = useState("");
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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="stock-source-trigger"
                aria-label="Stock collection"
                title={selected.label}
              >
                {selected.heading} <ChevronDown size={14} aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="dropdown-menu stock-source-menu"
                align="start"
                sideOffset={8}
                collisionPadding={12}
                aria-label="Stock collections"
              >
                <DropdownMenu.RadioGroup
                  value={stockCollection}
                  onValueChange={(value) => {
                    if (validStockCollection(value)) {
                      selectStockCollection(value);
                      setQuery("");
                    }
                  }}
                >
                  {stockCollections.map((collection) => (
                    <DropdownMenu.RadioItem
                      key={collection.id}
                      value={collection.id}
                      className="dropdown-item stock-source-option"
                    >
                      {collection.label}
                      <DropdownMenu.ItemIndicator>
                        <Check size={15} aria-hidden="true" />
                      </DropdownMenu.ItemIndicator>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </h2>
        {data.snapshotId && (
          <span className="count-badge">{data.total.toLocaleString()}</span>
        )}
      </div>
      {data.collection?.snapshotDate && (
        <p
          className="stock-collection-date"
          title={`${data.collection.sourceName} · Retrieved ${data.collection.fetchedAt?.slice(0, 10)}`}
        >
          Snapshot {data.collection.snapshotDate}
        </p>
      )}
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
              <small title={entry.name}>{entry.name}</small>
            </span>
            <span className="stock-list-quote">
              <small>{directoryExchange(entry)}</small>
            </span>
          </button>
        ))}
        {loading && (
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
