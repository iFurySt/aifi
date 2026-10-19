import { useExchangeTime } from "../use-exchange-time";

/** Current exchange time is independent of the stored quote's observation time. */
export function ExchangeClock({
  timeZone = "America/New_York",
}: {
  timeZone?: string;
}) {
  const now = useExchangeTime();
  return (
    <time
      className="stock-exchange-clock"
      dateTime={new Date(now).toISOString()}
      aria-label="Current exchange time"
      title={`Current exchange time · ${timeZone}`}
    >
      {new Date(now).toLocaleString("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })}
    </time>
  );
}
