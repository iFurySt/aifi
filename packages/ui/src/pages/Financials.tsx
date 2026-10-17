import { Fragment, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  financialGroups,
  financialMetrics,
  financialMetric,
  financialMetricSeries,
  financialOverview,
  financialPeriodEnds,
  type FinancialPeriod,
  type FinancialPoint,
  type StockResearch,
} from "@aifi/core";
import { ResearchSource } from "../components/ResearchSource";
import { FinancialTrend } from "../components/FinancialTrend";
import {
  financialDate,
  formatFinancialValue,
} from "../components/financial-format";
import {
  DataTable,
  FilingsTable,
  MissingData,
  SourceNote,
} from "./stock-research-shared";

export function Financials({ data }: { data: StockResearch }) {
  const [view, setView] = useState("metrics");
  const [periodChoice, setPeriod] = useState<FinancialPeriod>();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(["revenue", "netIncome"]);
  const facts = data.datasets.facts?.data.facts ?? [];
  const hasQuarter = useMemo(
    () => financialPeriodEnds(facts, "Quarter").length > 0,
    [facts],
  );
  const period = periodChoice ?? (hasQuarter ? "Quarter" : "Yearly");
  const series = useMemo(
    () =>
      new Map(
        financialMetrics.map((m) => [
          m.id,
          financialMetricSeries(facts, m.id, period),
        ]),
      ),
    [facts, period],
  );
  const ends = useMemo(
    () => financialPeriodEnds(facts, period),
    [facts, period],
  );
  const statements = view !== "filings" && view !== "actions";
  const groups =
    view === "metrics"
      ? financialGroups
      : financialGroups.filter((g) => g.id === view);
  function toggleSeries(id: string) {
    setSelected((old) =>
      old.includes(id)
        ? old.length > 1
          ? old.filter((m) => m !== id)
          : old
        : financialMetric(old[0]!)?.format === financialMetric(id)?.format
          ? [...old.slice(-2), id]
          : [id],
    );
  }
  function cellTitle(point: FinancialPoint) {
    return [
      point.calculation,
      point.tag,
      point.start ? `${point.start} → ${point.end}` : point.end,
      point.derived ? "Calculated from reported values" : undefined,
      point.filed
        ? `Filed ${point.filed} · ${point.accession}`
        : "Vendor period end · Filing date unavailable",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  function row(id: string) {
    const definition = financialMetric(id)!;
    return (
      <tr key={id} data-metric={id}>
        <th scope="row">
          <div className="financial-row-label">
            <button
              className="financial-series-toggle"
              aria-pressed={selected.includes(id)}
              disabled={!series.get(id)?.length && !selected.includes(id)}
              onClick={() => toggleSeries(id)}
              aria-label={`Chart ${definition.label}`}
              title={
                selected.includes(id)
                  ? selected.length === 1
                    ? "Keep at least one metric in the chart"
                    : "Remove from chart"
                  : "Chart this metric"
              }
            >
              {selected.includes(id) ? <Check size={12} /> : <Plus size={12} />}
            </button>
            <span
              title={
                definition.note
                  ? `${definition.label} · ${definition.note}`
                  : definition.label
              }
            >
              {definition.label}
            </span>
          </div>
        </th>
        {ends.map((end) => {
          const point = series.get(id)?.find((p) => p.end === end);
          return (
            <td
              key={end}
              className={
                point?.value !== undefined &&
                (point.value < 0 ||
                  ["revenueGrowth", "netIncomeGrowth"].includes(id))
                  ? point.value < 0
                    ? "negative"
                    : "positive"
                  : undefined
              }
            >
              {point ? (
                <span title={cellTitle(point)}>
                  {formatFinancialValue(id, point.value)}
                  {point.derived && <sup>*</sup>}
                </span>
              ) : (
                <span
                  className="muted"
                  title={
                    definition.note ??
                    "Not reported by this source for this period"
                  }
                >
                  —
                </span>
              )}
            </td>
          );
        })}
      </tr>
    );
  }
  return (
    <section className="stock-tab-body financial-workspace">
      <div className="financial-heading">
        <h2>Financials</h2>
        <ResearchSource view={data.datasets.facts} />
      </div>
      {statements && (
        <FinancialTrend ends={ends} metrics={selected} series={series} />
      )}
      <div className="stock-table-toolbar">
        <select
          aria-label="Financial view"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          <option value="metrics">Metrics</option>
          {financialGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
          <option value="actions">Corporate actions</option>
          <option value="filings">Filings</option>
        </select>
        {statements && (
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
      {view === "filings" ? (
        <FilingsTable data={data} />
      ) : view === "actions" ? (
        <>
          <DataTable
            columns={[
              "Event",
              "Effective / ex-date",
              "Ratio / cash",
              "Pay date",
            ]}
            rows={(data.datasets.actions?.data.records ?? []).map((r) => [
              String(r.kind ?? "—"),
              String(r.execution_date ?? r.ex_dividend_date ?? "—"),
              r.kind === "splits"
                ? `${r.split_to ?? "—"}:${r.split_from ?? "—"}`
                : `${r.currency ?? ""} ${r.cash_amount ?? "—"}`,
              String(r.pay_date ?? "—"),
            ])}
          />
          <SourceNote view={data.datasets.actions} />
          {!data.datasets.actions && (
            <div className="stock-no-data">
              <MissingData data={data} dataset="actions" />
            </div>
          )}
        </>
      ) : ends.length ? (
        <>
          <div className="table-panel financial-table-panel">
            <div className="table-scroll">
              <table className="data-table financial-data-table">
                <caption className="sr-only">
                  {data.symbol} financial history; currency values in USD,
                  shares and percentages as labeled
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    {ends.map((end) => (
                      <th scope="col" key={end}>
                        <time dateTime={end} title={end}>
                          {financialDate(end)}
                        </time>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view === "metrics" && financialOverview.map(row)}
                  {groups.map((group) => {
                    const open =
                      view !== "metrics" || expanded.includes(group.id);
                    return (
                      <Fragment key={group.id}>
                        <tr className="financial-group-row">
                          <th scope="rowgroup" colSpan={ends.length + 1}>
                            <button
                              onClick={() =>
                                setExpanded((old) =>
                                  old.includes(group.id)
                                    ? old.filter((id) => id !== group.id)
                                    : [...old, group.id],
                                )
                              }
                              aria-expanded={open}
                              disabled={view !== "metrics"}
                            >
                              {open ? (
                                <ChevronDown size={13} />
                              ) : (
                                <ChevronRight size={13} />
                              )}{" "}
                              {group.label}
                              <small>{group.metrics.length}</small>
                            </button>
                          </th>
                        </tr>
                        {open && group.metrics.map(row)}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="stock-footnote">
            USD ·{" "}
            {data.datasets.facts?.provider === "yahoo"
              ? "Vendor period ends"
              : "Reported period ends"}{" "}
            · * Calculated
          </p>
        </>
      ) : (
        <div className="stock-no-data">
          <MissingData data={data} dataset="facts" />
        </div>
      )}
    </section>
  );
}
