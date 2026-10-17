import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import {
  fundHistories,
  fundPeriods,
  holdingPeriodLabel,
  type FundHolding,
  type FundPosition,
  type HolderKind,
  type StockResearch,
} from "@aifi/core";
import { Select } from "../components/Select";
import { FundHistoryChart } from "../components/FundHistoryChart";
import { SourceNote, MissingData } from "./stock-research-shared";
import "./funds.css";
const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
const positions: FundPosition[] = [
  "New",
  "Added",
  "Reduced",
  "Same",
  "Exited",
  "Unknown",
];
function Position({ point }: { point: FundHolding }) {
  const cls =
    point.position === "Added" || point.position === "New"
      ? "positive"
      : point.position === "Reduced" || point.position === "Exited"
        ? "negative"
        : "";
  return (
    <span className={`fund-position ${cls}`}>
      {!point.current
        ? "Earlier sample"
        : point.position === "Unknown"
          ? "—"
          : point.position}
    </span>
  );
}
export function Funds({ data }: { data: StockResearch }) {
  const view = data.datasets.funds;
  const histories = useMemo(() => fundHistories(view), [view]);
  const [kind, setKind] = useState<HolderKind>("institution"),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [position, setPosition] = useState("All");
  const scope = useMemo(
    () => histories.filter((f) => f.kind === kind),
    [histories, kind],
  );
  const fund = scope.find((f) => f.id === selected) ?? scope[0];
  const periods = useMemo(() => fundPeriods(scope), [scope]);
  const rows = scope.filter(
    (f) =>
      (position === "All" || f.latest.position === position) &&
      f.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const ownership = view?.data.ownership;
  const latest = fund?.latest;
  const change = latest?.current ? latest.changePercent : undefined;
  const changeClass =
    change !== undefined && change > 0
      ? "positive"
      : change !== undefined && change < 0
        ? "negative"
        : "";
  return (
    <section className="stock-tab-body funds-page">
      <header className="funds-heading">
        <h2>Funds</h2>
        <SourceNote
          view={view}
          detail={
            <p>
              Institution and fund/ETF samples overlap. Missing sample entries
              do not prove an exit. Report dates differ from collection dates.
            </p>
          }
        />
      </header>
      {ownership && (
        <div
          className="funds-ownership"
          aria-label="Institutional ownership summary"
        >
          {ownership.institutionsPercent !== undefined && (
            <div>
              <span>Institutional ownership</span>
              <strong>{ownership.institutionsPercent.toFixed(2)}%</strong>
            </div>
          )}
          {ownership.institutionsCount !== undefined && (
            <div>
              <span>Institutions</span>
              <strong>
                {ownership.institutionsCount.toLocaleString("en-US")}
              </strong>
            </div>
          )}
          {ownership.floatPercent !== undefined && (
            <div>
              <span>Of float</span>
              <strong>{ownership.floatPercent.toFixed(2)}%</strong>
            </div>
          )}
        </div>
      )}
      <div className="funds-toolbar">
        <div className="segmented-control" aria-label="Holder type">
          {(
            [
              ["institution", "Institutions"],
              ["fund", "Funds & ETFs"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={kind === value ? "selected" : ""}
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setQuery("");
                setPosition("All");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="funds-sample-count">
          {scope.filter((f) => f.latest.current).length}{" "}
          {view?.provider === "yahoo" ? "top holders" : "holders"}
        </span>
      </div>
      {fund && latest && (
        <div className="funds-overview">
          <div className="funds-selected">
            <Select
              label="Select fund"
              value={fund.id}
              options={scope.map((f) => ({ value: f.id, label: f.name }))}
              onValueChange={setSelected}
              searchable
              searchPlaceholder="Find a holder…"
              align="start"
            />
            <div className="funds-selected-position">
              <Position point={latest} />
              <span>{holdingPeriodLabel(latest.date)}</span>
            </div>
            <strong className="funds-shares">
              {compact(latest.shares)}
              <small>shares</small>
            </strong>
            {change !== undefined && (
              <span className={`funds-change ${changeClass}`}>
                {change > 0 ? (
                  <ArrowUp size={13} />
                ) : change < 0 ? (
                  <ArrowDown size={13} />
                ) : null}
                {change > 0 ? "+" : ""}
                {change.toFixed(2)}%<small>reported change</small>
              </span>
            )}
            <span className="funds-history-count">
              {fund.points.length}{" "}
              {fund.points.length === 1
                ? "collected period"
                : "collected periods"}
            </span>
          </div>
          <FundHistoryChart fund={fund} periods={periods} />
        </div>
      )}
      <div className="funds-table-toolbar">
        <label className="funds-search">
          <Search size={15} />
          <input
            aria-label="Search holders"
            placeholder="Find a holder…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Select
          label="Position filter"
          value={position}
          onValueChange={setPosition}
          options={[
            { value: "All", label: "All positions" },
            ...positions.map((p) => ({
              value: p,
              label: p === "Unknown" ? "Unknown / earlier" : p,
            })),
          ]}
        />
      </div>
      <div className="table-panel">
        <div className="table-scroll funds-table-scroll">
          <table
            className="data-table stock-data-table funds-table"
            aria-label="Reported shares by holder and reporting date"
          >
            <thead>
              <tr>
                <th>{kind === "institution" ? "Institution" : "Fund name"}</th>
                <th>Position</th>
                {periods.map((d) => (
                  <th key={d}>
                    <time dateTime={d} title={d}>
                      {holdingPeriodLabel(d)}
                    </time>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.id === fund?.id ? "fund-selected-row" : ""}
                    data-holder={row.name}
                  >
                    <th scope="row">
                      <button
                        className="fund-name"
                        aria-pressed={row.id === fund?.id}
                        onClick={() => setSelected(row.id)}
                      >
                        <span className="fund-avatar" aria-hidden="true">
                          {row.name[0]?.toUpperCase()}
                        </span>
                        <span title={row.name}>{row.name}</span>
                      </button>
                    </th>
                    <td>
                      <Position point={row.latest} />
                    </td>
                    {periods.map((d) => {
                      const p = row.points.find((p) => p.date === d);
                      return (
                        <td
                          key={d}
                          title={
                            p
                              ? `${p.name} · ${p.date}\nShares: ${p.shares.toLocaleString("en-US")}\n${p.observedAt ? `Collected: ${p.observedAt}` : ""}${p.value !== undefined ? `\nVendor value (USD): ${p.value.toLocaleString("en-US")}` : ""}${p.ownershipPercent !== undefined ? `\nOwnership: ${p.ownershipPercent.toFixed(2)}%` : ""}`
                              : "No collected observation"
                          }
                        >
                          {p ? compact(p.shares) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={Math.max(2, periods.length + 2)}
                    className="stock-table-empty"
                  >
                    {!view ? (
                      <MissingData data={data} dataset="funds" />
                    ) : query || position !== "All" ? (
                      "No matching holders"
                    ) : (
                      "No reported holders in this sample"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="stock-footnote">
        {view?.provider === "yahoo"
          ? "Top-holder sample · Missing entries do not mean zero."
          : "Reported holdings · Position changes are not trade records."}
      </p>
    </section>
  );
}
