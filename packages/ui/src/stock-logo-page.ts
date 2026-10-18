import type { StockDirectoryRepository, StockLogoRepository } from "@aifi/core";
import { prepareStockLogo } from "./stock-logo-image";

// Fast cache hits normally finish together. A stalled IPC or decoder is optional
// decoration, not a reason to keep already-read directory rows behind a spinner.
export const stockLogoPreparationBudget = 80;
/** Prepare local assets within an interaction budget, without awaiting providers. */
export function withPreparedStockLogos(
  directory: StockDirectoryRepository,
  logos: StockLogoRepository | null,
): StockDirectoryRepository {
  return {
    get: (symbol) => directory.get(symbol),
    async search(query) {
      const page = await directory.search(query);
      if (logos?.getCached) {
        const preparation = (async () => {
          try {
            const hits = await logos.getCached!(
              page.items.map((e) => e.symbol),
            );
            await Promise.all(hits.map((hit) => prepareStockLogo(hit.logo)));
          } catch {
            // Decorative failure never hides the directory itself.
          }
        })();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            preparation,
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, stockLogoPreparationBudget);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
        // Late hits still warm the shared image cache for mounted/future rows.
      }
      return page;
    },
  };
}
