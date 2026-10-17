import { useLayoutEffect, useRef, useState } from "react";
import { holdingPeriodLabel, type FundHistory } from "@aifi/core";
const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
export function FundHistoryChart({
  fund,
  periods,
}: {
  fund: FundHistory;
  periods: string[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600),
    [active, setActive] = useState<number>();
  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(220, node.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scope = `${fund.id}/${periods.join()}`;
  useLayoutEffect(() => setActive(undefined), [scope]);
  const dates = [...periods].reverse();
  const points = new Map(fund.points.map((p) => [p.date, p]));
  const height = 190,
    left = 52,
    right = 10,
    top = 15,
    bottom = height - 32;
  const max = Math.max(
    1,
    ...fund.points.filter((p) => dates.includes(p.date)).map((p) => p.shares),
  );
  const step = (width - left - right) / Math.max(1, dates.length);
  const x = (i: number) => left + step * (i + 0.5),
    y = (v: number) => top + (1 - v / max) * (bottom - top);
  const date = active === undefined ? undefined : dates[active],
    point = date ? points.get(date) : undefined;
  const tipWidth = Math.min(240, width - 16),
    tipLeft =
      active === undefined
        ? 8
        : Math.max(8, Math.min(width - tipWidth - 8, x(active) + 12));
  const stride = Math.max(
    1,
    Math.ceil(
      dates.length / Math.max(1, Math.floor((width - left - right) / 120)),
    ),
  );
  return (
    <div className="fund-history-chart" ref={host}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        tabIndex={0}
        aria-label={`${fund.name} reported share history`}
        onMouseMove={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          setActive(
            Math.max(
              0,
              Math.min(
                dates.length - 1,
                Math.floor(
                  (((e.clientX - bounds.left) * width) / bounds.width - left) /
                    step,
                ),
              ),
            ),
          );
        }}
        onMouseLeave={() => setActive(undefined)}
        onBlur={() => setActive(undefined)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setActive(undefined);
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setActive((i) =>
              Math.max(
                0,
                Math.min(
                  dates.length - 1,
                  (i ?? dates.length - 1) + (e.key === "ArrowLeft" ? -1 : 1),
                ),
              ),
            );
          }
        }}
      >
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              className="financial-grid-line"
              x1={left}
              x2={width - right}
              y1={y(max * n)}
              y2={y(max * n)}
            />
            <text
              className="financial-axis-label"
              x={left - 8}
              y={y(max * n) + 3}
              textAnchor="end"
            >
              {compact(max * n)}
            </text>
          </g>
        ))}
        {dates.map((d, i) => {
          const p = points.get(d);
          return (
            <g key={d}>
              {p && (
                <rect
                  data-period={d}
                  x={x(i) - Math.min(26, step * 0.5) / 2}
                  y={y(p.shares)}
                  width={Math.min(26, step * 0.5)}
                  height={Math.max(1, bottom - y(p.shares))}
                  rx={2}
                  fill="var(--positive)"
                  opacity={active === undefined || active === i ? 1 : 0.55}
                />
              )}
              {(i === 0 ||
                i === dates.length - 1 ||
                (i % stride === 0 && i < dates.length - 1)) && (
                <text
                  className="financial-axis-label"
                  x={
                    dates.length === 1
                      ? x(i)
                      : i === 0
                        ? left
                        : i === dates.length - 1
                          ? width - right
                          : x(i)
                  }
                  y={height - 7}
                  textAnchor={
                    dates.length === 1
                      ? "middle"
                      : i === 0
                        ? "start"
                        : i === dates.length - 1
                          ? "end"
                          : "middle"
                  }
                >
                  {holdingPeriodLabel(d)}
                </text>
              )}
            </g>
          );
        })}
        {active !== undefined && (
          <line
            className="financial-crosshair"
            x1={x(active)}
            x2={x(active)}
            y1={top}
            y2={bottom}
          />
        )}
      </svg>
      {date && (
        <div
          className="fund-chart-tooltip"
          role="status"
          style={{ left: tipLeft, width: tipWidth }}
        >
          <strong>{holdingPeriodLabel(date)}</strong>
          {point ? (
            <>
              <div>
                <span>Shares</span>
                <b>
                  {point.shares.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </b>
              </div>
              {point.ownershipPercent !== undefined && (
                <div>
                  <span>Ownership</span>
                  <b>{point.ownershipPercent.toFixed(2)}%</b>
                </div>
              )}
              {point.value !== undefined && (
                <div>
                  <span>Vendor value</span>
                  <b>${compact(point.value)}</b>
                </div>
              )}
            </>
          ) : (
            <div>No collected observation</div>
          )}
        </div>
      )}
    </div>
  );
}
