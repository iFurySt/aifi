import { useContext, useEffect, useRef, useState } from "react";
import { StockLogoContext } from "../stock-directory-context";
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
  const [image, setImage] = useState<{
    symbol: string;
    url: string | null;
    light: boolean;
  }>({
    symbol,
    url: null,
    light: false,
  });
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
        if (alive) {
          const url = logo?.dataUrl.startsWith("data:image/png;base64,")
            ? logo.dataUrl
            : null;
          setImage((current) => ({
            symbol,
            url,
            light:
              current.symbol === symbol && current.url === url
                ? current.light
                : false,
          }));
        }
      } catch {
        if (alive) setImage({ symbol, url: null, light: false });
      } finally {
        loading = false;
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible) void load();
      },
      { rootMargin: "100px" },
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
  const url = enabled && image.symbol === symbol ? image.url : null;
  return (
    <span
      className={`${className} stock-avatar`}
      ref={container}
      aria-hidden="true"
      data-light-logo={!!url && image.light}
    >
      {url ? (
        <img
          src={url}
          alt=""
          decoding="async"
          onLoad={(event) => {
            // Some providers serve a white mark on transparent pixels. Give it
            // contrast rather than showing a seemingly empty company avatar.
            try {
              if (
                event.currentTarget.naturalWidth < 4 ||
                event.currentTarget.naturalHeight < 4
              ) {
                setImage({ symbol, url: null, light: false });
                return;
              }
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 24;
              const context = canvas.getContext("2d");
              if (!context) return;
              context.drawImage(event.currentTarget, 0, 0, 24, 24);
              const pixels = context.getImageData(0, 0, 24, 24).data;
              let visible = 0,
                white = 0;
              for (let i = 0; i < pixels.length; i += 4)
                if (pixels[i + 3]! > 32) {
                  visible++;
                  if (
                    Math.min(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) > 224
                  )
                    white++;
                }
              if (!visible || (visible > 550 && white === visible))
                setImage({ symbol, url: null, light: false });
              else if (white / visible > 0.95)
                setImage((current) =>
                  current.symbol === symbol && current.url === url
                    ? { ...current, light: true }
                    : current,
                );
            } catch {
              /* A decoded logo remains usable if contrast sampling fails. */
            }
          }}
          onError={() => setImage({ symbol, url: null, light: false })}
        />
      ) : (
        symbol.slice(0, 1)
      )}
    </span>
  );
}
