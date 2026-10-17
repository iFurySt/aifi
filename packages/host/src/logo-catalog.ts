import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import bundled from "./company-logo-catalog.json" with { type: "json" };
import { validDirectorySymbol } from "../../core/src/stock-directory.ts";
import {
  catalogURL,
  trustedLogoURL,
  fetchPublicAsset,
  readPublicBytes,
} from "./public-assets.ts";

const day = 24 * 60 * 60 * 1000;
const maxBytes = 2 * 1024 * 1024;
export interface LogoSource {
  url: string;
  source: string;
  expectedHash?: string;
  width?: number;
  height?: number;
  /** Existing exact-symbol cache may migrate only if its bytes fit this source. */
  legacySymbol?: string;
  /** Never display artwork explicitly rejected by the issuer review. */
  rejectedHashes?: readonly string[];
}
interface Mapping {
  from: string;
  to: string;
  logos: LogoSource[];
  rejectedHashes?: string[];
}
export interface ParsedCatalog {
  version: string;
  mappings: Map<string, Mapping>;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid catalog object.");
  return value as Record<string, unknown>;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw Error("Invalid catalog list.");
  return value;
}
function date(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw Error("Invalid catalog date.");
  return value;
}
/** Rebuild exact aliases from reviewed securities; never trust the supplied index. */
export function parseLogoCatalog(value: unknown): ParsedCatalog {
  const root = object(value);
  if (
    root.schemaVersion !== 1 ||
    typeof root.catalogVersion !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(root.catalogVersion)
  )
    throw Error("Unsupported logo catalog.");
  date(root.updatedAt);
  const mappings = new Map<string, Mapping>();
  const ids = new Set<string>();
  for (const raw of array(root.companies, 5000)) {
    const company = object(raw);
    if (
      typeof company.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(company.id) ||
      ids.has(company.id)
    )
      throw Error("Invalid catalog issuer.");
    ids.add(company.id);
    date(company.reviewedAt);
    const logos: LogoSource[] = [];
    const rejectedHashes: string[] = [];
    for (const rawLogo of array(company.logos, 16)) {
      const logo = object(rawLogo);
      if (
        logo.status === "rejected" &&
        logo.format === "png" &&
        typeof logo.url === "string" &&
        trustedLogoURL(logo.url) &&
        typeof logo.sha256 === "string" &&
        /^[0-9a-f]{64}$/.test(logo.sha256)
      )
        rejectedHashes.push(logo.sha256);
      // Unreviewed/unsupported images are not catalog-approved results.
      if (
        logo.status !== "verified" ||
        logo.format !== "png" ||
        typeof logo.url !== "string" ||
        !trustedLogoURL(logo.url)
      )
        continue;
      if (
        typeof logo.sha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(logo.sha256) ||
        !Number.isInteger(logo.width) ||
        !Number.isInteger(logo.height) ||
        Number(logo.width) < 4 ||
        Number(logo.height) < 4 ||
        Number(logo.width) > 2048 ||
        Number(logo.height) > 2048
      )
        throw Error("Invalid catalog image metadata.");
      date(logo.checkedAt);
      const match =
        /^https:\/\/financialmodelingprep\.com\/image-stock\/(.+)\.png$/.exec(
          logo.url,
        );
      logos.push({
        url: logo.url,
        expectedHash: logo.sha256,
        width: Number(logo.width),
        height: Number(logo.height),
        source: `company-logo-catalog@${root.catalogVersion}:${company.id}`,
        ...(match ? { legacySymbol: decodeURIComponent(match[1]!) } : {}),
      });
    }
    for (const rawSecurity of array(company.securities, 100)) {
      const security = object(rawSecurity);
      if (security.market !== "US") continue;
      const from =
        security.validFrom === undefined
          ? "0000-00-00"
          : date(security.validFrom);
      const to =
        security.validTo === undefined ? "9999-12-31" : date(security.validTo);
      if (from > to) throw Error("Invalid catalog validity interval.");
      for (const symbol of [
        security.symbol,
        ...array(security.aliases ?? [], 16),
      ]) {
        if (typeof symbol !== "string") throw Error("Invalid catalog symbol.");
        // SEC whitespace conventions unsupported by the directory port are skipped.
        if (!validDirectorySymbol(symbol)) continue;
        const key = symbol.toUpperCase();
        if (mappings.has(key) || mappings.size >= 20000)
          throw Error("Duplicate/excess catalog aliases.");
        mappings.set(key, {
          from,
          to,
          logos: logos.slice(0, 2),
          rejectedHashes,
        });
      }
    }
  }
  return { version: root.catalogVersion, mappings };
}
function compareVersion(a: string, b: string): number {
  const left = a.split(".").map(Number),
    right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i]! > right[i]! ? 1 : -1;
  }
  return 0;
}
export class LogoCatalog {
  private manifest: unknown;
  private parsed: ParsedCatalog;
  private checkedAt = 0;
  private refreshing?: Promise<void>;
  private shutdown = new AbortController();
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private dataDir: string,
    private offline = false,
    private fetcher: typeof fetch = fetchPublicAsset,
    seed: unknown = bundled,
  ) {
    this.manifest = seed;
    this.parsed = parseLogoCatalog(seed);
    try {
      const path = this.path();
      if (statSync(path).size > maxBytes)
        throw Error("Cached catalog too large.");
      const saved = object(JSON.parse(readFileSync(path, "utf8")));
      const parsed = parseLogoCatalog(saved.manifest);
      if (
        typeof saved.checkedAt !== "number" ||
        !Number.isFinite(saved.checkedAt) ||
        saved.checkedAt > Date.now()
      )
        throw Error("Invalid catalog cache time.");
      if (compareVersion(parsed.version, this.parsed.version) < 0)
        throw Error("Cached catalog predates the bundled seed.");
      this.manifest = saved.manifest;
      this.parsed = parsed;
      this.checkedAt = saved.checkedAt;
    } catch {
      /* Ship with a working seed even if GitHub or the local cache fails. */
    }
    if (!offline) {
      this.timer = setInterval(() => void this.refresh(), day);
      this.timer.unref();
    }
  }
  private path() {
    return join(this.dataDir, "stock-logos", "catalog.json");
  }
  sources(
    symbol: string,
    today = new Date().toISOString().slice(0, 10),
  ): LogoSource[] {
    void this.refresh();
    const entry = this.parsed.mappings.get(symbol.toUpperCase());
    return entry && entry.from <= today && today <= entry.to ? entry.logos : [];
  }
  rejectedImageHashes(
    symbol: string,
    today = new Date().toISOString().slice(0, 10),
  ): readonly string[] {
    const entry = this.parsed.mappings.get(symbol.toUpperCase());
    return entry && entry.from <= today && today <= entry.to
      ? (entry.rejectedHashes ?? [])
      : [];
  }
  refresh(): Promise<void> {
    if (this.offline || this.shutdown.signal.aborted) return Promise.resolve();
    if (this.refreshing) return this.refreshing;
    if (Date.now() - this.checkedAt < day) return Promise.resolve();
    this.checkedAt = Date.now();
    this.refreshing = this.update().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }
  private async update() {
    try {
      const response = await this.fetcher(catalogURL, {
        redirect: "error",
        signal: AbortSignal.any([
          AbortSignal.timeout(10000),
          this.shutdown.signal,
        ]),
        headers: {
          "User-Agent": "AIFi (+https://github.com/ifuryst/aifi)",
          Accept: "application/json",
        },
      });
      const bytes = await readPublicBytes(response, maxBytes);
      const manifest: unknown = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
      const parsed = parseLogoCatalog(manifest);
      if (this.shutdown.signal.aborted) return;
      if (compareVersion(parsed.version, this.parsed.version) < 0)
        throw Error("Catalog downgrade rejected.");
      this.manifest = manifest;
      this.parsed = parsed;
    } catch {
      /* Keep the last known-good catalog, with bounded retry across restarts. */
    }
    if (this.shutdown.signal.aborted) return;
    try {
      const dir = join(this.dataDir, "stock-logos");
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const temp = join(dir, `catalog.${randomUUID()}.tmp`);
      writeFileSync(
        temp,
        JSON.stringify({ checkedAt: this.checkedAt, manifest: this.manifest }),
        { mode: 0o600 },
      );
      renameSync(temp, this.path());
    } catch {
      /* Metadata persistence never blocks directory or avatar reads. */
    }
  }
  close() {
    this.shutdown.abort();
    if (this.timer) clearInterval(this.timer);
  }
}
