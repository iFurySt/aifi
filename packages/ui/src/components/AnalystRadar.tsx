import { ratingLabels } from "@aifi/core";
export function AnalystRadar({ counts }: { counts?: number[] }) {
  const cx = 170,
    cy = 158,
    radius = 115,
    max = Math.max(1, ...(counts ?? []));
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const polygon = (scale: number) =>
    Array.from({ length: 5 }, (_, i) =>
      point(i, radius * scale).join(","),
    ).join(" ");
  return (
    <svg
      className="analyst-radar"
      viewBox="0 0 340 306"
      role="img"
      aria-label={
        counts
          ? `Analyst recommendations: ${counts.map((n, i) => `${ratingLabels[i]} ${n}`).join(", ")}`
          : "Analyst recommendation distribution unavailable"
      }
    >
      {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
        <polygon
          key={scale}
          points={polygon(scale)}
          fill="none"
          stroke="var(--border)"
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const p = point(i, radius);
        return (
          <line
            key={i}
            x1={cx}
            x2={p[0]}
            y1={cy}
            y2={p[1]}
            stroke="var(--border)"
          />
        );
      })}
      {counts && (
        <polygon
          points={counts
            .map((n, i) => point(i, (radius * n) / max).join(","))
            .join(" ")}
          fill="color-mix(in srgb,var(--positive) 15%,transparent)"
          stroke="var(--positive)"
          strokeWidth={2}
        />
      )}
      {ratingLabels.map((label, i) => {
        const [x, y] = point(i, radius + 25);
        return (
          <g key={label}>
            <text x={x} y={y} textAnchor="middle">
              {label}
            </text>
            {counts && (
              <text x={x} y={y + 15} className="analyst-radar-count">
                {counts[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
