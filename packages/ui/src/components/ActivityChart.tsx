import { useState, useEffect, useRef } from "react";
import type { ActivityPoint } from "@aifi/core";
const compact = (n: number, currency: boolean) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    ...(currency ? { style: "currency", currency: "USD" } : {}),
  }).format(n);
export function ActivityChart({
  points,
  currency = false,
}: {
  points: ActivityPoint[];
  currency?: boolean;
}) {
  const [hover, setHover] = useState<number>();
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(920);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(330, Math.min(1200, Math.round(el.clientWidth)))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const height = 260,
    left = 60,
    right = 65,
    top = 20,
    bottom = 36,
    plot = width - left - right,
    h = height - top - bottom;
  const nice = (v: number) => {
    if (!v) return 0;
    if (!currency) return Math.ceil(v / 2) * 2;
    const unit = 10 ** Math.floor(Math.log10(v));
    return ([1, 2, 2.5, 5, 10].find((n) => n * unit >= v) ?? 10) * unit;
  };
  const max = nice(Math.max(0, ...points.map((p) => p.buy))),
    min = -nice(Math.max(0, ...points.map((p) => p.sell)));
  const span = max - min || 1;
  const y = (v: number) => top + ((max - v) / span) * h;
  const zero = y(0);
  const netMax = nice(Math.max(0, ...points.map((p) => p.net))),
    netMin = -nice(Math.max(0, ...points.map((p) => -p.net)));
  const ny = (v: number) => top + ((netMax - v) / (netMax - netMin || 1)) * h;
  const step = plot / Math.max(1, points.length),
    x = (i: number) => left + (i + 0.5) * step;
  const multiYear =
    points.length > 1 &&
    new Date(points[0].date).getUTCFullYear() !==
      new Date(points.at(-1)!.date).getUTCFullYear();
  const selected = hover === undefined ? undefined : points[hover];
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${x(i)},${ny(p.net)}`)
    .join(" ");
  return (
    <div className="activity-chart" ref={host}>
      <div className="activity-chart-legend">
        <span>
          <i className="activity-buy" />
          Purchases
        </span>
        <span>
          <i className="activity-sell" />
          Sales
        </span>
        <span>
          <i className="activity-net" />
          Cumulative net {currency ? "value" : "disclosures"}
        </span>
      </div>
      {points.length ? (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={
              currency
                ? "Disclosed insider market transaction values and cumulative net value"
                : "Disclosed purchases and sales with cumulative net count"
            }
            tabIndex={0}
            onMouseLeave={() => setHover(undefined)}
            onBlur={() => setHover(undefined)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setHover(undefined);
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                setHover((i) =>
                  Math.max(
                    0,
                    Math.min(
                      points.length - 1,
                      (i ?? (e.key === "ArrowRight" ? -1 : points.length)) +
                        (e.key === "ArrowRight" ? 1 : -1),
                    ),
                  ),
                );
              }
            }}
            onMouseMove={(e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              setHover(
                Math.max(
                  0,
                  Math.min(
                    points.length - 1,
                    Math.floor(
                      (((e.clientX - bounds.left) / bounds.width) * width -
                        left) /
                        step,
                    ),
                  ),
                ),
              );
            }}
          >
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={top + t * h}
                  y2={top + t * h}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <text x={left - 10} y={top + t * h + 4} textAnchor="end">
                  {compact(max - t * span, currency)}
                </text>
                <text x={width - right + 10} y={top + t * h + 4}>
                  {compact(netMax - t * (netMax - netMin), currency)}
                </text>
              </g>
            ))}
            <line
              x1={left}
              x2={width - right}
              y1={zero}
              y2={zero}
              stroke="var(--border)"
            />
            {points.map((p, i) => (
              <g key={p.date}>
                {p.buy > 0 && (
                  <rect
                    className="activity-buy-bar"
                    x={x(i) - step * 0.32}
                    y={y(p.buy)}
                    width={Math.max(1, step * 0.64)}
                    height={Math.max(1, zero - y(p.buy))}
                    rx={2}
                  />
                )}{" "}
                {p.sell > 0 && (
                  <rect
                    className="activity-sell-bar"
                    x={x(i) - step * 0.32}
                    y={zero}
                    width={Math.max(1, step * 0.64)}
                    height={Math.max(1, y(-p.sell) - zero)}
                    rx={2}
                  />
                )}
                {(i === 0 ||
                  i === points.length - 1 ||
                  i %
                    Math.max(
                      1,
                      Math.ceil(
                        points.length / Math.max(2, Math.floor(plot / 90)),
                      ),
                    ) ===
                    0) && (
                  <text x={x(i)} y={height - 11} textAnchor="middle">
                    {new Date(p.date).toLocaleDateString("en-US", {
                      month: "short",
                      ...(multiYear
                        ? { year: "2-digit" as const }
                        : { day: "numeric" as const }),
                      timeZone: "UTC",
                    })}
                  </text>
                )}
              </g>
            ))}
            <path d={path} fill="none" stroke="var(--text)" strokeWidth={2} />
            {selected && (
              <line
                x1={x(hover!)}
                x2={x(hover!)}
                y1={top}
                y2={height - bottom}
                stroke="var(--secondary)"
                strokeDasharray="3 4"
              />
            )}
          </svg>
          {selected && (
            <div
              className="activity-chart-tooltip"
              role="status"
              style={{
                left: `${(Math.max(90, Math.min(width - 90, x(hover!))) / width) * 100}%`,
              }}
            >
              <strong>{selected.date}</strong>
              <span>
                Purchases <b>{compact(selected.buy, currency)}</b>
              </span>
              <span>
                Sales <b>{compact(selected.sell, currency)}</b>
              </span>
              <span>
                Cumulative net <b>{compact(selected.net, currency)}</b>
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="activity-chart-empty">
          No transactions for this view
        </div>
      )}
    </div>
  );
}
