import seed from "./company-fund-logo-catalog.json" with { type: "json" };
import {
  LogoCatalog,
  type ParsedCatalog,
  type LogoSource,
} from "./logo-catalog.ts";
import { StockLogoCache } from "./stock-logos.ts";
import {
  fundCatalogURL,
  trustedLogoURL,
  fetchPublicAsset,
} from "./public-assets.ts";
export function parseFundCatalog(value: unknown): ParsedCatalog {
  const root = value as typeof seed;
  if (
    !root ||
    root.schemaVersion !== 1 ||
    root.profile !== "fund-manager-logos" ||
    !/^\d+\.\d+\.\d+$/.test(root.catalogVersion) ||
    !Array.isArray(root.funds) ||
    root.funds.length > 2000
  )
    throw Error("Invalid fund catalog.");
  const mappings: ParsedCatalog["mappings"] = new Map();
  const ids = new Set<string>();
  for (const fund of root.funds) {
    if (
      !/^\d{10}$/.test(fund.cik) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fund.id) ||
      ids.has(fund.id) ||
      mappings.has("F." + fund.cik) ||
      !Array.isArray(fund.logos) ||
      fund.logos.length > 4
    )
      throw Error("Invalid manager identity.");
    ids.add(fund.id);
    const logos: LogoSource[] = [];
    for (const logo of fund.logos) {
      if (
        logo.status !== "verified" ||
        logo.format !== "png" ||
        !trustedLogoURL(logo.url)
      )
        continue;
      if (
        !/^[0-9a-f]{64}$/.test(logo.sha256) ||
        ![logo.width, logo.height].every(
          (n) => Number.isInteger(n) && n >= 4 && n <= 4096,
        ) ||
        logo.width * logo.height > 2048 ** 2
      )
        throw Error("Invalid fund image.");
      logos.push({
        url: logo.url,
        expectedHash: logo.sha256,
        width: logo.width,
        height: logo.height,
        source: `fund-logo-catalog@${root.catalogVersion}:${fund.id}`,
      });
    }
    const mapping = {
      rejectedHashes: [] as string[],
      from: "0000-00-00",
      to: "9999-12-31",
      logos: logos.slice(0, 2),
    };
    mappings.set("F." + fund.cik, mapping);
  }
  return { version: root.catalogVersion, mappings };
}
export class FundLogoCache {
  private cache: StockLogoCache;
  constructor(
    dataDir: string,
    offline = false,
    fetcher: typeof fetch = fetchPublicAsset,
    bundled: unknown = seed,
  ) {
    const catalog = new LogoCatalog(dataDir, offline, fetcher, bundled, {
      parse: parseFundCatalog,
      url: fundCatalogURL,
      fileName: "funds-catalog.json",
    });
    this.cache = new StockLogoCache(dataDir, offline, fetcher, catalog, {
      fallback: false,
      maxDimension: 4096,
    });
  }
  get(cik: string) {
    if (!/^\d{10}$/.test(cik)) throw Error("Invalid manager CIK.");
    return this.cache.get("F." + cik);
  }
  peek(cik: string) {
    if (!/^\d{10}$/.test(cik)) throw Error("Invalid manager CIK.");
    return this.cache.peek("F." + cik);
  }
  close() {
    this.cache.close();
  }
}
