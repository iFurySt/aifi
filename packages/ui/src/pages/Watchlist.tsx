import { useState, useEffect, useContext } from "react";
import { ArrowUpRight, Plus, Search, X } from "lucide-react";
import {
  addWatchSymbol,
  priceMetrics,
  splitAdjustedBars,
  type StockResearch,
} from "@aifi/core";
import { useWorkspace, money, percent } from "../workspace-context";
import {
  Button,
  EmptyState,
  IconButton,
  Modal,
  PageHeading,
  Sparkline,
} from "../components/primitives";
import {
  StockResearchContext,
  prepareStockResearch,
} from "../stock-research-context";
import { useStockDirectory } from "../stock-directory-context";
import { StockAvatar } from "../components/StockAvatar";
export function Watchlist() {
  const { workspace, update, notify, research, openStock } = useWorkspace();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState("");
  function add() {
    try {
      const list = addWatchSymbol(workspace.watchlist, symbol);
      update((w) => ({ ...w, watchlist: list }));
      setAdding(false);
      setSymbol("");
      setError("");
      notify(`${list.at(-1)} added to your watchlist.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const reader = useContext(StockResearchContext),
    directory = useStockDirectory();
  const [quotes, setQuotes] = useState<
    Record<
      string,
      {
        name: string;
        price?: number;
        change?: number;
        points: number[];
        date?: string;
      }
    >
  >({});
  const symbolsKey = workspace.watchlist.join(",");
  useEffect(() => {
    let active = true,
      pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      let cursor = 0;
      const symbols = symbolsKey.split(",").filter(Boolean),
        next: typeof quotes = {};
      await Promise.all(
        Array.from({ length: Math.min(4, symbols.length) }, async () => {
          while (cursor < symbols.length) {
            const symbol = symbols[cursor++]!;
            try {
              const [data, identity] = await Promise.all([
                prepareStockResearch(reader, symbol),
                directory.get(symbol),
              ]);
              const bars = splitAdjustedBars(data as StockResearch).bars,
                m = priceMetrics(bars);
              next[symbol] = {
                name: identity.item?.name ?? symbol,
                price: m.latest?.close,
                change: m.change,
                points: bars.slice(-22).map((b) => b.close),
                date: m.latest?.date,
              };
            } catch {
              /* Keep last-good rows if one local read fails. */
            }
          }
        }),
      );
      if (active) setQuotes((old) => ({ ...old, ...next }));
      pending = false;
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [reader, directory, symbolsKey]);
  const filtered = workspace.watchlist.filter((s) =>
    `${s} ${quotes[s]?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page-container">
      <PageHeading
        title="Watchlist"
        action={
          <Button
            variant="primary"
            onClick={() => {
              setAdding(true);
              setError("");
            }}
          >
            <Plus size={16} />
            Add symbol
          </Button>
        }
      />
      <div className="data-toolbar">
        <label className="search-field compact">
          <Search size={16} />
          <input
            aria-label="Filter watchlist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a company…"
          />
        </label>
        <span className="section-meta">
          {workspace.watchlist.length} symbols · Latest stored close
        </span>
      </div>
      <div className="table-panel">
        <div className="table-scroll">
          <table className="data-table watchlist-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="number">Price</th>
                <th className="number">Change</th>
                <th>Trend</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const quote = quotes[s];
                return (
                  <tr key={s}>
                    <td>
                      <button
                        className="company-cell"
                        onClick={() => openStock(s)}
                      >
                        <StockAvatar symbol={s} />
                        <span>
                          <strong>{s}</strong>
                          <small>{quote?.name ?? s}</small>
                        </span>
                      </button>
                    </td>
                    <td className="number">
                      {quote?.price !== undefined ? (
                        money(quote.price)
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td
                      className={`number ${quote?.change !== undefined ? (quote.change >= 0 ? "positive" : "negative") : "muted"}`}
                    >
                      {quote?.change !== undefined
                        ? percent(quote.change)
                        : "—"}
                    </td>
                    <td>
                      {quote && quote.points.length > 1 ? (
                        <Sparkline
                          points={quote.points}
                          positive={(quote.change ?? 0) >= 0}
                        />
                      ) : (
                        <span className="muted">No price data</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <IconButton
                          label={`Research ${s}`}
                          onClick={() =>
                            research(`Build a research outline for ${s}.`)
                          }
                        >
                          <ArrowUpRight size={17} />
                        </IconButton>
                        <IconButton
                          label={`Remove ${s}`}
                          onClick={() => {
                            update((w) => ({
                              ...w,
                              watchlist: w.watchlist.filter((x) => x !== s),
                            }));
                            notify(`${s} removed.`);
                          }}
                        >
                          <X size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState
            title={query ? "No matching companies" : "Your watchlist is empty"}
            description={
              query ? "Try another ticker." : "Add a symbol to get started."
            }
            action={
              !query && (
                <Button onClick={() => setAdding(true)}>
                  <Plus size={15} />
                  Add symbol
                </Button>
              )
            }
          />
        )}
      </div>
      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="Add to your watchlist"
        description="Prices come from your local data cache."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="field-label" htmlFor="ticker">
            Ticker symbol
          </label>
          <input
            id="ticker"
            className="text-input"
            value={symbol}
            maxLength={10}
            onChange={(e) => {
              setSymbol(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="e.g. AAPL or BRK.B"
            autoFocus
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add symbol
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
