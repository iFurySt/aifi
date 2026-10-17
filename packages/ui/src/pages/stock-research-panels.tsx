import { useState, type ReactNode } from "react";
import {
  financialSeries,
  trailingMetric,
  type StockResearch,
  type ResearchDataset,
  type ResearchDatasetView,
  type ResearchRecord,
} from "@aifi/core";
import { money } from "../workspace-context";
import { ResearchSource } from "../components/ResearchSource";
const value = (r: ResearchRecord, ...keys: string[]) => {
  for (const key of keys)
    if (r[key] !== undefined && r[key] !== null && r[key] !== "")
      return String(r[key]);
  return "—";
};
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
export function DataTable({
  columns,
  rows,
  empty = "No data yet",
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: ReactNode;
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
            {rows.length ? (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="stock-table-empty">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function SourceNote({
  view,
  detail,
}: {
  view?: ResearchDatasetView;
  detail?: ReactNode;
}) {
  return <ResearchSource view={view} detail={detail} />;
}
export function MissingData({
  data,
  dataset,
}: {
  data: StockResearch;
  dataset: ResearchDataset;
}) {
  const status = data.coverage[dataset];
  const message: Record<string, string> = {
    needs_key: "API key required",
    needs_contact: "SEC contact required",
    access_denied: "Source access required",
    invalid_key: "Check API key",
    not_found: "Not available from this source",
    unmapped: "No SEC company mapping",
    rate_limited: "Waiting for source limit",
    quota_wait: "Waiting for source limit",
    collection_failed: "Sync failed",
    network_error: "Source unavailable",
    paused: "Sync paused",
    failed: "Sync failed",
    running: "Syncing…",
  };
  return (
    <span>
      {message[status ?? ""] ??
        (data.datasets[dataset]
          ? "No data for this view"
          : "Not collected yet")}{" "}
      ·{" "}
      <a
        href={
          status === "needs_key" || status === "invalid_key"
            ? "#/settings/keys"
            : status === "needs_contact"
              ? "#/settings/sources"
              : "#/settings/sync"
        }
        className="text-link"
      >
        Manage data
      </a>
    </span>
  );
}
export function FilingsTable({
  data,
  compact = false,
}: {
  data: StockResearch;
  compact?: boolean;
}) {
  const view = data.datasets.filings,
    filings = (view?.data.filings ?? []).filter((f) =>
      /^(10-K|10-Q|8-K|20-F|6-K|40-F)(\/A)?$/.test(f.form),
    );
  return (
    <>
      <DataTable
        columns={
          compact
            ? ["Form", "Filed"]
            : ["Form", "Report period", "Filed", "Document"]
        }
        rows={filings.slice(0, compact ? 5 : 100).map((f) =>
          compact
            ? [f.form, f.filed]
            : [
                f.form,
                f.reportDate || "—",
                f.filed,
                <a href={f.url} target="_blank" rel="noreferrer">
                  View filing ↗
                </a>,
              ],
        )}
        empty={
          view ? (
            "No reported filings"
          ) : (
            <MissingData data={data} dataset="filings" />
          )
        }
      />
      <SourceNote view={view} />
    </>
  );
}
const financialRows: Record<string, [string, string][]> = {
  Metrics: [
    ["revenue", "Revenue"],
    ["grossProfit", "Gross profit"],
    ["operatingIncome", "Operating income"],
    ["netIncome", "Net income"],
    ["eps", "Diluted EPS"],
  ],
  Income: [
    ["revenue", "Revenue"],
    ["grossProfit", "Gross profit"],
    ["operatingIncome", "Operating income"],
    ["netIncome", "Net income"],
    ["eps", "Diluted EPS"],
  ],
  Balance: [
    ["cash", "Cash & equivalents"],
    ["assets", "Total assets"],
    ["liabilities", "Total liabilities"],
    ["equity", "Equity"],
  ],
  "Cash flow": [
    ["operatingCashFlow", "Operating cash flow"],
    ["capex", "Capital expenditures"],
    ["freeCashFlow", "Free cash flow"],
  ],
};
export function Financials({ data }: { data: StockResearch }) {
  const [view, setView] = useState("Metrics"),
    [period, setPeriod] = useState<"Yearly" | "Quarter">("Yearly");
  const facts = data.datasets.facts?.data.facts ?? [],
    rows = financialRows[view] ?? [];
  const series = (metric: string) =>
    metric === "freeCashFlow"
      ? financialSeries(facts, "operatingCashFlow", period).flatMap((p) => {
          const capex = financialSeries(facts, "capex", period).find(
            (c) => c.end === p.end,
          );
          return capex
            ? [{ ...p, value: p.value - capex.value, derived: true }]
            : [];
        })
      : financialSeries(facts, metric, period);
  // Annual balance columns use actual reported year ends, not all quarterly instants.
  const dates = [
    ...new Set(
      (view === "Balance" && period === "Yearly"
        ? [
            ...financialSeries(facts, "revenue", "Yearly"),
            ...facts
              .filter(
                (f) =>
                  f.period === "annual" ||
                  (!f.start && /^(10-K|20-F)(\/A)?$/.test(f.form)),
              )
              .map((f) => ({ end: f.end })),
          ]
        : rows.flatMap(([metric]) => series(metric))
      ).map((p) => p.end),
    ),
  ]
    .sort()
    .reverse()
    .slice(0, 6);
  return (
    <section className="stock-tab-body">
      <div className="stock-table-toolbar">
        <select
          aria-label="Financial view"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          {[
            "Metrics",
            "Income",
            "Balance",
            "Cash flow",
            "Corporate actions",
            "Filings",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        {view !== "Filings" && view !== "Corporate actions" && (
          <div className="segmented-control" aria-label="Financial period">
            {(["Quarter", "Yearly"] as const).map((p) => (
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
      {view === "Corporate actions" ? (
        <>
          <DataTable
            columns={[
              "Event",
              "Effective / ex-date",
              "Ratio / cash",
              "Pay date",
            ]}
            rows={(data.datasets.actions?.data.records ?? []).map((r) => [
              value(r, "kind"),
              value(r, "execution_date", "ex_dividend_date"),
              r.kind === "splits"
                ? `${value(r, "split_to")}:${value(r, "split_from")}`
                : `${value(r, "currency")} ${value(r, "cash_amount")}`,
              value(r, "pay_date", "pay_date"),
            ])}
          />
          <SourceNote view={data.datasets.actions} />
          {!data.datasets.actions && (
            <div className="stock-no-data">
              <MissingData data={data} dataset="actions" />
            </div>
          )}
        </>
      ) : view === "Filings" ? (
        <FilingsTable data={data} />
      ) : (
        <>
          <DataTable
            empty={<MissingData data={data} dataset="facts" />}
            columns={["Metric", ...dates]}
            rows={
              dates.length
                ? rows.map(([metric, label]) => [
                    label,
                    ...dates.map((end) => {
                      const p = series(metric).find((v) => v.end === end);
                      return p ? (
                        <span
                          title={`${p.derived ? "Derived · " : ""}${p.filed ? `Filed ${p.filed} · ${p.accession}` : "Vendor period end · Filing date unavailable"}`}
                        >
                          {metric === "eps"
                            ? money(p.value)
                            : amount(p.value, true)}
                          {p.derived ? "*" : ""}
                        </span>
                      ) : (
                        "—"
                      );
                    }),
                  ])
                : []
            }
          />
          <SourceNote view={data.datasets.facts} />
          {facts.length > 0 && (
            <p className="stock-footnote">
              USD ·{" "}
              {data.datasets.facts?.provider === "yahoo"
                ? "Vendor period ends"
                : "Actual period ends"}{" "}
              · * Derived from reported values
            </p>
          )}
        </>
      )}
    </section>
  );
}
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
export function Activity({
  data,
  kind,
}: {
  data: StockResearch;
  kind: "funds" | "politicians" | "insiders";
}) {
  const [filter, setFilter] = useState("All"),
    view = data.datasets[kind],
    all = view?.data.records ?? [];
  const direction = (r: ResearchRecord) =>
    kind === "insiders"
      ? r.code === "P"
        ? "Buy"
        : r.code === "S"
          ? "Sell"
          : "Other"
      : kind === "politicians"
        ? /purchase/i.test(value(r, "type", "transactionType"))
          ? "Buy"
          : /sale/i.test(value(r, "type", "transactionType"))
            ? "Sell"
            : "Other"
        : Number(r.changeInSharesNumber ?? r.sharesNumberChange) > 0
          ? "Added"
          : Number(r.changeInSharesNumber ?? r.sharesNumberChange) < 0
            ? "Reduced"
            : "Unchanged";
  const filtered = all.filter(
      (r) => filter === "All" || direction(r) === filter,
    ),
    filters =
      kind === "funds" ? ["All", "Added", "Reduced"] : ["All", "Buy", "Sell"];
  const columns =
    kind === "funds"
      ? ["Institution", "Shares", "Reported value", "Share change", "Period"]
      : kind === "politicians"
        ? ["Politician", "Transaction", "Reported range", "Traded", "Disclosed"]
        : ["Insider", "Role", "Code", "Shares", "Price", "Traded", "Filed"];
  const rows = filtered.map((r) =>
    kind === "funds"
      ? [
          value(r, "investorName", "name"),
          amount(r.sharesNumber ?? r.shares),
          amount(r.marketValue ?? r.value, true),
          amount(r.changeInSharesNumber ?? r.sharesNumberChange),
          value(r, "date", "reportDate"),
        ]
      : kind === "politicians"
        ? [
            `${value(r, "firstName")} ${value(r, "lastName")}`,
            value(r, "type", "transactionType"),
            value(r, "amount"),
            value(r, "transactionDate"),
            value(r, "disclosureDate"),
          ]
        : [
            value(r, "name"),
            value(r, "role"),
            <span title={value(r, "securityKind")}>{value(r, "code")}</span>,
            amount(r.shares),
            amount(r.price, true),
            value(r, "date"),
            value(r, "filed"),
          ],
  );
  return (
    <section className="stock-tab-body">
      <h2>
        {kind === "funds"
          ? "Institutional holdings"
          : kind === "politicians"
            ? "Politician trades"
            : "Insider activity"}
      </h2>
      <div className="stock-summary">
        <div>
          <span>
            {kind === "funds" ? "Reported positions" : "Disclosed transactions"}
          </span>
          <strong>{view ? view.recordCount.toLocaleString() : "—"}</strong>
        </div>
        <div>
          <span>Coverage</span>
          <strong>
            {view?.data.window
              ?.slice(0, 10)
              .match(/^\d{4}-\d{2}-\d{2}$/)?.[0] ??
              (view ? "Recent disclosures" : "—")}
          </strong>
        </div>
      </div>
      <div className="stock-table-toolbar">
        <div className="segmented-control" aria-label={`Filter ${kind}`}>
          {filters.map((f) => (
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
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        empty={
          view ? (
            "No reported records"
          ) : (
            <MissingData data={data} dataset={kind} />
          )
        }
      />
      <SourceNote view={view} />
      {view && view.recordCount > 200 && (
        <p className="stock-footnote">
          Showing first 200 of {view.recordCount.toLocaleString()}
        </p>
      )}
      {kind === "insiders" && (
        <p className="stock-footnote">
          P: Purchase · S: Sale · Other codes include awards, exercises and tax
          withholding
        </p>
      )}
      {kind === "funds" && (
        <p className="stock-footnote">
          Quarter-end reported holdings; changes are not trade records.
        </p>
      )}
    </section>
  );
}
export function AnalystPanel({ data }: { data: StockResearch }) {
  const view = data.datasets.analyst,
    records = (view?.data.records ?? []).filter(
      (r) => r.recordKind === "grades",
    );
  const distribution = view?.data.records?.find(
    (r) => r.recordKind === "recommendations",
  );
  return (
    <section className="stock-tab-body">
      <h2>Analyst ratings</h2>
      <AnalystSummary data={data} />
      {distribution && (
        <div
          className="stock-recommendations"
          aria-label="Current recommendation distribution"
        >
          {(
            [
              ["strongSell", "Strong sell"],
              ["sell", "Sell"],
              ["hold", "Hold"],
              ["buy", "Buy"],
              ["strongBuy", "Strong buy"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <strong>
                {typeof distribution[key] === "number"
                  ? String(distribution[key])
                  : "—"}
              </strong>
              <span>{label}</span>
            </div>
          ))}
          <small>
            {String(distribution.count)} ratings · Coverage may differ from
            target-price opinions
          </small>
        </div>
      )}
      <DataTable
        columns={["Date", "Firm", "Previous", "Rating", "Action"]}
        rows={records.map((r) => [
          value(r, "date"),
          value(r, "gradingCompany"),
          value(r, "previousGrade"),
          value(r, "newGrade"),
          value(r, "action"),
        ])}
      />
      <SourceNote view={view} />
      {!view && (
        <div className="stock-no-data">
          <MissingData data={data} dataset="analyst" />
        </div>
      )}
    </section>
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
    records = view?.data.records ?? [];
  return (
    <>
      {records.slice(0, 5).map((r, i) => (
        <article className="stock-news-item" key={i}>
          <small>{value(r, "publishedDate", "date")}</small>
          <h3>{value(r, "title")}</h3>
          <p>{value(r, "site", "publisher")}</p>
        </article>
      ))}
      {!records.length && (
        <div className="stock-no-data">
          <MissingData data={data} dataset="news" />
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
