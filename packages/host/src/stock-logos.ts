import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { validDirectorySymbol } from "../../core/src/stock-directory.ts";
import type { StockLogo } from "../../core/src/stock-logos.ts";
import { LogoCatalog, type LogoSource } from "./logo-catalog.ts";
import { fetchPublicAsset, readPublicBytes } from "./public-assets.ts";

const maxBytes = 256 * 1024;
const week = 7 * 24 * 60 * 60 * 1000;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function validLogoPNG(bytes: Buffer) {
  if (
    bytes.length < 24 ||
    bytes.length > maxBytes ||
    !bytes.subarray(0, 8).equals(pngSignature) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    return false;
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  return width > 0 && height > 0 && width <= 2048 && height <= 2048;
}
export interface LogoCatalogReader {
  sources(symbol: string): LogoSource[];
  close(): void;
}
interface CachedLogo {
  logo: StockLogo;
  fresh: boolean;
}
/** Catalog first, exact-symbol fallback; renderer receives private PNG data only. */
export class StockLogoCache {
  private pending = new Map<string, Promise<StockLogo | null>>();
  private assets = new Map<string, Promise<StockLogo | null>>();
  private active = 0;
  private shutdown = new AbortController();
  private waiters: (() => void)[] = [];
  constructor(
    private dataDir: string,
    private offline = false,
    private fetchAsset: typeof fetch = fetchPublicAsset,
    private catalog: LogoCatalogReader = new LogoCatalog(
      dataDir,
      offline,
      fetchAsset,
    ),
  ) {}
  close() {
    this.shutdown.abort();
    this.catalog.close();
  }
  get(symbol: string): Promise<StockLogo | null> {
    if (!validDirectorySymbol(symbol))
      return Promise.reject(Error("Invalid stock symbol."));
    const sources = this.sources(symbol);
    // Never put a usable disk image behind a network refresh or its queue.
    for (let i = 0; i < sources.length; i++) {
      const cached = this.cached(sources[i]!);
      if (!cached) continue;
      if (
        (!cached.fresh || i > 0) &&
        !this.offline &&
        !this.shutdown.signal.aborted
      )
        void this.load(symbol, sources).catch(() => {});
      return Promise.resolve(cached.logo);
    }
    return this.load(symbol, sources);
  }
  /** Disk-only fast lane, independent of provider queue and cache freshness. */
  peek(symbol: string): StockLogo | null {
    if (!validDirectorySymbol(symbol)) throw Error("Invalid stock symbol.");
    for (const source of this.sources(symbol)) {
      const hit = this.cached(source);
      if (hit) return hit.logo;
    }
    return null;
  }
  private sources(symbol: string): LogoSource[] {
    return [
      ...this.catalog.sources(symbol),
      {
        url: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
        source: "fmp-public-image",
        legacySymbol: symbol,
      },
    ];
  }
  private load(symbol: string, sources: LogoSource[]) {
    const pending = this.pending.get(symbol);
    if (pending) return pending;
    if (this.pending.size >= 16) return Promise.resolve(null);
    const request = this.read(sources).finally(() =>
      this.pending.delete(symbol),
    );
    this.pending.set(symbol, request);
    return request;
  }
  private key(source: LogoSource) {
    return createHash("sha256")
      .update(source.url + "\n" + (source.expectedHash ?? "unreviewed"))
      .digest("hex");
  }
  private paths(source: LogoSource) {
    const base = join(this.dataDir, "stock-logos", "v2", this.key(source));
    return { png: base + ".png", missing: base + ".missing" };
  }
  private valid(bytes: Buffer, source: LogoSource) {
    return (
      validLogoPNG(bytes) &&
      (!source.expectedHash ||
        (createHash("sha256").update(bytes).digest("hex") ===
          source.expectedHash &&
          bytes.readUInt32BE(16) === source.width &&
          bytes.readUInt32BE(20) === source.height))
    );
  }
  private cached(source: LogoSource): CachedLogo | null {
    const paths = [this.paths(source).png];
    if (source.legacySymbol)
      paths.push(
        join(
          this.dataDir,
          "stock-logos",
          createHash("sha256").update(source.legacySymbol).digest("hex") +
            ".png",
        ),
      );
    for (const path of paths) {
      try {
        const stat = statSync(path);
        if (stat.size > maxBytes) continue;
        const bytes = readFileSync(path);
        if (!this.valid(bytes, source)) continue;
        return {
          logo: {
            dataUrl: "data:image/png;base64," + bytes.toString("base64"),
            source: source.source,
            fetchedAt: stat.mtime.toISOString(),
          },
          fresh: Date.now() - stat.mtimeMs < week,
        };
      } catch {
        /* Missing/corrupt files are cache misses, never a UI error. */
      }
    }
    return null;
  }
  private negative(source: LogoSource) {
    const paths = [this.paths(source).missing];
    // Old failures belong only to the old exact-symbol provider, not a catalog alias.
    if (!source.expectedHash && source.legacySymbol)
      paths.push(
        join(
          this.dataDir,
          "stock-logos",
          createHash("sha256").update(source.legacySymbol).digest("hex") +
            ".missing",
        ),
      );
    return paths.some((path) => {
      try {
        return Date.now() - statSync(path).mtimeMs < 10 * 60 * 1000;
      } catch {
        return false;
      }
    });
  }
  private async slot() {
    if (this.active >= 4)
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    else this.active++;
    return () => {
      const next = this.waiters.shift();
      if (next) next();
      else this.active--;
    };
  }
  private async read(sources: LogoSource[]): Promise<StockLogo | null> {
    let release: (() => void) | undefined, budget: AbortSignal | undefined;
    try {
      for (const source of sources) {
        const cached = this.cached(source);
        if (cached?.fresh) return cached.logo;
        if (
          this.offline ||
          this.shutdown.signal.aborted ||
          this.negative(source) ||
          budget?.aborted
        ) {
          if (cached) return cached.logo;
          continue;
        }
        if (!release) {
          release = await this.slot();
          budget = AbortSignal.any([
            AbortSignal.timeout(15000),
            this.shutdown.signal,
          ]);
        }
        if (this.shutdown.signal.aborted) return cached?.logo ?? null;
        const key = this.key(source);
        let work = this.assets.get(key);
        if (!work) {
          work = this.retrieve(source, budget!, cached?.logo ?? null).finally(
            () => this.assets.delete(key),
          );
          this.assets.set(key, work);
        }
        const logo = await work;
        if (logo) return logo;
      }
      return null;
    } finally {
      release?.();
    }
  }
  private async retrieve(
    source: LogoSource,
    signal: AbortSignal,
    cached: StockLogo | null,
  ) {
    const paths = this.paths(source);
    try {
      const response = await this.fetchAsset(source.url, {
        redirect: "error",
        signal,
        headers: {
          "User-Agent": "AIFi (+https://github.com/ifuryst/aifi)",
          Accept: "image/png",
        },
      });
      const bytes = await readPublicBytes(response, maxBytes, "image/png");
      if (!this.valid(bytes, source))
        throw Error("Invalid/changed company image.");
      const result: StockLogo = {
        dataUrl: "data:image/png;base64," + bytes.toString("base64"),
        source: source.source,
        fetchedAt: new Date().toISOString(),
      };
      try {
        const dir = join(this.dataDir, "stock-logos", "v2");
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        const temp = join(dir, `${this.key(source)}.${randomUUID()}.tmp`);
        writeFileSync(temp, bytes, { mode: 0o600 });
        renameSync(temp, paths.png);
        try {
          unlinkSync(paths.missing);
        } catch {
          /* No failed lookup cached. */
        }
      } catch {
        /* Disk failure must not prevent a fetched image from rendering. */
      }
      return result;
    } catch {
      if (this.shutdown.signal.aborted) return cached;
      try {
        mkdirSync(join(this.dataDir, "stock-logos", "v2"), {
          recursive: true,
          mode: 0o700,
        });
        writeFileSync(paths.missing, "", { mode: 0o600 });
      } catch {
        /* Cache writes are best effort. */
      }
      return cached;
    }
  }
}
