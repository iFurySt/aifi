import { useLayoutEffect, useRef, useState } from "react";
import { financialMetric, type FinancialPoint } from "@aifi/core";
import { financialDate, formatFinancialValue } from "./financial-format";
const colors = ["var(--text)", "var(--positive)", "var(--muted)"];
export function FinancialTrend({
  ends,
  metrics,
  series,
}: {
  ends: string[];
  metrics: string[];
  series: Map<string, FinancialPoint[]>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [active, setActive] = useState<number>();
  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(200, node.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scope = `${ends.join(",")}/${metrics.join(",")}`;
  useLayoutEffect(() => setActive(undefined), [scope]);
  const dates = [...ends].reverse();
  const values = metrics.flatMap((id) =>
    (series.get(id) ?? [])
      .filter((p) => dates.includes(p.end))
      .map((p) => p.value),
  );
  const height = 230,
    left = 58,
    right = 8,
    top = 16,
    bottom = height - 34;
  const min = Math.min(0, ...values),
    rawMax = Math.max(0, ...values),
    max = rawMax === min ? rawMax + 1 : rawMax,
    span = max - min;
  const y = (value: number) => top + ((max - value) / span) * (bottom - top);
  const plotWidth = width - left - right,
    step = plotWidth / Math.max(1, dates.length);
  const x = (index: number) => left + (index + 0.5) * step;
  const barWidth = Math.max(
    1,
    Math.min(16, (step * 0.72) / Math.max(1, metrics.length)),
  );
  const labelStride = Math.max(
    1,
    Math.ceil(
      (dates.length - 1) / Math.max(1, Math.floor(plotWidth / 110) - 1),
    ),
  );
  const date = active === undefined ? undefined : dates[active];
  const tipWidth = Math.min(260, width - 16),
    tipLeft =
      active === undefined
        ? 0
        : Math.max(8, Math.min(width - tipWidth - 8, x(active) + 14));
  return (
    <div ref={host} className="financial-trend">
      <div className="financial-trend-legend">
        {metrics.map((id, i) => (
          <span key={id}>
            <i style={{ background: colors[i] }} />
            {financialMetric(id)?.label}
          </span>
        ))}
      </div>
      {values.length ? (
        <>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Financial history by reported period"
            tabIndex={0}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setActive(
                Math.max(
                  0,
                  Math.min(
                    dates.length - 1,
                    Math.floor(
                      (((e.clientX - rect.left) * width) / rect.width - left) /
                        step,
                    ),
                  ),
                ),
              );
            }}
            onPointerLeave={() => setActive(undefined)}
            onFocus={() => setActive(dates.length - 1)}
            onBlur={() => setActive(undefined)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                setActive((old) =>
                  Math.max(
                    0,
                    Math.min(
                      dates.length - 1,
                      (old ?? dates.length - 1) +
                        (e.key === "ArrowLeft" ? -1 : 1),
                    ),
                  ),
                );
              } else if (e.key === "Escape") setActive(undefined);
            }}
          >
            <title>
              {metrics.map((id) => financialMetric(id)?.label).join(" and ")}
            </title>
            {[0, 0.5, 1].map((fraction) => {
              const value = min + span * fraction;
              return (
                <g key={fraction}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y(value)}
                    y2={y(value)}
                    className="financial-grid-line"
                  />
                  <text
                    x={left - 8}
                    y={y(value) + 4}
                    textAnchor="end"
                    className="financial-axis-label"
                  >
                    {formatFinancialValue(metrics[0]!, value)}
                  </text>
                </g>
              );
            })}
            {dates.map((end, i) => (
              <g key={end}>
                {metrics.map((id, j) => {
                  const point = series.get(id)?.find((p) => p.end === end);
                  if (!point) return null;
                  return (
                    <rect
                      key={id}
                      x={x(i) - (barWidth * metrics.length) / 2 + j * barWidth}
                      y={Math.min(y(0), y(point.value))}
                      width={Math.max(0.5, barWidth - 1.5)}
                      height={Math.max(1, Math.abs(y(point.value) - y(0)))}
                      rx={1.5}
                      fill={point.value < 0 ? "var(--negative)" : colors[j]}
                      opacity={active === undefined || active === i ? 1 : 0.55}
                    />
                  );
                })}
                {(i === dates.length - 1 ||
                  (i % labelStride === 0 &&
                    dates.length - 1 - i >= labelStride / 2)) && (
                  <text
                    x={x(i)}
                    y={height - 9}
                    textAnchor={
                      i === 0
                        ? "start"
                        : i === dates.length - 1
                          ? "end"
                          : "middle"
                    }
                    className="financial-axis-label"
                  >
                    {financialDate(end)}
                  </text>
                )}
              </g>
            ))}
            {active !== undefined && (
              <line
                x1={x(active)}
                x2={x(active)}
                y1={top}
                y2={bottom}
                className="financial-crosshair"
              />
            )}
          </svg>
          {date && (
            <div
              className="financial-trend-tooltip"
              style={{ left: tipLeft, width: tipWidth }}
              role="status"
            >
              <strong>{financialDate(date)}</strong>
              {metrics.map((id, i) => {
                const point = series.get(id)?.find((p) => p.end === date);
                return (
                  <div key={id}>
                    <span>
                      <i style={{ background: colors[i] }} />
                      <span className="financial-tooltip-label">
                        {financialMetric(id)?.label}
                      </span>
                    </span>
                    <b>{point ? formatFinancialValue(id, point.value) : "—"}</b>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="financial-trend-empty">
          No history for the selected metrics
        </div>
      )}
    </div>
  );
}
