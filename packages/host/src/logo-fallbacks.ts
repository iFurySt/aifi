import fallbackSeed from "./company-logo-fallbacks.json" with { type: "json" };
import { LogoCatalog, type ParsedCatalog } from "./logo-catalog.ts";
import { validDirectorySymbol } from "../../core/src/stock-directory.ts";
import {
  fallbackCatalogURL,
  trustedLogoURL,
  fetchPublicAsset,
} from "./public-assets.ts";

/** Availability observations are best-effort artwork, never verified issuer aliases. */
export function parseLogoFallbacks(value: unknown): ParsedCatalog {
  const root = value as typeof fallbackSeed;
  if (
    !root ||
    root.schemaVersion !== 1 ||
    root.profile !== "app-image-fallbacks" ||
    !/^\d+\.\d+\.\d+$/.test(root.catalogVersion) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(root.updatedAt) ||
    new Date(root.updatedAt).toISOString().slice(0, 10) !== root.updatedAt ||
    !Array.isArray(root.items) ||
    root.items.length > 10000
  )
    throw Error("Invalid image availability catalog.");
  const mappings: ParsedCatalog["mappings"] = new Map();
  for (const row of root.items) {
    if (
      !row ||
      !validDirectorySymbol(row.symbol) ||
      row.symbol !== row.symbol.toUpperCase() ||
      mappings.has(row.symbol) ||
      !["directory-name-candidate", "repository-unverified"].includes(
        row.basis,
      ) ||
      typeof row.url !== "string" ||
      !trustedLogoURL(row.url) ||
      !/^[a-f0-9]{64}$/.test(row.sha256) ||
      !Number.isInteger(row.width) ||
      !Number.isInteger(row.height) ||
      row.width < 4 ||
      row.width > 2048 ||
      row.height < 4 ||
      row.height > 2048
    )
      throw Error("Invalid image availability source.");
    mappings.set(row.symbol, {
      from: "0000-00-00",
      to: "9999-12-31",
      logos: [
        {
          url: row.url,
          expectedHash: row.sha256,
          width: row.width,
          height: row.height,
          source: `company-logo-catalog@${root.catalogVersion}:availability:${row.basis}`,
          ...(row.url.startsWith(
            "https://financialmodelingprep.com/image-stock/",
          )
            ? {
                legacySymbol: decodeURIComponent(
                  new URL(row.url).pathname.slice(13, -4),
                ),
              }
            : {}),
        },
      ],
    });
  }
  return { version: root.catalogVersion, mappings };
}
export class StockLogoSources {
  private reviewed: LogoCatalog;
  private fallback: LogoCatalog;
  constructor(
    dataDir: string,
    offline = false,
    fetcher: typeof fetch = fetchPublicAsset,
  ) {
    this.reviewed = new LogoCatalog(dataDir, offline, fetcher);
    this.fallback = new LogoCatalog(dataDir, offline, fetcher, fallbackSeed, {
      parse: parseLogoFallbacks,
      url: fallbackCatalogURL,
      fileName: "fallbacks.json",
    });
  }
  sources(symbol: string) {
    return [...this.reviewed.sources(symbol), ...this.fallback.sources(symbol)];
  }
  rejectedImageHashes(symbol: string) {
    return this.reviewed.rejectedImageHashes(symbol);
  }
  close() {
    this.reviewed.close();
    this.fallback.close();
  }
}
