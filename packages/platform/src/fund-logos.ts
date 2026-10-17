import type { StockLogoRepository } from "@aifi/core";
import { createLocalStockLogos } from "./stock-logos";
import { requestLocalData } from "./data-service";
import type { DirectoryTransport } from "./stock-directory";
export function createLocalFundLogos(
  transport: DirectoryTransport = requestLocalData,
): Pick<StockLogoRepository, "get" | "peek"> {
  const cache = createLocalStockLogos((method, params) =>
    method === "stock.logo"
      ? transport("fund.logo", {
          cik: (params as { symbol: string }).symbol.slice(2),
        })
      : Promise.resolve([]),
  );
  const key = (cik: string) => {
    if (!/^\d{10}$/.test(cik)) throw Error("Invalid manager CIK.");
    return "F." + cik;
  };
  return {
    get: (cik) => cache.get(key(cik)),
    peek: (cik) => cache.peek?.(key(cik)) ?? null,
  };
}
