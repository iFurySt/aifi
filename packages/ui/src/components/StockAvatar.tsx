import { useContext, useEffect, useRef, useState } from "react";
import { StockLogoContext } from "../stock-directory-context";
import { peekPreparedStockLogo, prepareStockLogo } from "../stock-logo-image";

export function StockAvatar({
  symbol,
  className = "stock-monogram",
  enabled = true,
}: {
  symbol: string;
  className?: string;
  enabled?: boolean;
}) {
  const repository = useContext(StockLogoContext);
  const container = useRef<HTMLSpanElement>(null);
  const cached = repository?.peek?.(symbol);
  const ready = cached ? peekPreparedStockLogo(cached) : undefined;
  const initial = {
    symbol,
    url: ready?.url ?? null,
    light: ready?.light ?? false,
    settled: ready !== undefined || !enabled || !repository,
  };
  const [image, setImage] = useState(initial);
  useEffect(() => {
    let alive = true,
      loading = false,
      visible = false,
      retryAt = 0,
      failures = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelRetry = () => {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    };
    const retry = (delay: number) => {
      cancelRetry();
      retryAt = Date.now() + delay;
      if (alive && visible) retryTimer = setTimeout(() => void load(), delay);
    };
    if (!enabled || !repository || !container.current) return;
    const load = async () => {
      if (loading || !alive || !visible) return;
      if (Date.now() < retryAt) {
        retry(retryAt - Date.now());
        return;
      }
      cancelRetry();
      loading = true;
      try {
        const logo = await repository.get(symbol);
        const ready = logo ? await prepareStockLogo(logo) : null;
        failures = 0;
        if (alive) {
          setImage({
            symbol,
            url: ready?.url ?? null,
            light: ready?.light ?? false,
            settled: true,
          });
          if (!ready)
            retry(31000); // The adapter's missing-result TTL is 30s.
          else retryAt = Date.now() + 60000;
        }
      } catch {
        // Pressure/bridge errors must not strand a visible row on its letter.
        if (alive) retry(Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)));
      } finally {
        loading = false;
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) void load();
        else cancelRetry();
      },
      {
        // Expanding the window viewport does not expand an inner scroller's clip.
        root: container.current.closest(".stock-list"),
        rootMargin: "240px 0px",
      },
    );
    observer.observe(container.current);
    const focus = () => {
      if (visible) void load();
    };
    window.addEventListener("focus", focus);
    return () => {
      alive = false;
      cancelRetry();
      observer.disconnect();
      window.removeEventListener("focus", focus);
    };
  }, [symbol, enabled, repository]);
  const current = image.symbol === symbol ? image : initial;
  const url = enabled ? current.url : null;
  const state =
    !enabled || !repository
      ? "unavailable"
      : url
        ? "ready"
        : current.settled
          ? "unavailable"
          : "loading";
  return (
    <span
      className={`${className} stock-avatar`}
      ref={container}
      aria-hidden="true"
      data-logo-state={state}
      data-light-logo={!!url && current.light}
    >
      {url ? (
        <img
          src={url}
          alt=""
          decoding="sync"
          onError={() =>
            setImage({ symbol, url: null, light: false, settled: true })
          }
        />
      ) : (
        symbol.slice(0, 1)
      )}
    </span>
  );
}
