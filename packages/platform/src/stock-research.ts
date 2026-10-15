import { validDirectorySymbol } from "@aifi/core";
import type {
  StockResearchRepository,
  StockResearch,
  DataMethod,
} from "@aifi/core";
import { requestLocalData } from "./data-service";
export function createLocalStockResearch(
  transport: (
    method: DataMethod,
    params?: unknown,
  ) => Promise<unknown> = requestLocalData,
): StockResearchRepository {
  return {
    async get(symbol) {
      if (!validDirectorySymbol(symbol)) throw Error("Invalid stock symbol.");
      return (await transport("research.read", {
        symbol: symbol.toUpperCase(),
      })) as StockResearch;
    },
  };
}
