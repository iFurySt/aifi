import { it, expect, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LogoCatalog, parseLogoCatalog } from "./logo-catalog";
import { catalogURL, trustedLogoURL } from "./public-assets";
import { fixtureCatalog } from "./logo-fixtures";
it("uses exact reviewed security aliases and ignores a forged supplied index", () => {
  const parsed = parseLogoCatalog(fixtureCatalog());
  expect(parsed.mappings.get("AACOW")?.logos[0]?.legacySymbol).toBe("AACO");
  expect(parsed.mappings.get("AACO-W")?.logos[0]?.expectedHash).toMatch(
    /^[a-f0-9]{64}$/,
  );
  expect(parsed.mappings.has("EVIL")).toBe(false);
  expect(parsed.mappings.has("UNKNOWN")).toBe(false);
});
it("does not promote candidate/SVG images or untrusted origins", () => {
  expect(
    parseLogoCatalog(fixtureCatalog("candidate")).mappings.get("AACOW")?.logos,
  ).toEqual([]);
  expect(
    parseLogoCatalog(
      fixtureCatalog("verified", "https://evil.example/logo.png"),
    ).mappings.get("AACOW")?.logos,
  ).toEqual([]);
  const svg = fixtureCatalog();
  svg.companies[0]!.logos[0]!.format = "svg";
  expect(parseLogoCatalog(svg).mappings.get("AACOW")?.logos).toEqual([]);
  for (const url of [
    "http://financialmodelingprep.com/image-stock/A.png",
    "https://user:pass@financialmodelingprep.com/image-stock/A.png",
    "https://financialmodelingprep.com/private.png",
    "https://financialmodelingprep.com/image-stock/A/B.png",
    "https://financialmodelingprep.com/image-stock/A%2F..%2FB.png",
    "https://tacticalresources.com/wp-content/uploads/2021/04/a.png?token=secret",
    "https://tacticalresources.com:443/wp-content/uploads/2021/04/a.svg",
  ])
    expect(trustedLogoURL(url)).toBe(false);
});
it("rejects schema changes, broken dates/hash metadata and colliding aliases", () => {
  const schema = fixtureCatalog();
  schema.schemaVersion = 2;
  expect(() => parseLogoCatalog(schema)).toThrow();
  const date = fixtureCatalog();
  date.updatedAt = "2026-02-30";
  expect(() => parseLogoCatalog(date)).toThrow();
  const hash = fixtureCatalog();
  hash.companies[0]!.logos[0]!.sha256 = "bad";
  expect(() => parseLogoCatalog(hash)).toThrow();
  const duplicate = fixtureCatalog();
  duplicate.companies[0]!.securities[1]!.aliases = ["AACO"];
  expect(() => parseLogoCatalog(duplicate)).toThrow();
});
it("respects validity and works offline from its seed without network requests", () => {
  const seed = fixtureCatalog();
  Object.assign(seed.companies[0]!.securities[1]!, {
    validFrom: "2026-10-01",
    validTo: "2026-10-14",
  });
  const fetcher = vi.fn<typeof fetch>();
  const store = new LogoCatalog("unused", true, fetcher, seed);
  expect(store.sources("AACOW", "2026-10-14")).toHaveLength(1);
  expect(store.sources("AACOW", "2026-10-15")).toEqual([]);
  expect(store.sources("AACOW", "2026-09-30")).toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
  store.close();
});
it("refreshes once, persists validated metadata and retains it across offline restarts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-catalog-"));
  const next = fixtureCatalog();
  next.catalogVersion = "0.2.0";
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(next)));
  const store = new LogoCatalog(dir, false, fetcher, fixtureCatalog());
  try {
    expect(store.sources("AACOW")[0]?.source).toContain("0.1.0");
    await Promise.all([store.refresh(), store.refresh()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(catalogURL);
    expect(store.sources("AACOW")[0]?.source).toContain("0.2.0");
    const offline = new LogoCatalog(dir, true, fetcher, fixtureCatalog());
    expect(offline.sources("AACOW")[0]?.source).toContain("0.2.0");
    offline.close();
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("bad or excessive remote data keeps the seed and backs off across restarts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-catalog-"));
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(new Uint8Array(2 * 1024 * 1024 + 1)));
  const store = new LogoCatalog(dir, false, fetcher, fixtureCatalog());
  try {
    await store.refresh();
    expect(store.sources("AACOW")).toHaveLength(1);
    const saved = JSON.parse(
      readFileSync(join(dir, "stock-logos", "catalog.json"), "utf8"),
    );
    expect(saved.manifest.catalogVersion).toBe("0.1.0");
    const again = new LogoCatalog(dir, false, fetcher, fixtureCatalog());
    await again.refresh();
    expect(fetcher).toHaveBeenCalledTimes(1);
    again.close();
    // Broken cache cannot replace the shipped source.
    writeFileSync(join(dir, "stock-logos", "catalog.json"), "bad JSON");
    const offline = new LogoCatalog(dir, true, fetcher, fixtureCatalog());
    expect(offline.sources("AACOW")).toHaveLength(1);
    offline.close();
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("cancels catalog work on shutdown without creating a cache", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-catalog-"));
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(Error("aborted")),
          { once: true },
        );
      }),
  );
  const store = new LogoCatalog(dir, false, fetcher, fixtureCatalog());
  try {
    const work = store.refresh();
    store.close();
    await work;
    expect(() =>
      readFileSync(join(dir, "stock-logos", "catalog.json")),
    ).toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("a valid stale local catalog remains available when refresh fails", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-catalog-"));
  mkdirSync(join(dir, "stock-logos"));
  const previous = fixtureCatalog();
  previous.catalogVersion = "0.2.0";
  writeFileSync(
    join(dir, "stock-logos", "catalog.json"),
    JSON.stringify({ checkedAt: 0, manifest: previous }),
  );
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(Error("network"));
  const store = new LogoCatalog(dir, false, fetcher, fixtureCatalog());
  try {
    await store.refresh();
    expect(store.sources("AACOW")[0]?.source).toContain("0.2.0");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
