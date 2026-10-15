/** Source identifiers are opaque, independently of watchlist ticker syntax. */
export function validDirectorySymbol(value: string): boolean {
  return /^[A-Z][A-Z0-9.$^/+=-]{0,13}$/i.test(value);
}
export interface DirectoryEntry {
  id: string;
  symbol: string;
  name: string;
  exchangeCode: string;
  source: string;
  securityType: string;
}
export const stockCollections = [
  { id: "all-us", label: "All US listings", heading: "Stocks" },
  { id: "sp500", label: "S&P 500", heading: "S&P 500" },
  { id: "nasdaq100", label: "Nasdaq-100", heading: "Nasdaq-100" },
  { id: "watchlist", label: "My watchlist", heading: "My watchlist" },
] as const;
export type StockCollection = (typeof stockCollections)[number]["id"];
export function validStockCollection(value: unknown): value is StockCollection {
  return stockCollections.some((collection) => collection.id === value);
}
export interface CollectionInfo {
  id: StockCollection;
  snapshotId?: string;
  snapshotDate?: string;
  fetchedAt?: string;
  source?: string;
  sourceName?: string;
  memberCount: number;
  availableCount: number;
  unresolvedSymbols: string[];
}
export interface DirectoryQuery {
  collection?: StockCollection;
  /** Personal symbols only; built-in lists never accept caller membership. */
  symbols?: string[];
  query: string;
  limit: number;
  offset: number;
}
export interface DirectoryPage {
  collection?: CollectionInfo;
  snapshotId: string;
  scope: "candidates";
  total: number;
  offset: number;
  items: DirectoryEntry[];
}
export interface DirectoryLookup {
  snapshotId: string;
  item: DirectoryEntry | null;
}
/** UI port for stored local snapshots; provider/cloud collection stays behind persistence. */
export interface StockDirectoryRepository {
  search(query: DirectoryQuery): Promise<DirectoryPage>;
  get(symbol: string): Promise<DirectoryLookup>;
}
export function validateDirectoryQuery(
  value: unknown,
): asserts value is DirectoryQuery {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid directory query.");
  const v = value as DirectoryQuery;
  if (
    Object.keys(v).some(
      (k) => !["query", "limit", "offset", "collection", "symbols"].includes(k),
    ) ||
    typeof v.query !== "string" ||
    new TextEncoder().encode(v.query).length > 255 ||
    !Number.isInteger(v.limit) ||
    v.limit < 1 ||
    v.limit > 200 ||
    !Number.isInteger(v.offset) ||
    v.offset < 0 ||
    v.offset > 100000 ||
    (v.collection !== undefined && !validStockCollection(v.collection)) ||
    (v.collection !== "watchlist" && v.symbols !== undefined) ||
    (v.symbols !== undefined &&
      (!Array.isArray(v.symbols) ||
        v.symbols.length > 50 ||
        v.symbols.some(
          (s) =>
            typeof s !== "string" ||
            !validDirectorySymbol(s) ||
            s !== s.toUpperCase(),
        )))
  )
    throw Error("Invalid directory query.");
}
