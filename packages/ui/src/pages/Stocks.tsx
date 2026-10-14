import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, Star, MessageCircle } from "lucide-react";
import {
  addWatchSymbol,
  sampleQuotes,
  stockTabs,
  validSymbol,
  validDirectorySymbol,
} from "@aifi/core";
import type { StockTab } from "@aifi/core";
import { useWorkspace, money, percent } from "../workspace-context";
import { Button } from "../components/primitives";
import { StockAvatar } from "../components/StockAvatar";
import { StockChart } from "../components/StockChart";
import {
  useStockDirectory,
  useDirectoryEntry,
  useDirectorySearch,
  directoryExchange,
} from "../stock-directory-context";
import { sampleBars, stockProfiles } from "./stock-fixtures";
const labels: Record<StockTab, string> = {
  chart: "Chart",
  financials: "Financials",
  funds: "Funds",
  politicians: "Politicians",
  insiders: "Insiders",
  analyst: "Analyst",
};
function EmptyTable({
  columns,
  message,
}: {
  columns: string[];
  message: string;
}) {
  return (
    <div className="table-panel">
      <div className="table-scroll">
        <table className="data-table stock-data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="stock-table-empty">
                {message}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Summary({ items }: { items: string[] }) {
  return (
    <div className="stock-summary">
      {items.map((label) => (
        <div key={label}>
          <span>{label}</span>
          <strong>—</strong>
        </div>
      ))}
    </div>
  );
}
function AnalystSummary() {
  return (
    <div className="stock-analyst-summary">
      <div className="stock-analyst-number">—</div>
      <p>Average price target</p>
      <div className="rating-scale">
        {["Strong sell", "Sell", "Hold", "Buy", "Strong buy"].map((s, i) => (
          <div key={s}>
            <span
              style={{
                background: [
                  "#b34c47",
                  "#ce8560",
                  "#c2aa68",
                  "#719f86",
                  "#217a54",
                ][i],
              }}
            />
            <small>{s}</small>
          </div>
        ))}
      </div>
      <small>No ratings yet</small>
    </div>
  );
}
function Activity({ kind }: { kind: "funds" | "politicians" | "insiders" }) {
  const [filter, setFilter] = useState("All");
  const config = {
    funds: {
      title: "Fund ownership",
      metrics: ["Reported funds", "Shares held", "Report period"],
      filters: ["All", "Added", "Reduced", "Exited"],
      columns: ["Fund", "Shares", "Value", "Change", "Report period"],
      empty: "No holdings data",
    },
    politicians: {
      title: "Politician trades",
      metrics: ["Purchases", "Sales", "Filers"],
      filters: ["All", "Buy", "Sell"],
      columns: [
        "Politician",
        "Transaction",
        "Reported range",
        "Traded",
        "Disclosed",
      ],
      empty: "No politician trades",
    },
    insiders: {
      title: "Insider activity",
      metrics: ["Purchases", "Sales", "Insiders"],
      filters: ["All", "Buy", "Sell"],
      columns: ["Insider", "Role", "Transaction", "Shares", "Value", "Date"],
      empty: "No insider trades",
    },
  }[kind];
  return (
    <section className="stock-tab-body">
      <h2>{config.title}</h2>
      <Summary items={config.metrics} />
      <div className="stock-table-toolbar">
        <div
          className="segmented-control"
          aria-label={`Filter ${config.title}`}
        >
          {config.filters.map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <small>
          {kind === "funds" ? "Reported holdings" : "Disclosed transactions"}
        </small>
      </div>
      <EmptyTable columns={config.columns} message={config.empty} />
    </section>
  );
}
function Financials({ symbol }: { symbol: string }) {
  const [view, setView] = useState("Metrics"),
    [period, setPeriod] = useState("Yearly");
  const profile = stockProfiles[symbol];
  const rows = profile
    ? ((
        {
          Metrics: [
            ["Revenue", profile.revenue],
            ["Gross profit", profile.revenue * 0.45],
            ["Net income", profile.income],
          ],
          Income: [
            ["Revenue", profile.revenue],
            ["Gross profit", profile.revenue * 0.45],
            ["Operating income", profile.income * 1.2],
            ["Net income", profile.income],
          ],
          Balance: [
            ["Cash", profile.revenue * 0.12],
            ["Total assets", profile.revenue * 0.9],
            ["Total liabilities", profile.revenue * 0.55],
            ["Equity", profile.revenue * 0.35],
          ],
          "Cash flow": [
            ["Operating cash flow", profile.income * 1.2],
            ["Capital expenditures", profile.income * 0.16],
            ["Free cash flow", profile.income * 1.04],
          ],
        } as Record<string, [string, number][]>
      )[view] ?? [])
    : [];
  return (
    <section className="stock-tab-body">
      <div className="stock-table-toolbar">
        <label>
          <span className="sr-only">Financial view</span>
          <select
            aria-label="Financial view"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            {["Metrics", "Income", "Balance", "Cash flow", "Filings"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        {view !== "Filings" && (
          <div className="segmented-control" aria-label="Financial period">
            {["Quarter", "Yearly"].map((p) => (
              <button
                key={p}
                className={period === p ? "selected" : ""}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      {view === "Filings" ? (
        <EmptyTable
          columns={["Form", "Report period", "Filed", "Document"]}
          message="No filings data"
        />
      ) : rows.length ? (
        <>
          <div className="table-panel">
            <div className="table-scroll">
              <table className="data-table stock-financial-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {(period === "Yearly"
                      ? ["FY 2025", "FY 2024", "FY 2023"]
                      : ["Q3 FY26", "Q2 FY26", "Q1 FY26"]
                    ).map((h) => (
                      <th className="number" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, value]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {[1, 0.94, 0.88].map((f) => (
                        <td key={f} className="number">
                          {money(
                            value *
                              f *
                              (period === "Quarter" && view !== "Balance"
                                ? 0.25
                                : 1),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="stock-footnote">USD billions · Sample financials</p>
        </>
      ) : (
        <EmptyTable
          columns={["Metric", "Latest period", "Previous period"]}
          message="No financial data"
        />
      )}
    </section>
  );
}
export function Stocks() {
  const { workspace, stockRoute, openStock, update, notify, research } =
    useWorkspace();
  const { symbol, tab } = stockRoute;
  const quote = sampleQuotes[symbol],
    profile = stockProfiles[symbol];
  const [query, setQuery] = useState("");
  const directory = useStockDirectory();
  const identity = useDirectoryEntry(symbol);
  const listing = identity.data.item;
  const suggestions = useDirectorySearch(query, 20);
  const searchSequence = useRef(0);
  useEffect(() => {
    searchSequence.current++;
    return () => {
      searchSequence.current++;
    };
  }, [symbol]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const watched = workspace.watchlist.includes(symbol);
  const bars = sampleBars(symbol);
  async function findStock(e: React.FormEvent) {
    e.preventDefault();
    const request = ++searchSequence.current;
    const input = query.trim();
    if (!input) return;
    try {
      const exact = validDirectorySymbol(input)
        ? await directory.get(input.toUpperCase())
        : null;
      const matches = exact?.item
        ? null
        : await directory.search({ query: input, limit: 20, offset: 0 });
      if (request !== searchSequence.current) return;
      const target =
        exact?.item?.symbol ?? matches?.items[0]?.symbol ?? input.toUpperCase();
      if (validDirectorySymbol(target)) {
        openStock(target, tab);
        setQuery("");
      } else notify("Choose a stock or enter a ticker.");
    } catch {
      if (request === searchSequence.current)
        notify("Directory unavailable. Try again.");
    }
  }

  function toggleWatch() {
    try {
      const watchlist = watched
        ? workspace.watchlist.filter((s) => s !== symbol)
        : addWatchSymbol(workspace.watchlist, symbol);
      update((w) => ({ ...w, watchlist }));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const latest = bars.at(-1),
    firstYear = bars.at(-252),
    firstYTD = bars.find((b) => b.date.startsWith("2026"));
  const metrics: [string, string][] = [
    ["Open", latest ? money(latest.open) : "—"],
    [
      "Previous close",
      quote ? money(quote.price / (1 + quote.change / 100)) : "—",
    ],
    [
      "YTD change",
      latest && firstYTD
        ? percent((latest.close / firstYTD.close - 1) * 100)
        : "—",
    ],
    [
      "12 month change",
      latest && firstYear
        ? percent((latest.close / firstYear.close - 1) * 100)
        : "—",
    ],
    ["Sector", profile ? "Technology" : "—"],
    ["P/E ratio", "—"],
    ["Volume", latest ? `${(latest.volume / 1e6).toFixed(1)}M` : "—"],
    ["Market cap", "—"],
    ["Industry", profile?.industry ?? "—"],
    ["Revenue", profile ? `$${profile.revenue.toFixed(1)}B · FY25` : "—"],
    ["Gross margin", profile ? "45.0% · FY25" : "—"],
    ["Net income", profile ? `$${profile.income.toFixed(1)}B · FY25` : "—"],
    [
      "Free cash flow",
      profile ? `$${(profile.income * 1.04).toFixed(1)}B · FY25` : "—",
    ],
    ["Short interest", "—"],
    [
      "52-week high",
      bars.length
        ? money(Math.max(...bars.slice(-252).map((b) => b.high)))
        : "—",
    ],
    [
      "52-week low",
      bars.length
        ? money(Math.min(...bars.slice(-252).map((b) => b.low)))
        : "—",
    ],
    ["RSI (14)", "—"],
  ];
  return (
    <div className="stocks-page">
      <header className="stock-company-header">
        <StockAvatar
          symbol={symbol}
          className="stock-company-mark"
          enabled={!!listing}
        />
        <div>
          <h1 title={listing?.name}>{listing?.name ?? symbol}</h1>
          <small>
            {symbol}
            {listing ? ` · ${directoryExchange(listing)}` : ""}
          </small>
          {!listing && (
            <small className="directory-status" role="status">
              {identity.loading
                ? "Loading…"
                : identity.error ||
                  (!identity.data.snapshotId
                    ? "No directory yet"
                    : "Not in directory")}
            </small>
          )}
        </div>
        <form className="stock-company-search" onSubmit={findStock}>
          <Search size={16} />
          <input
            aria-label="Search a stock"
            placeholder="Search a stock"
            list="stock-suggestions"
            maxLength={80}
            value={query}
            onChange={(e) => {
              searchSequence.current++;
              setQuery(e.target.value);
            }}
          />
          <datalist id="stock-suggestions">
            {suggestions.data.items.map((entry) => (
              <option value={entry.symbol} key={entry.id}>
                {entry.name}
              </option>
            ))}
          </datalist>
        </form>
        <Button
          aria-pressed={watched}
          disabled={!validSymbol(symbol)}
          title={
            !validSymbol(symbol)
              ? "This symbol format is not supported in watchlists yet"
              : undefined
          }
          onClick={toggleWatch}
        >
          <Star size={15} fill={watched ? "currentColor" : "none"} />
          {watched ? "Watching" : "Watchlist"}
        </Button>
      </header>
      <div className="stock-tabs" role="tablist" aria-label="Stock research">
        {stockTabs.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            role="tab"
            id={`stock-tab-${t}`}
            aria-controls={`stock-panel-${t}`}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => openStock(symbol, t)}
            onKeyDown={(e) => {
              let next: number | undefined;
              if (e.key === "ArrowRight") next = (i + 1) % stockTabs.length;
              else if (e.key === "ArrowLeft")
                next = (i + stockTabs.length - 1) % stockTabs.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = stockTabs.length - 1;
              if (next !== undefined) {
                e.preventDefault();
                openStock(symbol, stockTabs[next]!);
                buttons.current[next]?.focus();
              }
            }}
          >
            {labels[t]}
          </button>
        ))}
      </div>
      <section
        className="stock-panel"
        id={`stock-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`stock-tab-${tab}`}
      >
        {tab === "chart" && (
          <div className="stock-chart-layout">
            <div className="stock-identity-column">
              <section className="stock-quote">
                <small>Latest close{quote ? " · Sample" : ""}</small>
                <strong>{quote ? money(quote.price) : "—"}</strong>
                {quote && (
                  <p className={quote.change >= 0 ? "positive" : "negative"}>
                    {money(
                      quote.price - quote.price / (1 + quote.change / 100),
                    )}{" "}
                    ({percent(quote.change)})
                  </p>
                )}
                <small>{quote ? "Oct 12, 2026 · USD" : "No price data"}</small>
              </section>
              <section className="stock-about">
                <h2>
                  About {quote?.name ?? symbol}{" "}
                  {profile && <small className="muted">Sample</small>}
                </h2>
                <p>{profile?.description ?? "No company data"}</p>
                <button
                  className="text-link"
                  onClick={() => research(`Research ${symbol}.`)}
                >
                  <MessageCircle size={14} />
                  Ask about {symbol}
                </button>
              </section>
              <section className="stock-about">
                <h2>Analyst</h2>
                <AnalystSummary />
              </section>
              <section className="stock-about">
                <h2>Earnings</h2>
                <div className="earnings-placeholder">
                  <span>Actual EPS</span>
                  <span>Estimated EPS</span>
                  <div>No earnings data</div>
                </div>
              </section>
            </div>
            <div className="stock-metrics-column">
              <dl className="stock-metrics-grid">
                {metrics.map(([label, value], i) => (
                  <div key={label} className={i >= 8 ? "wide" : ""}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <section className="stock-peers">
                <h2>
                  Peers <small className="muted">Sample</small>
                </h2>
                {Object.entries(sampleQuotes)
                  .filter(([s]) => s !== symbol)
                  .map(([s, q]) => (
                    <button key={s} onClick={() => openStock(s)}>
                      <StockAvatar symbol={s} />
                      <span>
                        <strong>{s}</strong>
                        <small>{q.name}</small>
                      </span>
                      <span>
                        {money(q.price)}
                        <small
                          className={q.change >= 0 ? "positive" : "negative"}
                        >
                          {percent(q.change)}
                        </small>
                      </span>
                    </button>
                  ))}
              </section>
            </div>
            <div className="stock-visual-column">
              <StockChart symbol={symbol} />
              <section className="stock-digest">
                <h2>Digest</h2>
                <div className="stock-no-data">No news yet</div>
              </section>
              <section className="stock-digest">
                <div className="section-heading">
                  <h2>Recent filings</h2>
                  <button
                    className="text-link"
                    onClick={() => openStock(symbol, "financials")}
                  >
                    Financials <ArrowUpRight size={13} />
                  </button>
                </div>
                <EmptyTable
                  columns={["Form", "Filed"]}
                  message="No filings data"
                />
              </section>
            </div>
          </div>
        )}
        {tab === "financials" && <Financials symbol={symbol} />}
        {(tab === "funds" || tab === "politicians" || tab === "insiders") && (
          <Activity key={tab} kind={tab} />
        )}
        {tab === "analyst" && (
          <section className="stock-tab-body">
            <h2>Analyst ratings</h2>
            <Summary
              items={["Average target", "High / low target", "Consensus"]}
            />
            <AnalystSummary />
            <EmptyTable
              columns={["Date", "Firm", "Analyst", "Rating", "Price target"]}
              message="No analyst ratings"
            />
          </section>
        )}
      </section>
    </div>
  );
}
