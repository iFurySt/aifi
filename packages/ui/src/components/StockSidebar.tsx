import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { StockAvatar } from "./StockAvatar";
import { validDirectorySymbol } from "@aifi/core";
import { useWorkspace } from "../workspace-context";
import {
  useDirectoryFeed,
  directoryExchange,
} from "../stock-directory-context";

export function StockSidebar({ onSelect }: { onSelect?: () => void }) {
  const { stockRoute, openStock, page } = useWorkspace();
  const [query, setQuery] = useState("");
  const data = useDirectoryFeed(query);
  const { loading, error, retry, loadMore } = data;
  const list = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: 0 });
  }, [query, data.snapshotId]);
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
                aria-label="Stock directory source"
                title="Nasdaq Trader · US listings"
              >
                Stocks <ChevronDown size={14} aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="dropdown-menu stock-source-menu"
                align="start"
                sideOffset={8}
                collisionPadding={12}
                aria-label="Stock directories"
              >
                <DropdownMenu.RadioGroup value="nasdaq">
                  <DropdownMenu.RadioItem
                    value="nasdaq"
                    className="dropdown-item stock-source-option"
                  >
                    Nasdaq Trader
                    <DropdownMenu.ItemIndicator>
                      <Check size={15} aria-hidden="true" />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </h2>
        {data.snapshotId && (
          <span className="count-badge">{data.total.toLocaleString()}</span>
        )}
      </div>
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
            {data.snapshotId
              ? "No matches."
              : "No directory yet. Sync in Settings."}
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
