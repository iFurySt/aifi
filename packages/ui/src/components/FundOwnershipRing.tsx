import { useState } from "react";
import {
  holdingPeriodLabel,
  type FundHistory,
  type FundHolding,
} from "@aifi/core";
import { FundAvatar } from "./FundAvatar";
const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
export function FundOwnershipRing({
  funds,
  period,
  selected,
  onSelect,
  positionLabel,
}: {
  funds: FundHistory[];
  period: string;
  selected?: FundHistory;
  onSelect: (id: string) => void;
  positionLabel: (p: FundHolding) => string;
}) {
  const [hovered, setHovered] = useState<string>();
  const visible = funds.flatMap((f) => {
    const point = f.points.find((p) => p.date === period);
    return point && point.shares > 0 ? [{ fund: f, point }] : [];
  });
  const total = visible.reduce((sum, r) => sum + r.point.shares, 0),
    circumference = 2 * Math.PI * 114;
  const point = selected?.points.find((p) => p.date === period),
    delta = point?.changeShares;
  const value =
    delta !== undefined && delta !== 0 ? Math.abs(delta) : point?.shares;
  const label =
    delta !== undefined && delta > 0
      ? "Shares added"
      : delta !== undefined && delta < 0
        ? "Shares trimmed"
        : "Shares held";
  const cls =
    delta !== undefined && delta > 0
      ? "positive"
      : delta !== undefined && delta < 0
        ? "fund-trimmed"
        : "";
  const hover = visible.find((v) => v.fund.id === hovered);
  let offset = 0;
  return (
    <div className="fund-ownership-visual">
      <div className="fund-ring-holder">
        {selected && (
          <>
            <FundAvatar cik={selected.latest.cik} name={selected.name} large />
            <strong>{selected.name}</strong>
            {point && (
              <span
                className={`fund-position fund-position-${point.position.toLowerCase()}`}
              >
                {positionLabel(point)}
              </span>
            )}
          </>
        )}
      </div>
      <div className="fund-ring-wrap">
        <svg
          viewBox="0 0 320 320"
          role="img"
          tabIndex={0}
          aria-label="Tracked fund ownership by reported shares"
          onMouseLeave={() => setHovered(undefined)}
          onBlur={() => setHovered(undefined)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setHovered(undefined);
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const i = funds.findIndex((f) => f.id === selected?.id);
              const next =
                funds[
                  (i + (e.key === "ArrowRight" ? 1 : -1) + funds.length) %
                    funds.length
                ];
              if (next) onSelect(next.id);
            }
          }}
        >
          <circle
            cx="160"
            cy="160"
            r="114"
            fill="none"
            stroke="var(--surface-muted)"
            strokeWidth="38"
          />
          {visible.map(({ fund, point }) => {
            const length = (point.shares / total) * circumference;
            const currentOffset = offset;
            offset += length;
            return (
              <circle
                key={fund.id}
                data-holder-id={fund.id}
                className={`fund-ring-sector ${fund.id === selected?.id ? "active" : ""}`}
                cx="160"
                cy="160"
                r="114"
                fill="none"
                strokeWidth="38"
                strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 160 160)"
                onMouseEnter={() => setHovered(fund.id)}
                onClick={() => onSelect(fund.id)}
              >
                <title>
                  {fund.name}: {compact(point.shares)} reported shares
                </title>
              </circle>
            );
          })}
        </svg>
        <div className="fund-ring-center">
          <span>{period ? holdingPeriodLabel(period) : "No report"}</span>
          <strong className={cls}>
            {value === undefined
              ? "—"
              : `${delta !== undefined && delta > 0 ? "▲ " : delta !== undefined && delta < 0 ? "▼ " : ""}${compact(value)}`}
          </strong>
          <span>{point ? label : "Not reported"}</span>
        </div>
        {hover && (
          <div className="fund-ring-tooltip" role="status">
            <strong>{hover.fund.name}</strong>
            <span>
              {compact(hover.point.shares)} shares ·{" "}
              {((hover.point.shares / total) * 100).toFixed(1)}% of tracked
              holdings
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
