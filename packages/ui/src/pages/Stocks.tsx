import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Search,
  Star,
  MessageCircle,
  Moon,
  Sun,
  Triangle,
} from "lucide-react";
import {
  addWatchSymbol,
  priceMetrics,
  stockQuotePresentation,
  splitAdjustedBars,
  trailingMetric,
  stockTabs,
  stockDisplayName,
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
import { useStockResearch } from "../stock-research-context";
import {
  SourceNote,
  Financials,
  Activity,
  AnalystSummary,
  AnalystPanel,
  FilingsTable,
  Earnings,
  Digest,
  MissingData,
  overviewFinancials,
} from "./stock-research-panels";
const labels: Record<StockTab, string> = {
  chart: "Chart",
  financials: "Financials",
  funds: "Funds",
  politicians: "Politicians",
  insiders: "Insiders",
  analyst: "Analyst",
};
export function Stocks() {
  const { workspace, stockRoute, openStock, update, notify, research } =
    useWorkspace();
  const { symbol, tab } = stockRoute;
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const { data, loading, error } = useStockResearch(symbol);
  const profile =
    data.datasets.profile?.data.profile ?? data.datasets.filings?.data.profile;
  const adjusted = useMemo(() => splitAdjustedBars(data), [data]);
  const bars = adjusted.bars;
  const calculated = priceMetrics(bars);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const shown = stockQuotePresentation(data, clock);
  const quote = calculated.latest
    ? {
        price: calculated.latest.close,
        change: calculated.change,
        name: profile?.name ?? symbol,
      }
    : undefined;
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
  const latest = calculated.latest;
  const formattedPercent = (n: number | undefined) =>
    n === undefined ? "—" : percent(n);
  const facts = data.datasets.facts?.data.facts ?? [],
    eps = trailingMetric(facts, "eps");
  const metrics: [string, string][] = [
    ["Open", latest ? money(latest.open) : "—"],
    [
      "Previous close",
      calculated.previous ? money(calculated.previous.close) : "—",
    ],
    ["YTD change", formattedPercent(calculated.ytd)],
    ["12 month change", formattedPercent(calculated.yearChange)],
    ["Industry", profile?.industry ?? "—"],
    [
      "P/E ratio",
      latest && eps && eps.value > 0
        ? (latest.close / eps.value).toFixed(1) + " · " + eps.basis
        : "—",
    ],
    [
      "Volume",
      latest
        ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(
            latest.volume,
          )
        : "—",
    ],
    [
      "Market cap",
      latest && profile?.shares
        ? new Intl.NumberFormat("en-US", {
            notation: "compact",
            style: "currency",
            currency: "USD",
          }).format(latest.close * profile.shares)
        : "—",
    ],
    ...overviewFinancials(data),
    ["52-week high", calculated.high52 ? money(calculated.high52) : "—"],
    ["52-week low", calculated.low52 ? money(calculated.low52) : "—"],
    ["RSI (14)", calculated.rsi?.toFixed(1) ?? "—"],
    ["Short interest", "—"],
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
          <h1>{stockDisplayName(profile?.name, listing?.name, symbol)}</h1>
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
      {error && (
        <div className="stock-no-data" role="status">
          {error}
        </div>
      )}
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
                <div className="stock-market-state">
                  {shown.status === "Market Open" ? (
                    <Sun size={16} />
                  ) : (
                    <Moon size={16} />
                  )}
                  <span>{shown.status}</span>
                </div>
                <div className="stock-quote-price">
                  <strong>
                    {shown.price !== undefined ? (
                      <>
                        <span className="stock-quote-currency">$</span>
                        {shown.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </>
                    ) : (
                      "—"
                    )}
                  </strong>
                  <span
                    className={`stock-symbol-pill ${shown.change !== undefined && shown.change < 0 ? "down" : ""}`}
                  >
                    {symbol}
                  </span>
                </div>
                {shown.change !== undefined &&
                  shown.changePercent !== undefined && (
                    <p
                      className={`stock-daily-change ${shown.change >= 0 ? "positive" : "negative"}`}
                    >
                      <Triangle
                        size={10}
                        fill="currentColor"
                        style={{
                          transform:
                            shown.change < 0 ? "rotate(180deg)" : undefined,
                        }}
                      />{" "}
                      {shown.change >= 0 ? "+" : ""}
                      {money(shown.change)} ({percent(shown.changePercent)}){" "}
                      <span>regular session</span>
                    </p>
                  )}
                <small>
                  {shown.asOf
                    ? new Date(shown.asOf).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })
                    : (shown.date ??
                      (loading ? (
                        "Loading…"
                      ) : (
                        <MissingData data={data} dataset="prices" />
                      )))}
                </small>
                {shown.postPrice !== undefined && (
                  <div
                    className="stock-post-quote"
                    title={
                      shown.postAsOf
                        ? new Date(shown.postAsOf).toLocaleString("en-US", {
                            timeZone: "America/New_York",
                            timeZoneName: "short",
                          })
                        : undefined
                    }
                  >
                    <span>After hours</span>
                    <strong>{money(shown.postPrice)}</strong>
                    {shown.postChange !== undefined && (
                      <span
                        className={
                          shown.postChange >= 0 ? "positive" : "negative"
                        }
                      >
                        {shown.postChange >= 0 ? "+" : ""}
                        {money(shown.postChange)}
                      </span>
                    )}
                  </div>
                )}
              </section>
              <section className="stock-about">
                <h2>About {quote?.name ?? symbol} </h2>
                <p>
                  {profile?.description
                    ? profile.description.length > 420 &&
                      expandedCompany !== symbol
                      ? `${profile.description.slice(0, 417)}…`
                      : profile.description
                    : "No company data"}
                </p>
                {profile?.description && profile.description.length > 420 && (
                  <button
                    className="text-link"
                    onClick={() =>
                      setExpandedCompany(
                        expandedCompany === symbol ? null : symbol,
                      )
                    }
                  >
                    {expandedCompany === symbol ? "Show less" : "Read more"}
                  </button>
                )}
                {profile && (
                  <p className="stock-footnote">
                    {[
                      profile.sector,
                      profile.country,
                      profile.employees
                        ? `${profile.employees.toLocaleString()} employees`
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <SourceNote
                  view={data.datasets.profile ?? data.datasets.filings}
                />
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
                <AnalystSummary data={data} />
              </section>
              <section className="stock-about">
                <h2>Earnings</h2>
                <Earnings data={data} />
              </section>
            </div>
            <div className="stock-metrics-column">
              <dl className="stock-metrics-grid">
                {metrics.map(([label, value], i) => (
                  <div key={label} className={i >= 8 ? "wide" : ""}>
                    <dt>{label}</dt>
                    <dd
                      title={
                        label === "Market cap" && profile?.sharesDate
                          ? `Company share reference: ${profile.sharesDate}`
                          : undefined
                      }
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <section className="stock-peers">
                <h2>Peers</h2>
                <div className="stock-no-data">No peer data</div>
              </section>
            </div>
            <div className="stock-visual-column">
              <StockChart
                symbol={symbol}
                bars={bars}
                adjusted={adjusted.adjusted}
              />
              <SourceNote view={data.datasets.prices} />
              <section className="stock-digest">
                <h2>Digest</h2>
                <Digest data={data} />
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
                <FilingsTable data={data} compact />
              </section>
            </div>
          </div>
        )}
        {tab === "financials" && <Financials data={data} />}
        {(tab === "funds" || tab === "politicians" || tab === "insiders") && (
          <Activity key={tab} kind={tab} data={data} />
        )}
        {tab === "analyst" && <AnalystPanel data={data} />}
      </section>
    </div>
  );
}
