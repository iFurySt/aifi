import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, SlidersHorizontal, X } from "lucide-react";
import {
  chartRanges,
  chartRangeBars,
  simpleMovingAverage,
  relativeChartSeries,
  splitAdjustedBars,
  type ChartRange,
  type DailyBar,
  type ResearchDatasetView,
  type StockResearch,
} from "@aifi/core";
import {
  StockResearchContext,
  prepareStockResearch,
} from "../stock-research-context";
import { Select } from "./Select";
import { ResearchSource } from "./ResearchSource";
import { Skeleton } from "./Skeleton";
import { StockComparePicker } from "./StockComparePicker";
import "./stock-chart-tools.css";
import { money } from "../workspace-context";
const periods = [20, 50, 200] as const;
const studyColors: Record<number, string> = {
  20: "#d29a28",
  50: "#4c8dff",
  200: "#c774d9",
};
const comparisonColors = ["#4c8dff", "#cf7b35", "#aa78dd"];
const percentage = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export function StockChart({
  symbol,
  bars: all,
  adjusted,
  source,
}: {
  symbol: string;
  bars: DailyBar[];
  adjusted: boolean;
  source?: ResearchDatasetView;
}) {
  const [range, setRange] = useState<ChartRange>("1Y"),
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
  const reader = useContext(StockResearchContext);
  const [indicators, setIndicators] = useState<number[]>([]),
    [selected, setSelected] = useState<string[]>([]);
  const [peers, setPeers] = useState<
    Record<string, { data?: StockResearch; error?: string }>
  >({});
  const selectedKey = selected.join(",");
  useEffect(() => {
    let current = true;
    for (const ticker of selected)
      void prepareStockResearch(reader, ticker)
        .then((data) => {
          if (current) setPeers((old) => ({ ...old, [ticker]: { data } }));
        })
        .catch(() => {
          if (current)
            setPeers((old) => ({
              ...old,
              [ticker]: old[ticker]?.data
                ? old[ticker]!
                : { error: "Couldn't read prices" },
            }));
        });
    return () => {
      current = false;
    };
  }, [reader, selectedKey]);
  useLayoutEffect(() => {
    setSelected([]);
    setCursor(null);
  }, [symbol]);
  const windowBars = useMemo(() => chartRangeBars(all, range), [all, range]);
  const studies = useMemo(
    () =>
      indicators.map((period) => ({
        period,
        points: simpleMovingAverage(all, period),
      })),
    [all, indicators],
  );
  const comparable = useMemo(
    () =>
      selected.flatMap((ticker) => {
        const data = peers[ticker]?.data;
        if (!data) return [];
        const adjusted = splitAdjustedBars(data);
        return adjusted.adjusted && adjusted.bars.length > 1
          ? [{ symbol: ticker, bars: adjusted.bars }]
          : [];
      }),
    [selected, peers],
  );
  const comparison = useMemo(
    () =>
      adjusted
        ? relativeChartSeries([{ symbol, bars: windowBars }, ...comparable])
        : undefined,
    [adjusted, symbol, windowBars, comparable],
  );
  const bars = comparison?.bars ?? windowBars;
  const baseline = bars[0]?.close ?? 1;
  const displayValue = (value: number) =>
    comparison ? (value / baseline - 1) * 100 : value;
  const barPositions = useMemo(
    () => new Map(bars.map((b, i) => [b.date, i])),
    [bars],
  );
  const visibleStudies = useMemo(
    () =>
      studies.map((study) => ({
        ...study,
        points: study.points.filter((p) => barPositions.has(p.date)),
      })),
    [studies, barPositions],
  );
  useLayoutEffect(() => {
    setCursor(null);
    setPointerY(null);
  }, [symbol, range, comparison?.start, comparison?.end]);
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
    values = [
      ...(mode === "Line"
        ? bars.map((b) => displayValue(b.close))
        : bars.flatMap((b) => [displayValue(b.low), displayValue(b.high)])),
      ...visibleStudies.flatMap((s) =>
        s.points.map((p) => displayValue(p.value)),
      ),
      ...(comparison?.series.flatMap((s) => s.points.map((p) => p.value)) ??
        []),
    ],
    low = Math.min(...values),
    high = Math.max(...values),
    padding = (high - low) * 0.04 || Math.max(1, Math.abs(high) * 0.02),
    min = low - padding,
    max = high + padding,
    x = (i: number) => 12 + (i / Math.max(1, bars.length - 1)) * (right - 12),
    plotY = (v: number) => bottom - ((v - min) / (max - min || 1)) * 190,
    y = (v: number) => plotY(displayValue(v));
  const active =
    cursor === null ? null : bars[Math.min(cursor, bars.length - 1)];
  const trendColor =
    bars.at(-1)!.close >= bars[0]!.close
      ? "var(--positive)"
      : "var(--negative)";
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
    Math.min(
      Math.max(
        8,
        height -
          (58 +
            (5 + indicators.length + (comparison?.series.length ?? 0)) * 18),
      ),
      (pointerY ?? (active ? y(active.close) : 20)) - 24,
    ),
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
        {comparison && <small>Price return</small>}
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
                {(max - ((max - min) * i) / 4).toFixed(comparison ? 1 : 0)}
                {comparison ? "%" : ""}
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
              stroke={trendColor}
              strokeWidth={1.8}
            />
          )}
          {visibleStudies.map((study) => (
            <polyline
              key={study.period}
              data-study={`SMA${study.period}`}
              points={study.points
                .map((p) => `${x(barPositions.get(p.date)!)},${y(p.value)}`)
                .join(" ")}
              fill="none"
              stroke={studyColors[study.period]}
              strokeDasharray="5 3"
              strokeWidth={1.4}
            />
          ))}
          {comparison?.series.slice(1).map((series) => {
            const points = new Map(series.points.map((p) => [p.date, p.value]));
            let continued = false;
            const d = bars
              .map((b, i) => {
                const value = points.get(b.date);
                if (value === undefined) {
                  continued = false;
                  return "";
                }
                const command = continued ? "L" : "M";
                continued = true;
                return `${command}${x(i)},${plotY(value)}`;
              })
              .join(" ");
            return (
              <path
                key={series.symbol}
                data-comparison={series.symbol}
                d={d}
                fill="none"
                stroke={comparisonColors[selected.indexOf(series.symbol)]}
                strokeWidth={1.8}
              />
            );
          })}
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
                fill={trendColor}
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
            style={{
              left: `clamp(4px, ${tipLeft}px, calc(100% - ${tipWidth + 4}px))`,
              top: tipTop,
              width: tipWidth,
            }}
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
              {visibleStudies.map((study) => {
                const p = study.points.find((p) => p.date === active.date);
                return p ? (
                  <div key={study.period}>
                    <dt>SMA{study.period}</dt>
                    <dd>{money(p.value)}</dd>
                  </div>
                ) : null;
              })}
              {comparison?.series.map((series) => {
                const p = series.points.find((p) => p.date === active.date);
                return (
                  <div key={series.symbol}>
                    <dt>{series.symbol}</dt>
                    <dd>{p ? percentage(p.value) : "—"}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}
      </div>
      <span className="stock-chart-live-readout" aria-live="polite">
        {active
          ? `${active.date} · Open ${money(active.open)} · High ${money(active.high)} · Low ${money(active.low)} · Close ${money(active.close)} · Volume ${active.volume}`
          : ""}
      </span>
      <div className="stock-chart-controls">
        <Select
          label="Price range"
          value={range}
          onValueChange={setRange}
          options={chartRanges.map((value) => ({ value, label: value }))}
          align="start"
          className="stock-range-select"
        />
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
        <ResearchSource
          view={source}
          detail={
            <>
              <p>
                Daily OHLCV · {adjusted ? "Split-adjusted" : "Unadjusted"} ·{" "}
                {windowBars.length} sessions
              </p>
              {comparison && (
                <p>
                  Price return · Dividends excluded
                  <br />
                  {comparison.start} → {comparison.end}
                </p>
              )}
              {selected.map((ticker) => {
                const view = peers[ticker]?.data?.datasets.prices;
                return view ? (
                  <p key={ticker}>
                    {ticker} · {view.provider.toUpperCase()} ·{" "}
                    <time dateTime={view.fetchedAt}>
                      {new Date(view.fetchedAt).toLocaleDateString()}
                    </time>
                  </p>
                ) : null;
              })}
            </>
          }
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="stock-chart-tool"
            aria-label="Indicators"
          >
            <SlidersHorizontal size={14} />
            <span>Indicators</span>
            {indicators.length > 0 && <small>{indicators.length}</small>}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="dropdown-content stock-indicator-menu"
              align="start"
              sideOffset={6}
              collisionPadding={12}
            >
              {periods.map((period) => (
                <DropdownMenu.CheckboxItem
                  key={period}
                  className="dropdown-item"
                  checked={indicators.includes(period)}
                  disabled={all.length < period && !indicators.includes(period)}
                  title={
                    all.length < period
                      ? `Needs ${period} stored sessions`
                      : `${period}-session simple moving average`
                  }
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) =>
                    setIndicators((old) =>
                      checked
                        ? [...old, period]
                        : old.filter((p) => p !== period),
                    )
                  }
                >
                  <span
                    className="chart-series-dot"
                    style={{ background: studyColors[period] }}
                  />
                  <span>SMA{period}</span>
                  <DropdownMenu.ItemIndicator className="stock-indicator-check">
                    <Check size={14} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <StockComparePicker
          symbol={symbol}
          selected={selected}
          onChange={setSelected}
        />
      </div>
      {(indicators.length > 0 || selected.length > 0) && (
        <div className="stock-chart-legend">
          {comparison && (
            <span className="stock-series-label">
              <i style={{ background: trendColor }} />
              {symbol}
            </span>
          )}
          {indicators.map((period) => (
            <button
              key={period}
              onClick={() =>
                setIndicators((old) => old.filter((p) => p !== period))
              }
              aria-label={`Remove SMA${period}`}
            >
              <i style={{ background: studyColors[period] }} />
              SMA{period}
              <X size={11} />
            </button>
          ))}
          {selected.map((ticker, i) => (
            <button
              key={ticker}
              onClick={() =>
                setSelected((old) => old.filter((s) => s !== ticker))
              }
              aria-label={`Remove comparison ${ticker}`}
              aria-busy={!peers[ticker]}
            >
              <i style={{ background: comparisonColors[i] }} />
              {ticker}
              {!peers[ticker] && <Skeleton width={24} height={8} />}
              <X size={11} />
            </button>
          ))}
          {comparison && (
            <small title="Price return over the same observed dates; dividends excluded">
              {comparison.start} → {comparison.end}
            </small>
          )}
        </div>
      )}
      {selected.map((ticker) => {
        const entry = peers[ticker];
        const data = entry?.data;
        const prices = data ? splitAdjustedBars(data) : undefined;
        const message =
          entry?.error ||
          (prices && prices.bars.length < 2
            ? "No stored prices"
            : prices && (!adjusted || !prices.adjusted)
              ? "Split-adjusted prices needed"
              : prices && !comparison
                ? "No shared price dates"
                : "");
        return message ? (
          <p className="stock-compare-status" key={ticker} role="status">
            {ticker} · {message}
          </p>
        ) : null;
      })}
    </section>
  );
}
