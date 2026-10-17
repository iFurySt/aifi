import { useMemo, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import {
  insiderTrades,
  insiderCodeLabel,
  activityCutoff,
  activityPoints,
  type StockResearch,
} from "@aifi/core";
import { Select } from "../components/Select";
import { ActivityChart } from "../components/ActivityChart";
import { DataTable, SourceNote, MissingData } from "./stock-research-shared";
import "./stock-activity.css";
const num = (v: number | undefined, money = false) =>
  v === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        ...(money ? { style: "currency", currency: "USD" } : {}),
        maximumFractionDigits: money ? 2 : 4,
      }).format(v);
const compact = (v: number | undefined) =>
  v === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(v);
export function Insiders({ data }: { data: StockResearch }) {
  const view = data.datasets.insiders,
    all = useMemo(() => insiderTrades(view), [view]);
  const [range, setRange] = useState("1Y"),
    [scope, setScope] = useState("trades"),
    [side, setSide] = useState("All"),
    [query, setQuery] = useState("");
  const cutoff = activityCutoff(
    range,
    view?.fetchedAt ?? new Date().toISOString(),
  );
  const rows = all.filter(
    (r) =>
      r.date >= cutoff &&
      (side === "All" || side === r.side) &&
      r.name.toLowerCase().includes(query.toLowerCase()) &&
      (scope === "all" ||
        (scope === "trades" && r.eligible) ||
        (scope === "derivative" && r.derivative) ||
        (scope === "other" && r.side === "other") ||
        (scope === "amendments" && (r.amendment || r.superseded))),
  );
  const market = rows.filter((r) => r.eligible);
  const points = activityPoints(market, "value");
  const shown = rows.slice(0, 200);
  const incomplete = market.filter((r) => r.value === undefined).length;
  return (
    <section className="stock-tab-body activity-page">
      <header className="activity-heading">
        <h2>Insiders</h2>
        <SourceNote
          view={view}
          detail={
            <p>
              Issuer-wide SEC Form 4 / 4-A records. Chart value is reported
              shares × price for non-derivative P/S purchases/sales only.
              Awards, exercises, withholding, derivative rows, amendments and
              potentially superseded originals are excluded. Missing prices stay
              unknown. Older submission archives are outside this window.
            </p>
          }
        />
      </header>
      <div className="activity-toolbar">
        <div
          className="segmented-control"
          aria-label="Insider transaction type"
        >
          {["All", "buy", "sell"].map((v) => (
            <button
              key={v}
              aria-pressed={side === v}
              className={side === v ? "selected" : ""}
              onClick={() => setSide(v)}
            >
              {v === "All" ? v : v === "buy" ? "Purchases" : "Sales"}
            </button>
          ))}
        </div>
        <Select
          label="Insider activity range"
          value={range}
          options={["6M", "1Y", "All"].map((v) => ({ value: v, label: v }))}
          onValueChange={setRange}
        />
      </div>
      <ActivityChart points={points} currency />
      {incomplete > 0 && (
        <p className="stock-footnote">
          {incomplete} transactions have no reported value.
        </p>
      )}
      <div className="activity-data-heading">
        <h3>Activity</h3>
        <span>{rows.length} events</span>
      </div>
      <div className="activity-toolbar">
        <label className="activity-search">
          <Search size={15} />
          <input
            aria-label="Find an insider"
            placeholder="Find an insider…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Select
          label="Insider events"
          value={scope}
          onValueChange={setScope}
          options={[
            { value: "trades", label: "Purchases & sales" },
            { value: "all", label: "All events" },
            { value: "other", label: "Awards & other events" },
            { value: "derivative", label: "Derivatives" },
            { value: "amendments", label: "Amendments" },
          ]}
        />
      </div>
      <div className="activity-table">
        <DataTable
          columns={[
            "Insider",
            "Date",
            "Type",
            "Value",
            "Shares",
            "Price",
            "Shares after",
            "Ownership",
            "Filed",
            "Source",
          ]}
          rows={shown.map((r) => [
            <div className="activity-person">
              <div>
                <strong>{r.name}</strong>
                <small>{r.role}</small>
                {(r.amendment || r.superseded || r.derivative) && (
                  <small>
                    {r.amendment
                      ? "Amended"
                      : r.superseded
                        ? "Superseded"
                        : "Derivative"}
                  </small>
                )}
              </div>
            </div>,
            r.date,
            <span
              className={`activity-side activity-${r.side}`}
              title={`SEC code ${r.code}${r.plan ? " · Rule 10b5-1 plan" : ""}`}
            >
              {insiderCodeLabel(r.code)}
            </span>,
            <span title="Reported shares × reported price; not profit or portfolio value">
              {compact(r.value)}
            </span>,
            num(r.shares),
            num(r.price, true),
            num(r.sharesAfter),
            r.ownership === "D"
              ? "Direct"
              : r.ownership === "I"
                ? "Indirect"
                : "—",
            r.filed ?? "—",
            r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${r.name} Form 4`}
              >
                <ExternalLink size={14} />
              </a>
            ) : (
              "—"
            ),
          ])}
          empty={
            view ? (
              "No matching insider events"
            ) : (
              <MissingData data={data} dataset="insiders" />
            )
          }
        />
      </div>
      <p className="stock-footnote">
        SEC Form 4 · Purchases / sales only in chart
        {rows.length > 200 ? ` · Showing 200 of ${rows.length}` : ""}
      </p>
    </section>
  );
}
