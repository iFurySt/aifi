import { useEffect, useState } from "react";

/** Align visible minute/session boundaries and recover immediately after sleep. */
export function useExchangeTime() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      clearTimeout(timer);
      timer = setTimeout(tick, 60000 - (current % 60000) + 10);
    };
    tick();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}
