import type { CSSProperties, ReactNode } from "react";
import "./skeleton.css";

/** Decorative shape; the enclosing loading region owns its accessible status. */
export function Skeleton({
  width,
  height,
  className = "",
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  );
}
export function SkeletonGroup({
  label,
  children,
  className = "",
  inline = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  inline?: boolean;
}) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      className={`skeleton-group ${className}`}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {children}
    </Tag>
  );
}
export function SkeletonRows({
  label,
  rows = 4,
  avatar = false,
  trailing = true,
  className = "",
}: {
  label: string;
  rows?: number;
  avatar?: boolean;
  trailing?: boolean;
  className?: string;
}) {
  return (
    <SkeletonGroup label={label} className={`skeleton-rows ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          {avatar && <Skeleton className="skeleton-avatar" />}
          <div className="skeleton-copy">
            <Skeleton width={i % 2 ? "56%" : "72%"} />
            <Skeleton width={i % 2 ? "78%" : "50%"} height={10} />
          </div>
          {trailing && <Skeleton width={48} />}
        </div>
      ))}
    </SkeletonGroup>
  );
}

export function DashboardSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} className="skeleton-stack">
      <div className="skeleton-stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton width="60%" height={28} />
            <Skeleton width="75%" />
          </div>
        ))}
      </div>
      <Skeleton height={160} />
      <SkeletonRows label={label} rows={5} />
    </SkeletonGroup>
  );
}
