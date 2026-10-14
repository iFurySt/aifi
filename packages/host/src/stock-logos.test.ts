import { it, expect, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  readdirSync,
  statSync,
  utimesSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StockLogoCache, validLogoPNG } from "./stock-logos";
const noCatalog = { sources: () => [], close: () => {} };
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
  "base64",
);
const response = () =>
  new Response(png, { headers: { "Content-Type": "image/png" } });
it("coalesces reads and persists only a bounded private PNG, including offline reuse", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response());
    const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
    const [a, b] = await Promise.all([cache.get("AAPL"), cache.get("AAPL")]);
    expect(a?.dataUrl).toBe("data:image/png;base64," + png.toString("base64"));
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://financialmodelingprep.com/image-stock/AAPL.png",
    );
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe("error");
    const file = join(
      dir,
      "stock-logos",
      "v2",
      readdirSync(join(dir, "stock-logos", "v2"))[0]!,
    );
    expect(readFileSync(file)).toEqual(png);
    if (process.platform !== "win32")
      expect(statSync(file).mode & 0o777).toBe(0o600);
    const offline = new StockLogoCache(dir, true, fetcher, noCatalog);
    expect((await offline.get("AAPL"))?.dataUrl).toBe(a?.dataUrl);
    expect(await offline.get("UNKNOWN")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    // Old good data survives an unavailable provider.
    const old = new Date(Date.now() - 8 * 86400000);
    utimesSync(file, old, old);
    fetcher.mockRejectedValueOnce(Error("offline"));
    expect((await cache.get("AAPL"))?.dataUrl).toBe(a?.dataUrl);
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("rejects invalid symbols, HTML/SVG, oversized bodies and absurd image dimensions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("<svg onload='bad'/>", {
          headers: { "Content-Type": "image/svg+xml" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(256 * 1024 + 1), {
          headers: { "Content-Type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("not a PNG", { headers: { "Content-Type": "image/png" } }),
      );
    const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
    await expect(cache.get("../../private")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await cache.get("HTML")).toBeNull();
    expect(await cache.get("HUGE")).toBeNull();
    expect(await cache.get("BAD")).toBeNull();
    expect(await cache.get("BAD")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
    const bomb = Buffer.from(png);
    bomb.writeUInt32BE(100000, 16);
    expect(validLogoPNG(bomb)).toBe(false);
    expect(validLogoPNG(png)).toBe(true);
    expect(
      readdirSync(join(dir, "stock-logos", "v2")).every((f) =>
        f.endsWith(".missing"),
      ),
    ).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("bounds outbound requests to four and coalesces duplicate symbol requests", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  let active = 0,
    peak = 0;
  const releases: (() => void)[] = [];
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
    active++;
    peak = Math.max(active, peak);
    await new Promise<void>((r) => releases.push(r));
    active--;
    return response();
  });
  try {
    const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
    const work = Promise.all(
      ["A", "B", "C", "D", "E", "F"].map((s) => cache.get(s)),
    );
    for (let i = 0; i < 10 && fetcher.mock.calls.length < 4; i++)
      await new Promise((r) => setTimeout(r, 1));
    expect(fetcher).toHaveBeenCalledTimes(4);
    while (releases.length || fetcher.mock.calls.length < 6) {
      releases.shift()?.();
      await new Promise((r) => setTimeout(r, 1));
    }
    await work;
    expect(peak).toBe(4);
    expect(fetcher).toHaveBeenCalledTimes(6);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("shutdown aborts active logo work without leaving a negative cache", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
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
    const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
    const work = cache.get("AAPL");
    for (let i = 0; i < 10 && !fetcher.mock.calls.length; i++)
      await new Promise((r) => setTimeout(r, 1));
    cache.close();
    expect(await work).toBeNull();
    expect(readdirSync(dir)).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("catalog aliases bypass an old raw-symbol failure and reuse verified issuer cache offline", async () => {
  const { createHash } = await import("node:crypto");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { fixturePNG, fixtureCatalog } = await import("./logo-fixtures");
  const { parseLogoCatalog } = await import("./logo-catalog");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
    mkdirSync(join(dir, "stock-logos"));
    writeFileSync(
      join(
        dir,
        "stock-logos",
        createHash("sha256").update("AACOW").digest("hex") + ".missing",
      ),
      "",
    );
    writeFileSync(
      join(
        dir,
        "stock-logos",
        createHash("sha256").update("AACO").digest("hex") + ".png",
      ),
      fixturePNG,
    );
    const parsed = parseLogoCatalog(fixtureCatalog());
    const catalog = {
      sources: (s: string) => parsed.mappings.get(s)?.logos ?? [],
      close: () => {},
    };
    const fetcher = vi.fn<typeof fetch>();
    const cache = new StockLogoCache(dir, true, fetcher, catalog);
    expect((await cache.get("AACOW"))?.source).toContain(
      "company-logo-catalog",
    );
    expect(fetcher).not.toHaveBeenCalled();
    cache.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("a raw positive cache cannot outrank a reviewed source and different aliases share one download", async () => {
  const { createHash } = await import("node:crypto");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { fixturePNG, fixtureCatalog } = await import("./logo-fixtures");
  const { parseLogoCatalog } = await import("./logo-catalog");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
    mkdirSync(join(dir, "stock-logos"));
    writeFileSync(
      join(
        dir,
        "stock-logos",
        createHash("sha256").update("AACOW").digest("hex") + ".png",
      ),
      png,
    );
    const parsed = parseLogoCatalog(fixtureCatalog());
    const catalog = {
      sources: (s: string) => parsed.mappings.get(s)?.logos ?? [],
      close: () => {},
    };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return new Response(fixturePNG, {
        headers: { "Content-Type": "image/png" },
      });
    });
    const cache = new StockLogoCache(dir, false, fetcher, catalog);
    const [a, b] = await Promise.all([cache.get("AACOW"), cache.get("AACOU")]);
    expect(a?.dataUrl).toBe(
      "data:image/png;base64," + fixturePNG.toString("base64"),
    );
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://financialmodelingprep.com/image-stock/AACO.png",
    );
    cache.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("failed catalog source falls back to the original exact symbol, including cache and offline reuse", async () => {
  const { fixtureCatalog } = await import("./logo-fixtures");
  const { parseLogoCatalog } = await import("./logo-catalog");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
    const parsed = parseLogoCatalog(fixtureCatalog());
    const catalog = {
      sources: (s: string) => parsed.mappings.get(s)?.logos ?? [],
      close: () => {},
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(response());
    const cache = new StockLogoCache(dir, false, fetcher, catalog);
    expect((await cache.get("AACOW"))?.source).toBe("fmp-public-image");
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      "https://financialmodelingprep.com/image-stock/AACO.png",
      "https://financialmodelingprep.com/image-stock/AACOW.png",
    ]);
    expect((await cache.get("AACOW"))?.source).toBe("fmp-public-image");
    expect(fetcher).toHaveBeenCalledTimes(2);
    const offline = new StockLogoCache(dir, true, fetcher, catalog);
    expect((await offline.get("AACOW"))?.source).toBe("fmp-public-image");
    cache.close();
    offline.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("changed catalog bytes are rejected before exact-symbol fallback", async () => {
  const { fixtureCatalog } = await import("./logo-fixtures");
  const { parseLogoCatalog } = await import("./logo-catalog");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  try {
    const parsed = parseLogoCatalog(fixtureCatalog());
    const catalog = {
      sources: (s: string) => parsed.mappings.get(s)?.logos ?? [],
      close: () => {},
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response());
    const cache = new StockLogoCache(dir, false, fetcher, catalog);
    expect((await cache.get("AACOW"))?.source).toBe("fmp-public-image");
    expect(fetcher).toHaveBeenCalledTimes(2);
    cache.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
