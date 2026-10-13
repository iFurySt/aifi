import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { validDirectorySymbol } from "@aifi/core";
import { useWorkspace } from "../workspace-context";
import {
  useDirectorySearch,
  directoryExchange,
} from "../stock-directory-context";

export function StockSidebar({ onSelect }: { onSelect?: () => void }) {
  const { stockRoute, openStock, page } = useWorkspace();
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const { data, loading, error, retry } = useDirectorySearch(query, 50, offset);
  return (
    <div className="sidebar-inner stock-sidebar">
      <div className="stock-sidebar-heading">
        <h2>Stocks</h2>
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
            setOffset(0);
          }}
        />
      </label>
      <nav className="stock-list" aria-label="Stock list" aria-busy={loading}>
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
            <span className="stock-monogram">{entry.symbol.slice(0, 1)}</span>
            <span className="stock-list-name">
              <strong>{entry.symbol}</strong>
              <small title={entry.name}>{entry.name}</small>
            </span>
            <span className="stock-list-quote">
              <small>{directoryExchange(entry)}</small>
            </span>
          </button>
        ))}
        {loading && !data.items.length && (
          <p className="sidebar-hint" role="status">
            Loading stocks…
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
      </nav>
      <div className="stock-list-pagination">
        <button
          aria-label="Previous stocks"
          disabled={loading || offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          <ChevronLeft size={15} />
        </button>
        <small>
          {data.items.length
            ? `${offset + 1}–${offset + data.items.length}`
            : "—"}
        </small>
        <button
          aria-label="Next stocks"
          disabled={loading || offset + data.items.length >= data.total}
          onClick={() => setOffset(offset + 50)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <small className="stock-list-note">Nasdaq directory</small>
    </div>
  );
}
