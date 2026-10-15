import type { StockDirectoryRepository, StockLogoRepository } from "@aifi/core";
import { prepareStockLogo } from "./stock-logo-image";

/** Prepare local assets before publishing rows, without waiting for providers. */
export function withPreparedStockLogos(
  directory: StockDirectoryRepository,
  logos: StockLogoRepository | null,
): StockDirectoryRepository {
  return {
    get: (symbol) => directory.get(symbol),
    async search(query) {
      const page = await directory.search(query);
      if (logos?.getCached) {
        try {
          const hits = await logos.getCached(page.items.map((e) => e.symbol));
          await Promise.all(hits.map((hit) => prepareStockLogo(hit.logo)));
        } catch {
          // Decorative cache failure must never hide the directory itself.
        }
      }
      return page;
    },
  };
}
