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
export function SourceNote({ view }: { view?: ResearchDatasetView }) {
  if (!view) return null;
  return (
    <p className="stock-footnote" title={view.data.window}>
      {view.provider.toUpperCase()} · Updated{" "}
      {new Date(view.fetchedAt).toLocaleDateString()}
      {view.data.complete ? "" : " · Partial coverage"}
    </p>
  );
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
  const records = data.datasets.analyst?.data.records ?? [],
    consensus = records.find((r) => r.recordKind === "price-target-consensus");
  return (
    <div className="stock-analyst-summary">
      <div className="stock-analyst-number">
        {consensus ? amount(consensus.targetConsensus, true) : "—"}
      </div>
      <p>Consensus price target</p>
      {consensus && (
        <small>
          {amount(consensus.targetLow, true)} –{" "}
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
  return (
    <section className="stock-tab-body">
      <h2>Analyst ratings</h2>
      <AnalystSummary data={data} />
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
  const facts = data.datasets.facts?.data.facts ?? [],
    eps = financialSeries(facts, "eps", "Quarter").slice(0, 4);
  return (
    <DataTable
      columns={["Period end", "Actual EPS"]}
      rows={eps.map((p) => [p.end, money(p.value)])}
      empty="No reported earnings yet"
    />
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
