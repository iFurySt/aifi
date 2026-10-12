import { useState } from "react";
import { ArrowUpRight, Plus, Search, Star, X } from "lucide-react";
import { addWatchSymbol, sampleQuotes } from "@aifi/core";
import { useWorkspace, money, percent } from "../workspace-context";
import {
  Button,
  EmptyState,
  IconButton,
  Modal,
  PageHeading,
  Sparkline,
  Tag,
} from "../components/primitives";
export function Watchlist() {
  const { workspace, update, notify, research } = useWorkspace();
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
  const filtered = workspace.watchlist.filter((s) =>
    `${s} ${sampleQuotes[s]?.name ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="page-container">
      <PageHeading
        title="A little closer to the companies you follow."
        description="Keep your ideas in view. Build the research before the conviction."
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
          {workspace.watchlist.length} symbols · sample quotes
        </span>
      </div>
      <div className="table-panel">
        <div className="table-scroll">
          <table className="data-table watchlist-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="number">Sample price</th>
                <th className="number">Sample change</th>
                <th>Illustrative trend</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const quote = sampleQuotes[s];
                return (
                  <tr key={s}>
                    <td>
                      <button
                        className="company-cell"
                        onClick={() =>
                          research(`Build a research outline for ${s}.`)
                        }
                      >
                        <span
                          className={`company-monogram tone-${s === "NVDA" ? "mint" : s === "AAPL" ? "peach" : "blue"}`}
                        >
                          {s.slice(0, 1)}
                        </span>
                        <span>
                          <strong>{s}</strong>
                          <small>{quote?.name ?? "Custom symbol"}</small>
                        </span>
                      </button>
                    </td>
                    <td className="number">
                      {quote ? (
                        money(quote.price)
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td
                      className={`number ${quote ? (quote.change >= 0 ? "positive" : "negative") : "muted"}`}
                    >
                      {quote ? percent(quote.change) : "—"}
                    </td>
                    <td>
                      {quote ? (
                        <Sparkline
                          points={quote.points}
                          positive={quote.change >= 0}
                        />
                      ) : (
                        <span className="muted">No sample data</span>
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
            title={
              query ? "No matching companies" : "Make room for your next idea"
            }
            description={
              query
                ? "Try another ticker or company name."
                : "Add a symbol to start a watchlist on this device."
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
      <div className="inset-note">
        <Star size={19} />
        <div>
          <strong>From a ticker to a thesis</strong>
          <p>
            Choose a company to start a research conversation. Prices and trends
            here are fixed examples, not current market data.
          </p>
        </div>
      </div>
      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="Add to your watchlist"
        description="Save a ticker locally. New symbols do not receive live prices."
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
