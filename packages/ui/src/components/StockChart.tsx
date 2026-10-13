import { useEffect, useMemo, useRef, useState } from "react";
import { sampleBars } from "../pages/stock-fixtures";
import { money } from "../workspace-context";

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState("1Y"),
    [mode, setMode] = useState("Line"),
    [cursor, setCursor] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(560);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(250, entries[0]?.contentRect.width ?? 560)),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [symbol]);
  const all = useMemo(() => sampleBars(symbol), [symbol]);
  const bars = all.slice(
    -({ "1M": 22, "3M": 65, "1Y": 252, "2Y": 504 }[range] ?? 252),
  );
  useEffect(() => setCursor(null), [symbol, range]);
  if (!bars.length)
    return (
      <section className="stock-chart-panel">
        <h2>Price history</h2>
        <div className="stock-no-data">No price data</div>
      </section>
    );
  const height = 300,
    right = width - 52,
    bottom = 210,
    min = Math.min(...bars.map((b) => b.low)),
    max = Math.max(...bars.map((b) => b.high)),
    x = (i: number) => 12 + (i / Math.max(1, bars.length - 1)) * (right - 12),
    y = (v: number) => bottom - ((v - min) / (max - min || 1)) * 190;
  const active =
    cursor === null ? null : bars[Math.min(cursor, bars.length - 1)];
  const stride = Math.max(1, Math.ceil(bars.length / 64));
  return (
    <section className="stock-chart-panel" ref={host}>
      <div className="stock-chart-heading">
        <strong>{money(bars.at(-1)!.close)}</strong>
        <small>{range} · Sample prices</small>
      </div>
      <svg
        className="stock-price-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${symbol} sample ${range} ${mode.toLowerCase()} chart`}
        tabIndex={0}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setCursor(
            Math.max(
              0,
              Math.min(
                bars.length - 1,
                Math.round(
                  ((((e.clientX - r.left) / r.width) * width - 12) /
                    (right - 12)) *
                    (bars.length - 1),
                ),
              ),
            ),
          );
        }}
        onMouseLeave={() => setCursor(null)}
        onFocus={() => setCursor(bars.length - 1)}
        onBlur={() => setCursor(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
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
        {bars.map((b, i) =>
          i % stride === 0 ? (
            <g key={b.date}>
              <rect
                x={x(i)}
                y={278 - b.volume / 3000000}
                width={Math.max(
                  2,
                  ((right - 12) / (bars.length / stride)) * 0.65,
                )}
                height={b.volume / 3000000}
                fill="var(--muted)"
                opacity={0.24}
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
                  />
                  <rect
                    x={x(i) - 2}
                    y={y(Math.max(b.close, b.open))}
                    width={4}
                    height={Math.max(2, Math.abs(y(b.close) - y(b.open)))}
                    fill={
                      b.close >= b.open ? "var(--positive)" : "var(--negative)"
                    }
                  />
                </>
              )}
            </g>
          ) : null,
        )}
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
      <div className="stock-chart-readout" aria-live="polite">
        {active
          ? `${active.date} · O ${money(active.open)} · H ${money(active.high)} · L ${money(active.low)} · C ${money(active.close)}`
          : "Daily OHLCV · Split-adjusted sample"}
      </div>
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
