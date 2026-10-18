import type { StockTab } from "@aifi/core";
import { Skeleton, SkeletonGroup, SkeletonRows } from "./Skeleton";

export function StockLoading({ tab }: { tab: StockTab }) {
  if (tab !== "chart")
    return (
      <SkeletonGroup label={`Loading ${tab}`} className="stock-tab-body">
        <div className="skeleton-stats">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton width="55%" />
              <Skeleton width="70%" height={28} />
            </div>
          ))}
        </div>
        <div className="skeleton-chart">
          <Skeleton width="30%" height={20} />
          <Skeleton className="skeleton-chart-plot" />
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton-table-grid">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} width={j ? "70%" : "85%"} />
              ))}
            </div>
          ))}
        </div>
      </SkeletonGroup>
    );
  return (
    <SkeletonGroup
      label="Loading stock overview"
      className="stock-chart-layout"
    >
      <div className="stock-identity-column">
        <section className="stock-quote skeleton-stack">
          <Skeleton width="48%" />
          <Skeleton width="80%" height={38} />
          <Skeleton width="65%" />
          <Skeleton width="58%" />
        </section>
        <section className="stock-about stock-company-about skeleton-stack">
          <Skeleton width="60%" height={18} />
          {[100, 94, 100, 86, 65].map((n, i) => (
            <Skeleton key={i} width={`${n}%`} />
          ))}
        </section>
        <section className="stock-about stock-analyst-overview skeleton-stack">
          <Skeleton width="42%" height={18} />
          <Skeleton height={90} />
        </section>
      </div>
      <div className="stock-metrics-column">
        <div className="skeleton-stock-metrics">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton-copy">
              <Skeleton width="70%" height={10} />
              <Skeleton width="80%" height={18} />
            </div>
          ))}
        </div>
      </div>
      <div className="stock-visual-column">
        <div className="stock-price-section skeleton-chart">
          <Skeleton width="30%" height={24} />
          <Skeleton className="skeleton-chart-plot" />
          <Skeleton width="55%" />
        </div>
        <div className="stock-digest stock-filings-overview">
          <SkeletonRows label="Loading filings" rows={4} />
        </div>
      </div>
    </SkeletonGroup>
  );
}
