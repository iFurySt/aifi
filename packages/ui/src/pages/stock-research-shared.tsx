import type { ReactNode } from "react";
import type {
  ResearchDataset,
  ResearchDatasetView,
  StockResearch,
} from "@aifi/core";
import { ResearchSource } from "../components/ResearchSource";
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
    disabled: "Sync is off",
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
