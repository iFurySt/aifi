import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  fundHistories,
  fundPeriods,
  holdingPeriodLabel,
  type FundPosition,
  type HolderKind,
  type StockResearch,
} from "@aifi/core";
import { Select } from "../components/Select";
import { FundOwnershipRing } from "../components/FundOwnershipRing";
import { FundAvatar } from "../components/FundAvatar";
import { syncResearch } from "@aifi/platform";
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
  const periods = useMemo(
    () => fundPeriods(scope, view?.data.reportPeriods),
    [scope, view],
  );
  const [chosenPeriod, setChosenPeriod] = useState("");
  const period = periods.includes(chosenPeriod)
    ? chosenPeriod
    : (periods[0] ?? "");
  const [syncing, setSyncing] = useState(false),
    [syncMessage, setSyncMessage] = useState("");
  const isHistory = view?.provider === "thirteenf";
  const rows = scope.filter(
    (f) =>
      (position === "All" ||
        f.points.find((p) => p.date === period)?.position === position) &&
      f.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const ownership = view?.data.ownership;
  return (
    <section className="stock-tab-body funds-page">
      <header className="funds-heading">
        <h2>Fund</h2>
        <SourceNote
          view={view}
          detail={
            <p>
              {isHistory
                ? "Tracked managers only. Shares are as reported, without split adjustment. A zero requires a complete filing; missing reports remain blank."
                : "Institution and fund/ETF samples overlap. Missing sample entries do not prove an exit. Report dates differ from collection dates."}
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
        {!isHistory && (
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
        )}
        <span className="funds-data-period">
          {period
            ? `Data from ${holdingPeriodLabel(period)}`
            : "Reported holdings"}
        </span>
        <div className="funds-period-controls">
          <Select
            label="Reporting period"
            value={period}
            options={periods.map((d) => ({
              value: d,
              label: holdingPeriodLabel(d),
            }))}
            onValueChange={setChosenPeriod}
            disabled={!periods.length}
          />
          <button
            className="text-link funds-backfill"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              setSyncMessage("");
              void syncResearch("funds")
                .then(() => setSyncMessage("Backfill queued"))
                .catch(() => setSyncMessage("Could not queue backfill"))
                .finally(() => setSyncing(false));
            }}
          >
            {syncing ? "Queuing…" : "Backfill"}
          </button>
        </div>
      </div>
      {syncMessage && (
        <p className="stock-footnote" role="status">
          {syncMessage}
        </p>
      )}
      {fund && (
        <FundOwnershipRing
          funds={scope}
          period={period}
          selected={fund}
          onSelect={setSelected}
          positionLabel={(p) =>
            !isHistory && !p.current
              ? "Earlier sample"
              : p.position === "Reduced"
                ? "Trimmed"
                : p.position === "Unknown"
                  ? "—"
                  : p.position
          }
        />
      )}
      <div className="funds-data-heading">
        <h3>Data</h3>
        {fund && (
          <Select
            label="Select fund"
            value={fund.id}
            options={scope.map((f) => ({ value: f.id, label: f.name }))}
            onValueChange={setSelected}
            searchable
            searchPlaceholder="Find a holder…"
            align="start"
          />
        )}
      </div>
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
              label:
                p === "Unknown"
                  ? "Unknown / earlier"
                  : p === "Reduced"
                    ? "Trimmed"
                    : p,
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
                <th>
                  {isHistory || kind === "fund" ? "Fund name" : "Institution"}
                </th>
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
                        <FundAvatar cik={row.latest.cik} name={row.name} />
                        <span title={row.name}>{row.name}</span>
                      </button>
                    </th>
                    <td>
                      {(() => {
                        const point = row.points.find((p) => p.date === period);
                        return point ? (
                          <span
                            className={`fund-position fund-position-${point.position.toLowerCase()}`}
                          >
                            {!isHistory && !point.current
                              ? "Earlier sample"
                              : point.position === "Reduced"
                                ? "Trimmed"
                                : point.position === "Unknown"
                                  ? "—"
                                  : point.position}
                          </span>
                        ) : (
                          "—"
                        );
                      })()}
                    </td>
                    {periods.map((d) => {
                      const p = row.points.find((p) => p.date === d);
                      return (
                        <td
                          key={d}
                          title={
                            p
                              ? `${p.name} · ${p.date}\nShares: ${p.shares.toLocaleString("en-US")}\n${p.filed ? `Filed: ${p.filed}\n` : ""}${p.filingId ? `Filing: ${p.filingId}\n` : ""}${p.observedAt ? `Collected: ${p.observedAt}` : ""}${p.value !== undefined ? `\nVendor value (USD): ${p.value.toLocaleString("en-US")}` : ""}${p.ownershipPercent !== undefined ? `\nOwnership: ${p.ownershipPercent.toFixed(2)}%` : ""}`
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
          : "Tracked managers · Reported shares, not trading flows."}
      </p>
    </section>
  );
}
