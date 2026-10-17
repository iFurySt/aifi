import { useMemo, useState } from "react";
import { Search, ExternalLink, TriangleAlert } from "lucide-react";
import {
  splitAdjustedBars,
  politicalTrades,
  activityPoints,
  activityCutoff,
  type StockResearch,
} from "@aifi/core";
import { Select } from "../components/Select";
import { ActivityChart } from "../components/ActivityChart";
import { DataTable, SourceNote, MissingData } from "./stock-research-shared";
import "./stock-activity.css";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
export function Politicians({ data }: { data: StockResearch }) {
  const [limit, setLimit] = useState(200);
  const view = data.datasets.politicians;
  const adjusted = useMemo(() => splitAdjustedBars(data), [data]);
  const all = useMemo(() => politicalTrades(view), [view]);
  const [range, setRange] = useState("All"),
    [side, setSide] = useState("All"),
    [chamber, setChamber] = useState("All"),
    [person, setPerson] = useState("All"),
    [query, setQuery] = useState("");
  const cutoff = activityCutoff(
    range,
    view?.fetchedAt ?? new Date().toISOString(),
  );
  const rows = all.filter(
    (r) =>
      r.date >= cutoff &&
      (side === "All" || r.side === side) &&
      (chamber === "All" || r.chamber === chamber) &&
      (person === "All" || r.name === person) &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );
  const points = activityPoints(
    rows.map((r) => ({ ...r, excluded: r.ambiguous })),
    "count",
  );
  const buyers = new Map<string, number>();
  for (const r of all)
    if (r.side === "buy" && !r.ambiguous && r.date >= cutoff)
      buyers.set(r.name, (buyers.get(r.name) ?? 0) + 1);
  const leaders = [...buyers]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6);
  const shown = rows.slice(0, limit);
  return (
    <section className="stock-tab-body activity-page">
      <header className="activity-heading">
        <h2>Politicians</h2>
        <SourceNote
          view={view}
          detail={
            <p>
              House and Senate disclosures. Amounts are reported ranges; the
              chart counts disclosures. Possible duplicate lines remain visible
              but are excluded from chart and ranking counts. Price movement is
              not portfolio return; actual share counts and dollar gains are
              unavailable.
            </p>
          }
        />
      </header>
      {leaders.length > 0 && (
        <div className="politician-leaders">
          <p>
            Top buyers <span>by disclosed purchases</span>
          </p>
          <div>
            {leaders.map(([name, count]) => (
              <button
                key={name}
                className={person === name ? "selected" : ""}
                onClick={() => setPerson(person === name ? "All" : name)}
                aria-pressed={person === name}
              >
                <span className="activity-avatar">{initials(name)}</span>
                <strong>{name}</strong>
                <small>{count} purchases</small>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="activity-toolbar">
        <div
          className="segmented-control"
          aria-label="Political transaction type"
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
          label="Political activity range"
          value={range}
          options={["6M", "1Y", "All"].map((v) => ({ value: v, label: v }))}
          onValueChange={setRange}
        />
      </div>
      <ActivityChart points={points} />
      <div className="activity-data-heading">
        <h3>Data</h3>
        <span>{rows.length} disclosures</span>
      </div>
      <div className="activity-toolbar">
        <label className="activity-search">
          <Search size={15} />
          <input
            aria-label="Find a politician"
            placeholder="Find a politician…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="activity-filters">
          <Select
            label="Politician"
            value={person}
            searchable
            options={[
              { value: "All", label: "All politicians" },
              ...[...new Set(all.map((r) => r.name))]
                .sort()
                .map((v) => ({ value: v, label: v })),
            ]}
            onValueChange={setPerson}
          />
          <Select
            label="Chamber"
            value={chamber}
            options={[
              { value: "All", label: "All chambers" },
              { value: "house", label: "House" },
              { value: "senate", label: "Senate" },
            ]}
            onValueChange={setChamber}
          />
        </div>
      </div>
      <div className="activity-table">
        <DataTable
          columns={[
            "Politician",
            "Date",
            "Type",
            "Reported range",
            "Owner",
            "Disclosed",
            "Price move",
            "Source",
          ]}
          rows={shown.map((r) => {
            const prior = adjusted.adjusted
              ? adjusted.bars.find((b) => b.date === r.date)
              : undefined;
            const latest = adjusted.bars.at(-1);
            const change =
              prior && latest && latest.date >= r.date && prior.close > 0
                ? (latest.close / prior.close - 1) * 100
                : undefined;
            return [
              <div className="activity-person">
                <span className="activity-avatar">{initials(r.name)}</span>
                <div>
                  <strong>{r.name}</strong>
                  <small>
                    {r.chamber ?? ""}
                    {r.party ? ` · ${r.party}` : ""}
                  </small>
                </div>
                {r.ambiguous && (
                  <TriangleAlert
                    size={13}
                    className="activity-warning"
                    aria-label="Possible duplicate disclosure"
                  />
                )}
              </div>,
              r.date,
              <span className={`activity-side activity-${r.side}`}>
                {r.side === "buy"
                  ? "Purchase"
                  : r.side === "sell"
                    ? "Sale"
                    : "Other"}
              </span>,
              <span title={r.asset}>{r.amount}</span>,
              r.owner || "—",
              r.filed || "—",
              change === undefined ? (
                "—"
              ) : (
                <span
                  className={change >= 0 ? "positive" : "negative"}
                  title={`Stored daily close ${r.date} to ${latest!.date}; price movement, not investment return`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
              ),
              r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${r.name} disclosure`}
                >
                  <ExternalLink size={14} />
                </a>
              ) : (
                "—"
              ),
            ];
          })}
          empty={
            view ? (
              "No matching disclosures"
            ) : (
              <MissingData data={data} dataset="politicians" />
            )
          }
        />
      </div>
      {rows.length > limit && (
        <button
          className="secondary-button activity-more"
          onClick={() => setLimit((n) => n + 200)}
        >
          Show more
        </button>
      )}
      <p className="stock-footnote">
        Reported amounts are ranges · House / Senate
        {rows.length > limit ? ` · Showing ${limit} of ${rows.length}` : ""}
      </p>
    </section>
  );
}
