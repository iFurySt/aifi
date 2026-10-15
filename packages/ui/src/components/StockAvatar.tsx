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
      lastAttempt = 0;
    if (!enabled || !repository || !container.current) return;
    const load = async () => {
      if (loading || Date.now() - lastAttempt < 60000) return;
      loading = true;
      lastAttempt = Date.now();
      try {
        const logo = await repository.get(symbol);
        const ready = logo ? await prepareStockLogo(logo) : null;
        if (alive)
          setImage({
            symbol,
            url: ready?.url ?? null,
            light: ready?.light ?? false,
            settled: true,
          });
      } catch {
        // A transient bridge error neither blanks a good image nor confirms absence.
      } finally {
        loading = false;
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) void load();
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
      ) : state === "unavailable" ? (
        symbol.slice(0, 1)
      ) : null}
    </span>
  );
}
