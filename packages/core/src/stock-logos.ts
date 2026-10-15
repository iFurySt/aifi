/** Decorative current brand asset; never evidence of company identity or pricing. */
export interface StockLogo {
  dataUrl: string;
  source: string;
  fetchedAt: string;
}
export interface StockLogoRepository {
  get(symbol: string): Promise<StockLogo | null>;
  /** Local-only batch: never wait for remote image retrieval. Misses are omitted. */
  getCached?(symbols: string[]): Promise<{ symbol: string; logo: StockLogo }[]>;
  /** Optional synchronous session hit; durable persistence remains host-owned. */
  peek?(symbol: string): StockLogo | null;
}
