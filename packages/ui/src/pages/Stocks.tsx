import { useExchangeTime } from "../use-exchange-time";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { StockLoading } from "../components/StockLoading";
import { Analysts } from "./Analysts";
import { Insiders } from "./Insiders";
import { Politicians } from "./Politicians";
import { Funds } from "./Funds";
import { Financials } from "./Financials";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
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
} from "@aifi/core";
import type { StockTab } from "@aifi/core";
import { useWorkspace, money, percent } from "../workspace-context";
import { Button } from "../components/primitives";
import { StockAvatar } from "../components/StockAvatar";
import { StockChart } from "../components/StockChart";
import { StockPeers } from "../components/StockPeers";
import { ExchangeClock } from "../components/ExchangeClock";
import {
  useDirectoryEntry,
  directoryExchange,
} from "../stock-directory-context";
import { useStockResearch } from "../stock-research-context";
import {
  SourceNote,
  AnalystSummary,
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
  const initialLoading =
    loading && !data.bars.length && !Object.keys(data.datasets).length;
  const profile =
    data.datasets.profile?.data.profile ?? data.datasets.filings?.data.profile;
  const adjusted = useMemo(() => splitAdjustedBars(data), [data]);
  const bars = adjusted.bars;
  const calculated = priceMetrics(bars);
  const clock = useExchangeTime();
  const shown = stockQuotePresentation(data, clock);
  const quote = calculated.latest
    ? {
        price: calculated.latest.close,
        change: calculated.change,
        name: profile?.name ?? symbol,
      }
    : undefined;
  const identity = useDirectoryEntry(symbol);
  const listing = identity.data.item;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const watched = workspace.watchlist.includes(symbol);
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
    ["Sector", profile?.sector ?? "—"],
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
      shown.marketCap !== undefined || (latest && profile?.shares)
        ? new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 2,
            style: "currency",
            currency: "USD",
          }).format(shown.marketCap ?? latest!.close * profile!.shares!)
        : "—",
    ],
    ["Industry", profile?.industry ?? "—"],
    ...overviewFinancials(data),
    ["52-week high", calculated.high52 ? money(calculated.high52) : "—"],
    ["52-week low", calculated.low52 ? money(calculated.low52) : "—"],
    ["RSI (14)", calculated.rsi?.toFixed(1) ?? "—"],
    ["Short interest", "—"],
  ];
  const sign = (n: number | undefined) =>
    n === undefined || n === 0 ? "" : n > 0 ? "positive" : "negative";
  const metricTone = (label: string) => {
    if (label === "Open")
      return sign(latest ? latest.close - latest.open : undefined);
    if (label === "Previous close") return sign(calculated.change);
    if (label === "YTD change") return sign(calculated.ytd);
    if (label === "12 month change") return sign(calculated.yearChange);
    if (label === "Gross margin")
      return sign(trailingMetric(facts, "grossProfit")?.value);
    if (label === "Net income")
      return sign(trailingMetric(facts, "netIncome")?.value);
    if (label === "Free cash flow") {
      const cash = trailingMetric(facts, "operatingCashFlow"),
        capex = trailingMetric(facts, "capex");
      return sign(
        cash && capex && cash.end === capex.end && cash.basis === capex.basis
          ? cash.value - capex.value
          : undefined,
      );
    }
    return "";
  };
  useLayoutEffect(() => {
    const strip = buttons.current[0]?.parentElement;
    if (!strip) return;
    const reveal = () => {
      const selected = buttons.current[stockTabs.indexOf(tab)];
      if (!selected) return;
      const parent = strip.getBoundingClientRect(),
        item = selected.getBoundingClientRect();
      const style = getComputedStyle(strip);
      const left = parent.left + parseFloat(style.paddingLeft),
        right = parent.right - parseFloat(style.paddingRight);
      if (item.left < left) strip.scrollLeft -= left - item.left;
      else if (item.right > right) strip.scrollLeft += item.right - right;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [tab]);
  return (
    <div className="stocks-page">
      <header className="stock-company-header">
        {identity.loading && !listing ? (
          <span className="stock-company-mark stock-avatar" aria-hidden="true">
            <Skeleton className="skeleton-avatar-fill" />
          </span>
        ) : (
          <StockAvatar
            symbol={symbol}
            className="stock-company-mark"
            enabled={!!listing}
          />
        )}
        <div className="stock-company-identity">
          <div className="stock-company-title">
            <h1>
              {identity.loading && !listing ? (
                <Skeleton width={180} height={24} />
              ) : (
                stockDisplayName(profile?.name, listing?.name, symbol)
              )}
            </h1>
            <Button
              className="stock-watch-button"
              variant="ghost"
              aria-pressed={watched}
              aria-label={
                watched ? "Remove from watchlist" : "Add to watchlist"
              }
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
              disabled={!validSymbol(symbol)}
              onClick={toggleWatch}
            >
              <Star size={16} fill={watched ? "currentColor" : "none"} />
            </Button>
          </div>
          <small>
            {symbol}
            {listing ? ` · ${directoryExchange(listing)}` : ""}
          </small>
          {!listing && (
            <small
              className="directory-status"
              role="status"
              aria-label={identity.loading ? "Loading company" : undefined}
              aria-busy={identity.loading}
            >
              {identity.loading ? (
                <Skeleton width={90} height={10} />
              ) : (
                identity.error ||
                (!identity.data.snapshotId
                  ? "No directory yet"
                  : "Not in directory")
              )}
            </small>
          )}
        </div>
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
        aria-busy={initialLoading}
      >
        {initialLoading ? (
          <StockLoading tab={tab} />
        ) : (
          <>
            {tab === "chart" && (
              <div className="stock-chart-layout">
                <div className="stock-identity-column">
                  <section className="stock-quote">
                    <div
                      className="stock-market-state"
                      title={shown.market.detail}
                      data-market-basis={shown.market.basis}
                    >
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
                    <ExchangeClock />
                    {!shown.asOf && !shown.date && (
                      <small>
                        {loading ? (
                          <SkeletonGroup inline label="Loading price">
                            <Skeleton width={100} />
                          </SkeletonGroup>
                        ) : (
                          <MissingData data={data} dataset="prices" />
                        )}
                      </small>
                    )}
                    <SourceNote
                      view={shown.sourceView}
                      detail={
                        <>
                          <p>Collected snapshot · Not streaming.</p>
                          <p>{shown.market.detail}</p>
                          {shown.date && !shown.asOf && (
                            <p>Price session: {shown.date}</p>
                          )}
                          {shown.asOf && (
                            <p>
                              Regular session:{" "}
                              {new Date(shown.asOf).toLocaleString("en-US", {
                                timeZone: "America/New_York",
                                timeZoneName: "short",
                              })}
                            </p>
                          )}
                          {shown.postPrice !== undefined && shown.postAsOf && (
                            <p>
                              After-hours snapshot: {money(shown.postPrice)} ·{" "}
                              {new Date(shown.postAsOf).toLocaleString(
                                "en-US",
                                {
                                  timeZone: "America/New_York",
                                  timeZoneName: "short",
                                },
                              )}
                            </p>
                          )}
                        </>
                      }
                    />
                  </section>
                  <section className="stock-about stock-company-about">
                    <h2>About {quote?.name ?? symbol} </h2>
                    <p>
                      {profile?.description
                        ? profile.description.length > 420 &&
                          expandedCompany !== symbol
                          ? `${profile.description.slice(0, 417)}…`
                          : profile.description
                        : "No company data"}
                    </p>
                    {profile?.description &&
                      profile.description.length > 420 && (
                        <button
                          className="text-link"
                          onClick={() =>
                            setExpandedCompany(
                              expandedCompany === symbol ? null : symbol,
                            )
                          }
                        >
                          {expandedCompany === symbol
                            ? "Show less"
                            : "Read more"}
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
                  <section className="stock-about stock-analyst-overview">
                    <h2>Analyst</h2>
                    <AnalystSummary data={data} />
                    <SourceNote view={data.datasets.analyst} />
                  </section>
                  <section className="stock-about stock-earnings-overview">
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
                          className={value === "—" ? "" : metricTone(label)}
                          title={
                            label === "Open"
                              ? "Color compares the latest close with the open"
                              : label === "Previous close"
                                ? "Color compares the latest close with the previous close"
                                : label === "Market cap" &&
                                    (shown.marketCapAsOf || profile?.sharesDate)
                                  ? shown.marketCapAsOf
                                    ? `Reported company market cap · ${new Date(shown.marketCapAsOf).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}`
                                    : `Company share reference: ${profile?.sharesDate}`
                                  : undefined
                          }
                        >
                          {(label === "YTD change" ||
                            label === "12 month change") &&
                            value !== "—" && (
                              <Triangle
                                size={8}
                                fill="currentColor"
                                style={{
                                  transform:
                                    metricTone(label) === "negative"
                                      ? "rotate(180deg)"
                                      : undefined,
                                }}
                              />
                            )}
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <StockPeers data={data} />
                </div>
                <div className="stock-visual-column">
                  <div className="stock-price-section">
                    <StockChart
                      symbol={symbol}
                      bars={bars}
                      adjusted={adjusted.adjusted}
                      source={data.datasets.prices}
                    />
                  </div>
                  <section className="stock-digest stock-news-overview">
                    <h2>Digest</h2>
                    <Digest data={data} />
                  </section>
                </div>
              </div>
            )}
            {tab === "financials" && <Financials data={data} />}
            {tab === "funds" && <Funds data={data} />}
            {tab === "politicians" && <Politicians data={data} />}
            {tab === "insiders" && <Insiders data={data} />}
            {tab === "analyst" && <Analysts data={data} />}
          </>
        )}
      </section>
    </div>
  );
}
