import { useState } from "react";
import { Search } from "lucide-react";
import { sampleQuotes } from "@aifi/core";
import { useWorkspace, money, percent } from "../workspace-context";

export function StockSidebar({ onSelect }: { onSelect?: () => void }) {
  const { workspace, stockRoute, openStock, page } = useWorkspace();
  const [query, setQuery] = useState("");
  const symbols = [
    ...new Set([
      "AAPL",
      "MSFT",
      "NVDA",
      ...Object.keys(sampleQuotes),
      ...workspace.watchlist,
      ...(page === "stocks" ? [stockRoute.symbol] : []),
    ]),
  ];
  const matches = symbols.filter((s) =>
    `${s} ${sampleQuotes[s]?.name ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="sidebar-inner stock-sidebar">
      <div className="stock-sidebar-heading">
        <h2>Stocks</h2>
        <span className="count-badge">{symbols.length}</span>
      </div>
      <label className="search-field stock-list-search">
        <Search size={15} />
        <input
          aria-label="Filter stocks"
          placeholder="Find a stock…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <nav className="stock-list" aria-label="Stock list">
        {matches.map((symbol) => {
          const quote = sampleQuotes[symbol];
          return (
            <button
              key={symbol}
              className={`stock-list-row ${page === "stocks" && stockRoute.symbol === symbol ? "selected" : ""}`}
              aria-current={
                page === "stocks" && stockRoute.symbol === symbol
                  ? "page"
                  : undefined
              }
              onClick={() => {
                openStock(symbol, stockRoute.tab);
                onSelect?.();
              }}
            >
              <span className="stock-monogram">{symbol.slice(0, 1)}</span>
              <span className="stock-list-name">
                <strong>{symbol}</strong>
                <small>{quote?.name ?? "Custom symbol"}</small>
              </span>
              <span className="stock-list-quote">
                {quote ? (
                  <>
                    <strong>{money(quote.price)}</strong>
                    <small
                      className={quote.change >= 0 ? "positive" : "negative"}
                    >
                      {percent(quote.change)}
                    </small>
                  </>
                ) : (
                  <small>—</small>
                )}
              </span>
            </button>
          );
        })}
        {!matches.length && <p className="sidebar-hint">No matches.</p>}
      </nav>
      <small className="stock-list-note">Sample quotes</small>
    </div>
  );
}
