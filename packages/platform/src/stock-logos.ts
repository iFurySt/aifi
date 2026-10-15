import { validDirectorySymbol } from "@aifi/core";
import type { StockLogoRepository, StockLogo } from "@aifi/core";
import { requestLocalData } from "./data-service";
import type { DirectoryTransport } from "./stock-directory";
export function createLocalStockLogos(
  transport: DirectoryTransport = requestLocalData,
): StockLogoRepository {
  const memory = new Map<string, { logo: StockLogo | null; expires: number }>();
  const pending = new Map<string, Promise<StockLogo | null>>();
  let bytes = 0;
  const remember = (symbol: string, logo: StockLogo | null) => {
    bytes -= memory.get(symbol)?.logo?.dataUrl.length ?? 0;
    memory.delete(symbol);
    memory.set(symbol, {
      logo,
      expires: Date.now() + (logo ? 5 * 60000 : 30000),
    });
    bytes += logo?.dataUrl.length ?? 0;
    // Bounded per-repository session LRU; PNG persistence is not duplicated in
    // localStorage/IndexedDB and custom/cloud repositories can use the same port.
    while (memory.size > 128 || bytes > 8 * 1024 * 1024) {
      const key = memory.keys().next().value!;
      bytes -= memory.get(key)?.logo?.dataUrl.length ?? 0;
      memory.delete(key);
    }
  };
  return {
    peek(symbol) {
      return memory.get(symbol.toUpperCase())?.logo ?? null;
    },
    async get(symbol) {
      if (!validDirectorySymbol(symbol)) throw Error("Invalid stock symbol.");
      symbol = symbol.toUpperCase();
      const cached = memory.get(symbol);
      if (cached && Date.now() < cached.expires) {
        memory.delete(symbol);
        memory.set(symbol, cached);
        return cached.logo;
      }
      const inflight = pending.get(symbol);
      if (inflight) return inflight;
      const request = transport("stock.logo", { symbol })
        .then((value) => {
          const logo = value as StockLogo | null;
          remember(symbol, logo);
          return logo;
        })
        .catch((error: unknown) => {
          if (cached?.logo) return cached.logo;
          throw error;
        })
        .finally(() => pending.delete(symbol));
      pending.set(symbol, request);
      return request;
    },
  };
}
