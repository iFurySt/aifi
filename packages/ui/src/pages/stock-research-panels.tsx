import {
  companyNews,
  financialSeries,
  trailingMetric,
  type StockResearch,
} from "@aifi/core";
import { money } from "../workspace-context";
import { DataTable, MissingData, SourceNote } from "./stock-research-shared";
export {
  DataTable,
  FilingsTable,
  MissingData,
  SourceNote,
} from "./stock-research-shared";
export { Financials } from "./Financials";
const amount = (raw: unknown, currency = false) => {
  if (
    raw === null ||
    raw === undefined ||
    raw === "" ||
    !Number.isFinite(Number(raw))
  )
    return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
    ...(currency ? { style: "currency", currency: "USD" } : {}),
  }).format(Number(raw));
};
export function AnalystSummary({ data }: { data: StockResearch }) {
  const records = data.datasets.analyst?.data.records ?? [];
  const consensus = records.find(
    (r) => r.recordKind === "price-target-consensus",
  );
  const mean =
    typeof consensus?.recommendationMean === "number"
      ? consensus.recommendationMean
      : undefined;
  const rating =
    typeof consensus?.recommendation === "string"
      ? consensus.recommendation.replaceAll("_", " ")
      : undefined;
  return (
    <div className="stock-analyst-summary">
      <p>
        {consensus?.analystCount
          ? `Average target · ${consensus.analystCount} analysts`
          : "Average price target"}
      </p>
      <div className="stock-analyst-number">
        {consensus ? amount(consensus.targetConsensus, true) : "—"}
      </div>
      {rating && (
        <p>
          Average score:{" "}
          <strong className="stock-rating-label">{rating}</strong>
        </p>
      )}
      {mean !== undefined && mean >= 1 && mean <= 5 && (
        <>
          <div
            className="stock-rating-meter"
            role="img"
            aria-label={`Average rating ${mean.toFixed(2)} of 5, lower is more positive`}
          >
            <i style={{ left: `${((5 - mean) / 4) * 100}%` }} />
          </div>
          <div className="stock-rating-scale">
            {["Strong sell", "Sell", "Hold", "Buy", "Strong buy"].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </>
      )}
      {consensus && (
        <small>
          Target range {amount(consensus.targetLow, true)} –{" "}
          {amount(consensus.targetHigh, true)}
        </small>
      )}
      {!records.length && <small>No ratings yet</small>}
    </div>
  );
}
export function Earnings({ data }: { data: StockResearch }) {
  const view = data.datasets.earnings,
    records = view?.data.records ?? [];
  const history = records
    .filter((r) => r.recordKind === "earnings" && typeof r.actual === "number")
    .slice(-4);
  const upcoming = records.find((r) => r.recordKind === "earnings-calendar");
  const fallback = financialSeries(
    data.datasets.facts?.data.facts ?? [],
    "eps",
    "Quarter",
  ).slice(0, 4);
  const estimates = history.flatMap((r) =>
    typeof r.estimate === "number" ? [r.estimate] : [],
  );
  const values = [...history.map((r) => Number(r.actual)), ...estimates],
    low = values.length ? Math.min(...values) : 0,
    high = values.length ? Math.max(...values) : 1,
    padding = Math.max((high - low) * 0.25, Math.abs(high) * 0.08, 0.05),
    min = low - padding,
    max = high + padding;
  const span = max - min || 1,
    y = (v: number) => 18 + ((max - v) / span) * 88;
  const label = (r: Record<string, unknown>) =>
    String(r.fiscalQuarter ?? r.periodEnd ?? "").replace(
      /^(\d)Q(\d{2})(\d{2})$/,
      "Q$1 '$3",
    );
  const compared = history.filter((r) => typeof r.estimate === "number");
  const beats = compared.filter(
    (r) => Number(r.actual) - Number(r.estimate) > 0.005,
  ).length;
  return (
    <div className="stock-earnings">
      {history.length > 0 ? (
        <>
          <div className="stock-earnings-legend">
            <span>
              <i className="eps-actual-mark" />
              Actual EPS
            </span>
            <span>
              <i className="eps-estimate-mark" />
              Estimated EPS
            </span>
          </div>
          <svg
            viewBox="0 0 300 156"
            role="img"
            aria-label="GAAP actual and estimated EPS by fiscal quarter"
          >
            {[0, 0.5, 1].map((fraction) => (
              <line
                key={fraction}
                x1="10"
                x2="290"
                y1={18 + fraction * 88}
                y2={18 + fraction * 88}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
            ))}
            {history.map((r, i) => {
              const x = 14 + i * (280 / history.length),
                w = 280 / history.length;
              const actual = Number(r.actual),
                estimate =
                  typeof r.estimate === "number" ? r.estimate : undefined;
              const result =
                estimate === undefined
                  ? ""
                  : Math.abs(actual - estimate) <= 0.005
                    ? "Met"
                    : actual > estimate
                      ? "Beat"
                      : "Miss";
              return (
                <g key={String(r.periodEnd)}>
                  {estimate !== undefined && (
                    <circle
                      cx={x + w * 0.4}
                      cy={y(estimate)}
                      r="6"
                      fill="var(--surface)"
                      stroke="var(--secondary)"
                      strokeWidth="1.2"
                    >
                      <title>{`${label(r)} estimate ${money(estimate)}`}</title>
                    </circle>
                  )}
                  <circle
                    cx={x + w * 0.4}
                    cy={y(actual)}
                    r="6"
                    fill={
                      result === "Miss"
                        ? "var(--negative)"
                        : result === ""
                          ? "var(--text)"
                          : "var(--positive)"
                    }
                  >
                    <title>
                      {`${label(r)} actual ${money(actual)}${estimate === undefined ? "" : ` · ${result} · estimate ${money(estimate)}`}`}
                    </title>
                  </circle>
                  <text
                    x={x + w * 0.4}
                    y="128"
                    textAnchor="middle"
                    className={
                      result === "Miss"
                        ? "negative"
                        : result === "Beat"
                          ? "positive"
                          : ""
                    }
                  >
                    {result.toUpperCase()}
                  </text>
                  <text x={x + w * 0.4} y="146" textAnchor="middle">
                    {label(r)}
                  </text>
                </g>
              );
            })}
          </svg>
          {compared.length > 0 && (
            <p>
              Beat in {beats}/{compared.length} quarters shown
            </p>
          )}
        </>
      ) : (
        <DataTable
          columns={["Period end", "Actual EPS"]}
          rows={fallback.map((p) => [p.end, money(p.value)])}
          empty="No reported earnings yet"
        />
      )}
      {upcoming && Array.isArray(upcoming.dates) && (
        <p>
          {upcoming.estimated ? "Expected report" : "Next report"}:{" "}
          {upcoming.dates.map(String).join(" – ")}
          {typeof upcoming.estimate === "number"
            ? ` · EPS est. ${money(upcoming.estimate)}`
            : ""}
        </p>
      )}
      <SourceNote view={view ?? data.datasets.facts} />
    </div>
  );
}
export function Digest({ data }: { data: StockResearch }) {
  const view = data.datasets.news,
    articles = companyNews(view?.data.records ?? []);
  return (
    <>
      {articles.slice(0, 5).map((article) => (
        <article className="stock-news-item" key={article.key}>
          <small>
            <time dateTime={article.published}>
              {/Z$|[+-]\d{2}:\d{2}$/.test(article.published)
                ? new Date(article.published).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                    timeZoneName: "short",
                  })
                : article.published}
            </time>
            {article.publisher ? ` · ${article.publisher}` : ""}
          </small>
          <h3>
            {article.url ? (
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            ) : (
              article.title
            )}
          </h3>
          {article.snippet && <p>{article.snippet}</p>}
        </article>
      ))}
      {!articles.length && (
        <div className="stock-no-data">
          {view ? (
            "No recent news in this source window"
          ) : (
            <MissingData data={data} dataset="news" />
          )}
        </div>
      )}
      <SourceNote view={view} />
    </>
  );
}
export function overviewFinancials(data: StockResearch) {
  const facts = data.datasets.facts?.data.facts ?? [],
    revenue = trailingMetric(facts, "revenue"),
    income = trailingMetric(facts, "netIncome"),
    gross = trailingMetric(facts, "grossProfit"),
    cash = trailingMetric(facts, "operatingCashFlow"),
    capex = trailingMetric(facts, "capex");
  const label = (p: ReturnType<typeof trailingMetric>) =>
    p ? `${amount(p.value, true)} · ${p.basis}` : "—";
  return [
    ["Revenue", label(revenue)],
    [
      "Gross margin",
      gross &&
      revenue &&
      revenue.value > 0 &&
      gross.end === revenue.end &&
      gross.basis === revenue.basis
        ? `${((gross.value / revenue.value) * 100).toFixed(1)}% · ${gross.basis}`
        : "—",
    ],
    ["Net income", label(income)],
    [
      "Free cash flow",
      cash && capex && cash.end === capex.end && cash.basis === capex.basis
        ? `${amount(cash.value - capex.value, true)} · ${cash.basis}`
        : "—",
    ],
  ] as [string, string][];
}
