import React from "react";
import { createRoot } from "react-dom/client";
import { StockLogoContext } from "../../packages/ui/src/stock-directory-context";
import { StockAvatar } from "../../packages/ui/src/components/StockAvatar";
import { createLocalStockLogos } from "../../packages/platform/src/stock-logos";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGMQSdnyHx9mGBkKAC4RisFexU89AAAAAElFTkSuQmCC";
const state = { active: 0, peak: 0, attempts: {} as Record<string, number> };
Object.assign(window, { logoDelivery: state });
const repo = createLocalStockLogos(async (_method, params) => {
  const symbol = (params as { symbol: string }).symbol;
  state.attempts[symbol] = (state.attempts[symbol] ?? 0) + 1;
  if (symbol === "F0" && state.attempts[symbol] === 1)
    throw Error("Logo queue busy. Try again.");
  state.peak = Math.max(state.peak, ++state.active);
  await new Promise((resolve) => setTimeout(resolve, 10));
  state.active--;
  return {
    dataUrl: png,
    source: "offline-fixture",
    fetchedAt: "2026-10-18T00:00:00Z",
  };
});
createRoot(document.getElementById("root")!).render(
  <StockLogoContext.Provider value={repo}>
    <div className="stock-list" style={{ height: 320, overflow: "auto" }}>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} style={{ height: 36 }}>
          <StockAvatar symbol={`F${i}`} /> F{i}
        </div>
      ))}
    </div>
  </StockLogoContext.Provider>,
);
