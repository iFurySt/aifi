import { useLayoutEffect, useRef, useState } from "react";
import { stockChartBars, type DailyBar } from "@aifi/core";
import { money } from "../workspace-context";

export function StockChart({
  symbol,
  bars: all,
  adjusted,
}: {
  symbol: string;
  bars: DailyBar[];
  adjusted: boolean;
}) {
  const [range, setRange] = useState("1Y"),
    [mode, setMode] = useState("Line"),
    [cursor, setCursor] = useState<number | null>(null),
    [pointerY, setPointerY] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(560);
  useLayoutEffect(() => {
    if (host.current)
      setWidth(Math.max(250, host.current.getBoundingClientRect().width));
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(250, entries[0]?.contentRect.width ?? 560)),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [symbol, all.length > 0]);
  const bars = stockChartBars(
    all,
    { "1M": 1, "3M": 3, "1Y": 12, "2Y": 24 }[range] ?? 12,
  );
  useLayoutEffect(() => setCursor(null), [symbol, range]);
  if (!bars.length)
    return (
      <section className="stock-chart-panel" ref={host}>
        <h2>Price history</h2>
        <div className="stock-no-data">No price data</div>
      </section>
    );
  const height = 300,
    right = width - 52,
    bottom = 210,
    values =
      mode === "Line"
        ? bars.map((b) => b.close)
        : bars.flatMap((b) => [b.low, b.high]),
    low = Math.min(...values),
    high = Math.max(...values),
    padding = (high - low) * 0.04 || Math.max(1, Math.abs(high) * 0.02),
    min = low - padding,
    max = high + padding,
    x = (i: number) => 12 + (i / Math.max(1, bars.length - 1)) * (right - 12),
    y = (v: number) => bottom - ((v - min) / (max - min || 1)) * 190;
  const active =
    cursor === null ? null : bars[Math.min(cursor, bars.length - 1)];
  const maxVolume = Math.max(...bars.map((b) => b.volume), 1);
  const barWidth = Math.max(
    0.35,
    Math.min(8, ((right - 12) / bars.length) * 0.72),
  );
  const tipWidth = 178;
  const tipLeft =
    cursor === null
      ? 0
      : Math.max(
          4,
          Math.min(
            width - tipWidth - 4,
            x(cursor) > width / 2 ? x(cursor) - tipWidth - 12 : x(cursor) + 12,
          ),
        );
  const tipTop = Math.max(
    8,
    Math.min(140, (pointerY ?? (active ? y(active.close) : 20)) - 24),
  );
  const selectPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    setCursor(
      Math.max(
        0,
        Math.min(
          bars.length - 1,
          Math.round(
            ((((event.clientX - r.left) / r.width) * width - 12) /
              (right - 12)) *
              (bars.length - 1),
          ),
        ),
      ),
    );
    setPointerY(event.clientY - r.top);
  };
  return (
    <section className="stock-chart-panel" ref={host}>
      <div className="stock-chart-heading">
        <strong>{money(bars.at(-1)!.close)}</strong>
        <small>{range} · Daily close</small>
      </div>
      <div className="stock-chart-canvas">
        <svg
          className="stock-price-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${symbol} ${range} ${mode.toLowerCase()} chart`}
          tabIndex={0}
          onPointerMove={selectPoint}
          onPointerDown={selectPoint}
          onPointerLeave={() => {
            setCursor(null);
            setPointerY(null);
          }}
          onFocus={() => {
            setCursor(bars.length - 1);
            setPointerY(null);
          }}
          onBlur={() => setCursor(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setCursor(null);
              setPointerY(null);
              return;
            }
            if (e.key === "Home" || e.key === "End") {
              e.preventDefault();
              setCursor(e.key === "Home" ? 0 : bars.length - 1);
              setPointerY(null);
              return;
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setPointerY(null);
              setCursor((i) =>
                Math.max(
                  0,
                  Math.min(
                    bars.length - 1,
                    (i ?? bars.length - 1) + (e.key === "ArrowLeft" ? -1 : 1),
                  ),
                ),
              );
            }
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1={12}
                x2={right}
                y1={20 + i * 47.5}
                y2={20 + i * 47.5}
                stroke="var(--border)"
                strokeDasharray="2 5"
              />
              <text
                x={right + 10}
                y={24 + i * 47.5}
                fill="var(--muted)"
                fontSize={10}
              >
                {(max - ((max - min) * i) / 4).toFixed(0)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => (
            <g key={b.date}>
              <rect
                className="stock-volume-bar"
                x={x(i) - barWidth / 2}
                y={278 - (b.volume / maxVolume) * 52}
                width={barWidth}
                height={(b.volume / maxVolume) * 52}
                fill={b.close >= b.open ? "var(--positive)" : "var(--negative)"}
                opacity={0.45}
              />
              {mode === "Candle" && (
                <>
                  <line
                    x1={x(i)}
                    x2={x(i)}
                    y1={y(b.high)}
                    y2={y(b.low)}
                    stroke={
                      b.close >= b.open ? "var(--positive)" : "var(--negative)"
                    }
                    strokeWidth={Math.min(1, barWidth)}
                  />
                  <rect
                    className="stock-candle-bar"
                    x={x(i) - barWidth / 2}
                    y={y(Math.max(b.open, b.close))}
                    width={barWidth}
                    height={Math.max(1, Math.abs(y(b.open) - y(b.close)))}
                    fill={
                      b.close >= b.open ? "var(--positive)" : "var(--negative)"
                    }
                  />
                </>
              )}
            </g>
          ))}
          {mode === "Line" && (
            <polyline
              points={bars.map((b, i) => `${x(i)},${y(b.close)}`).join(" ")}
              fill="none"
              stroke="var(--positive)"
              strokeWidth={1.8}
            />
          )}
          {active && (
            <>
              <line
                x1={x(cursor!)}
                x2={x(cursor!)}
                y1={16}
                y2={280}
                stroke="var(--secondary)"
                strokeDasharray="3 4"
              />
              <line
                x1={12}
                x2={right}
                y1={y(active.close)}
                y2={y(active.close)}
                stroke="var(--secondary)"
                strokeDasharray="3 4"
              />
              <circle
                cx={x(cursor!)}
                cy={y(active.close)}
                r={3.5}
                fill="var(--positive)"
              />
            </>
          )}
          <text x={12} y={298} fill="var(--muted)" fontSize={10}>
            {bars[0]!.date}
          </text>
          <text
            x={right}
            y={298}
            textAnchor="end"
            fill="var(--muted)"
            fontSize={10}
          >
            {bars.at(-1)!.date}
          </text>
        </svg>
        {active && (
          <div
            className="stock-chart-tooltip"
            role="tooltip"
            style={{ left: tipLeft, top: tipTop, width: tipWidth }}
          >
            <time dateTime={active.date}>
              {active.date}
              <span>Daily</span>
            </time>
            <dl>
              {(
                [
                  ["Open", money(active.open)],
                  ["High", money(active.high)],
                  ["Low", money(active.low)],
                  ["Close", money(active.close)],
                  [
                    "Volume",
                    new Intl.NumberFormat("en-US").format(active.volume),
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      <div className="stock-chart-readout">
        Daily OHLCV · {adjusted ? "Split-adjusted" : "Unadjusted"} ·{" "}
        {bars.length} sessions
      </div>
      <span className="sr-only" aria-live="polite">
        {active
          ? `${active.date} · Open ${money(active.open)} · High ${money(active.high)} · Low ${money(active.low)} · Close ${money(active.close)} · Volume ${active.volume}`
          : ""}
      </span>
      <div className="stock-chart-controls">
        <div className="segmented-control" aria-label="Price range">
          {["1M", "3M", "1Y", "2Y"].map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              className={range === r ? "selected" : ""}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="segmented-control" aria-label="Chart style">
          {["Line", "Candle"].map((t) => (
            <button
              key={t}
              aria-pressed={mode === t}
              className={mode === t ? "selected" : ""}
              onClick={() => setMode(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
