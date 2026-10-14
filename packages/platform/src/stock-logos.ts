import { validDirectorySymbol } from "@aifi/core";
import type { StockLogoRepository, StockLogo } from "@aifi/core";
import { requestLocalData } from "./data-service";
import type { DirectoryTransport } from "./stock-directory";
export function createLocalStockLogos(
  transport: DirectoryTransport = requestLocalData,
): StockLogoRepository {
  return {
    async get(symbol) {
      if (!validDirectorySymbol(symbol)) throw Error("Invalid stock symbol.");
      return (await transport("stock.logo", { symbol })) as StockLogo | null;
    },
  };
}
