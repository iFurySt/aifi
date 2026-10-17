import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Search } from "lucide-react";
import {
  analystConsensus,
  analystDistribution,
  analystEvents,
  analystReference,
  activityCutoff,
  type StockResearch,
} from "@aifi/core";
import { AnalystRadar } from "../components/AnalystRadar";
import { Select } from "../components/Select";
import { DataTable, SourceNote, MissingData } from "./stock-research-shared";
import "./stock-activity.css";
import "./analysts.css";
const dollars = (v: number | undefined) =>
  v === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(v);
const ratingTone = (r: string) =>
  /sell|underweight|underperform|reduce/i.test(r)
    ? "negative"
    : /buy|overweight|outperform|accumulate/i.test(r)
      ? "positive"
      : "";
export function Analysts({ data }: { data: StockResearch }) {
  const view = data.datasets.analyst,
    consensus = analystConsensus(view),
    distribution = analystDistribution(view),
    reference = analystReference(data);
  const events = useMemo(
    () => analystEvents(view, reference?.price),
    [view, reference?.price],
  );
  const [query, setQuery] = useState(""),
    [firm, setFirm] = useState("All"),
    [action, setAction] = useState("All"),
    [range, setRange] = useState("1Y"),
    [limit, setLimit] = useState(200);
  const cutoff = activityCutoff(
    range,
    view?.fetchedAt ?? new Date().toISOString(),
  );
  const rows = events.filter(
    (r) =>
      r.date >= cutoff &&
      (firm === "All" || r.firm === firm) &&
      (action === "All" || r.action === action) &&
      `${r.firm} ${r.analyst ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="stock-tab-body activity-page analysts-page">
      <header className="activity-heading">
        <h2>Analysts</h2>
        <SourceNote
          view={view}
          detail={
            <p>
              Current consensus and recommendation distribution are separate
              vendor samples; their analyst counts can differ. Individual
              targets and prior targets are shown only when supplied. Missing
              analyst names stay blank. Upside compares a target with the latest
              stored reference price, not a realized return.
            </p>
          }
        />
      </header>
      <div className="analyst-overview">
        <AnalystRadar counts={distribution?.counts} />
        <div className="analyst-summary-stats">
          <div>
            <span>Consensus</span>
            <strong className={ratingTone(consensus.rating)}>
              {consensus.rating || "—"}
            </strong>
            <small>
              {distribution
                ? `${distribution.total} recommendations`
                : "No rating distribution"}
            </small>
          </div>
          <div>
            <span>Average target</span>
            <strong>{dollars(consensus.mean)}</strong>
            <small>
              {consensus.count ? `${consensus.count} target opinions` : ""}
            </small>
          </div>
        </div>
        {consensus.low !== undefined && consensus.high !== undefined && (
          <p className="analyst-target-range">
            Target range {dollars(consensus.low)} – {dollars(consensus.high)}
          </p>
        )}
      </div>
      <div className="activity-data-heading">
        <h3>Ratings</h3>
        <span>{rows.length} events</span>
      </div>
      <div className="activity-toolbar">
        <label className="activity-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find an analyst or firm"
            placeholder="Find an analyst or firm…"
          />
        </label>
        <div className="activity-filters">
          <Select
            label="Analyst firm"
            value={firm}
            options={[
              { value: "All", label: "All firms" },
              ...[...new Set(events.map((r) => r.firm))]
                .sort()
                .map((v) => ({ value: v, label: v })),
            ]}
            searchable
            onValueChange={setFirm}
          />
          <Select
            label="Rating action"
            value={action}
            options={[
              { value: "All", label: "All actions" },
              ...[...new Set(events.map((r) => r.action))]
                .sort()
                .map((v) => ({ value: v, label: v })),
            ]}
            onValueChange={setAction}
          />
          <Select
            label="Analyst event range"
            value={range}
            options={["6M", "1Y", "All"].map((v) => ({ value: v, label: v }))}
            onValueChange={setRange}
          />
        </div>
      </div>
      <div className="activity-table analyst-events">
        <DataTable
          columns={[
            "Date",
            "Firm",
            "Analyst",
            "Action",
            "Rating",
            "Target",
            "Upside",
          ]}
          rows={rows.slice(0, limit).map((r) => [
            r.date,
            <strong>{r.firm}</strong>,
            r.analyst ?? "—",
            <span
              className={`activity-side ${r.action === "Upgraded" || r.action === "Initiated" ? "activity-buy" : r.action === "Downgraded" ? "activity-sell" : ""}`}
            >
              {r.action}
            </span>,
            <span
              className={ratingTone(r.rating ?? "")}
              title={
                r.previousRating ? `Previous: ${r.previousRating}` : undefined
              }
            >
              {r.rating ?? "—"}
            </span>,
            <div className="analyst-target">
              <strong>{dollars(r.target)}</strong>
              {r.priorTarget !== undefined &&
                r.target !== undefined &&
                r.target !== r.priorTarget && (
                  <small
                    className={
                      r.target >= r.priorTarget ? "positive" : "negative"
                    }
                  >
                    {r.target >= r.priorTarget ? (
                      <ArrowUp size={11} />
                    ) : (
                      <ArrowDown size={11} />
                    )}{" "}
                    {dollars(Math.abs(r.target - r.priorTarget))}
                  </small>
                )}
            </div>,
            r.upside === undefined ? (
              "—"
            ) : (
              <span
                className={`analyst-upside ${r.upside >= 0 ? "positive" : "negative"}`}
                title={`Target vs stored price ${dollars(reference?.price)} · ${reference?.asOf ?? ""}; not realized return`}
              >
                {r.upside >= 0 ? (
                  <ArrowUp size={12} />
                ) : (
                  <ArrowDown size={12} />
                )}{" "}
                {Math.abs(r.upside).toFixed(1)}%
              </span>
            ),
          ])}
          empty={
            view ? (
              "No matching rating events"
            ) : (
              <MissingData data={data} dataset="analyst" />
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
        {reference
          ? `Upside vs stored price ${dollars(reference.price)} · ${reference.asOf.slice(0, 10)}`
          : "Reference price unavailable"}
      </p>
    </section>
  );
}
