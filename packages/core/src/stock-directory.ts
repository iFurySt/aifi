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
export interface DirectoryQuery {
  query: string;
  limit: number;
  offset: number;
}
export interface DirectoryPage {
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
/** UI domain port. Local IPC/HTTP and future authenticated cloud adapters fit here. */
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
    Object.keys(v).some((k) => !["query", "limit", "offset"].includes(k)) ||
    typeof v.query !== "string" ||
    new TextEncoder().encode(v.query).length > 255 ||
    !Number.isInteger(v.limit) ||
    v.limit < 1 ||
    v.limit > 200 ||
    !Number.isInteger(v.offset) ||
    v.offset < 0 ||
    v.offset > 100000
  )
    throw Error("Invalid directory query.");
}
