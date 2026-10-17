import { financialMetric } from "@aifi/core";
export function formatFinancialValue(metric: string, value: number) {
  const format = financialMetric(metric)?.format;
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "ratio") return `${value.toFixed(2)}×`;
  return new Intl.NumberFormat("en-US", {
    ...(format !== "shares"
      ? { style: "currency" as const, currency: "USD" }
      : {}),
    ...(format !== "perShare"
      ? { notation: "compact" as const, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }).format(value);
}
export const financialDate = (end: string) =>
  new Date(`${end}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  });
