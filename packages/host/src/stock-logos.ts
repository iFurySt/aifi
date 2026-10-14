import { Agent, get as httpsGet } from "node:https";
import { Readable } from "node:stream";
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
// A scoped native HTTPS agent respects configured proxy env without changing
// global fetch/HMR/session routing. Requests deliberately never follow redirects.
const logoAgent = new Agent({
  proxyEnv: process.env,
  keepAlive: true,
  maxSockets: 4,
});
const publicLogoFetch: typeof fetch = (input, options) =>
  new Promise((resolve, reject) => {
    const url = new URL(String(input));
    if (
      url.protocol !== "https:" ||
      url.hostname !== "financialmodelingprep.com" ||
      !url.pathname.startsWith("/image-stock/") ||
      url.port ||
      url.username ||
      url.password
    ) {
      reject(Error("Invalid logo source."));
      return;
    }
    const headers = Object.fromEntries(new Headers(options?.headers).entries());
    const request = httpsGet(
      url,
      { agent: logoAgent, headers, signal: options?.signal ?? undefined },
      (response) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers))
          if (value !== undefined)
            headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        resolve(
          new Response(Readable.toWeb(response) as ReadableStream<Uint8Array>, {
            status: response.statusCode || 502,
            headers,
          }),
        );
      },
    );
    request.on("error", reject);
  });
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
/** Public presentation assets only: fixed origin/path, private per-device PNG cache. */
export class StockLogoCache {
  private pending = new Map<string, Promise<StockLogo | null>>();
  private active = 0;
  private shutdown = new AbortController();
  close() {
    this.shutdown.abort();
  }
  private waiters: (() => void)[] = [];
  constructor(
    private dataDir: string,
    private offline = false,
    private fetchAsset: typeof fetch = publicLogoFetch,
  ) {}
  get(symbol: string): Promise<StockLogo | null> {
    if (!validDirectorySymbol(symbol))
      return Promise.reject(Error("Invalid stock symbol."));
    const pending = this.pending.get(symbol);
    if (pending) return pending;
    if (this.pending.size >= 16) return Promise.resolve(null);
    const request = this.read(symbol).finally(() =>
      this.pending.delete(symbol),
    );
    this.pending.set(symbol, request);
    return request;
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
  private async read(symbol: string): Promise<StockLogo | null> {
    const dir = join(this.dataDir, "stock-logos");
    const name = createHash("sha256").update(symbol).digest("hex");
    const path = join(dir, name + ".png"),
      missing = join(dir, name + ".missing");
    let cached: StockLogo | null = null;
    try {
      const bytes = readFileSync(path),
        stat = statSync(path);
      if (validLogoPNG(bytes)) {
        cached = {
          dataUrl: "data:image/png;base64," + bytes.toString("base64"),
          source: "fmp-public-image",
          fetchedAt: stat.mtime.toISOString(),
        };
        if (Date.now() - stat.mtimeMs < week) return cached;
      }
    } catch {
      /* A missing/corrupt cached file is a cache miss, never a UI error. */
    }
    if (this.offline || this.shutdown.signal.aborted) return cached;
    try {
      if (Date.now() - statSync(missing).mtimeMs < 10 * 60 * 1000)
        return cached;
    } catch {
      /* No failed lookup cached. */
    }
    const release = await this.slot();
    try {
      const response = await this.fetchAsset(
        `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
        {
          redirect: "error",
          signal: AbortSignal.any([
            AbortSignal.timeout(15000),
            this.shutdown.signal,
          ]),
          headers: {
            "User-Agent": "AIFi (+https://github.com/ifuryst/aifi)",
            Accept: "image/png",
          },
        },
      );
      if (
        !response.ok ||
        response.headers.get("content-type")?.split(";")[0] !== "image/png" ||
        Number(response.headers.get("content-length") || 0) > maxBytes ||
        !response.body
      ) {
        await response.body?.cancel();
        throw Error("Logo unavailable.");
      }
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.length;
          if (size > maxBytes) throw Error("Logo too large.");
          chunks.push(Buffer.from(next.value));
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      const bytes = Buffer.concat(chunks);
      if (!validLogoPNG(bytes)) throw Error("Invalid logo.");
      const result: StockLogo = {
        dataUrl: "data:image/png;base64," + bytes.toString("base64"),
        source: "fmp-public-image",
        fetchedAt: new Date().toISOString(),
      };
      try {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        const temp = join(dir, name + "." + randomUUID() + ".tmp");
        writeFileSync(temp, bytes, { mode: 0o600 });
        renameSync(temp, path);
        try {
          unlinkSync(missing);
        } catch {
          /* No negative cache entry. */
        }
      } catch {
        /* A disk failure must not prevent displaying the fetched image. */
      }
      return result;
    } catch {
      if (this.shutdown.signal.aborted) return cached;
      try {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        writeFileSync(missing, "", { mode: 0o600 });
      } catch {
        /* Cache writes are best effort. */
      }
      return cached;
    } finally {
      release();
    }
  }
}
