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
    const restarted = new StockLogoCache(dir, false, fetcher, noCatalog);
    expect((await restarted.get("AAPL"))?.dataUrl).toBe(a?.dataUrl);
    expect(fetcher).toHaveBeenCalledTimes(1);
    restarted.close();
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
    cache.close();
    offline.close();
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
it("shows a cached fallback immediately while shared aliases acquire the preferred reviewed source", async () => {
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
    expect(a?.dataUrl).toBe("data:image/png;base64," + png.toString("base64"));
    expect(b?.dataUrl).toBe(
      "data:image/png;base64," + fixturePNG.toString("base64"),
    );
    expect(await cache.get("AACOW")).toMatchObject({
      dataUrl: b?.dataUrl,
      source: b?.source,
    });
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

it("returns stale disk images immediately and coalesces their background refresh", async () => {
  const { fixturePNG } = await import("./logo-fixtures");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  let resolve!: (value: Response) => void;
  const next = new Promise<Response>((done) => {
    resolve = done;
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(response())
    .mockReturnValue(next);
  const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
  try {
    const initial = await cache.get("AAPL");
    const files = join(dir, "stock-logos", "v2");
    const file = join(
      files,
      readdirSync(files).find((f) => f.endsWith(".png"))!,
    );
    const old = new Date(Date.now() - 8 * 86400000);
    utimesSync(file, old, old);
    for (let i = 0; i < 3; i++) {
      const hit = await Promise.race([
        cache.get("AAPL"),
        Promise.resolve("blocked"),
      ]);
      expect(hit).not.toBe("blocked");
      expect((hit as typeof initial)?.dataUrl).toBe(initial?.dataUrl);
    }
    expect(fetcher).toHaveBeenCalledTimes(2);
    resolve(
      new Response(fixturePNG, { headers: { "Content-Type": "image/png" } }),
    );
    await vi.waitFor(() => expect(readFileSync(file)).toEqual(fixturePNG));
    expect((await cache.get("AAPL"))?.dataUrl).toBe(
      "data:image/png;base64," + fixturePNG.toString("base64"),
    );
  } finally {
    resolve(response());
    cache.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("disk hits remain immediate when the cold-download queue is full", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-"));
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            "abort",
            () => reject(Error("closed")),
            { once: true },
          ),
        ),
    );
  const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
  let cold: Promise<unknown> = Promise.resolve();
  try {
    mkdirSync(join(dir, "stock-logos"));
    const path = join(
      dir,
      "stock-logos",
      createHash("sha256").update("AAPL").digest("hex") + ".png",
    );
    writeFileSync(path, png);
    const old = new Date(Date.now() - 8 * 86400000);
    utimesSync(path, old, old);
    cold = Promise.all(
      Array.from({ length: 16 }, (_, i) => cache.get(`B${i}`)),
    );
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    const hit = await Promise.race([
      cache.get("AAPL"),
      Promise.resolve("blocked"),
    ]);
    expect(hit).not.toBe("blocked");
    expect((hit as { dataUrl: string }).dataUrl).toBe(
      "data:image/png;base64," + png.toString("base64"),
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
  } finally {
    cache.close();
    await cold;
    rmSync(dir, { recursive: true, force: true });
  }
});
it("disk-only reads reuse stale images without scheduling provider work, including a saturated queue", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-batch-"));
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(Error("closed")),
          { once: true },
        );
      }),
  );
  const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
  let work: Promise<unknown> = Promise.resolve();
  try {
    mkdirSync(join(dir, "stock-logos"));
    const file = join(
      dir,
      "stock-logos",
      createHash("sha256").update("AAPL").digest("hex") + ".png",
    );
    writeFileSync(file, png);
    const old = new Date(Date.now() - 8 * 86400000);
    utimesSync(file, old, old);
    expect(cache.peek("AAPL")?.dataUrl).toBe(
      "data:image/png;base64," + png.toString("base64"),
    );
    expect(cache.peek("MISSING")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    work = Promise.all(
      Array.from({ length: 16 }, (_, i) => cache.get(`B${i}`)),
    );
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    expect(cache.peek("AAPL")).not.toBeNull();
    expect(cache.peek("MISSING")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(() => cache.peek("../private")).toThrow();
  } finally {
    cache.close();
    await work;
    rmSync(dir, { recursive: true, force: true });
  }
});

it("a reviewed rejection blocks previously cached artwork and a repeated bad provider response", async () => {
  const { fixturePNG, fixtureCatalog } = await import("./logo-fixtures");
  const { LogoCatalog } = await import("./logo-catalog");
  const dir = mkdtempSync(join(tmpdir(), "aifi-rejected-logo-"));
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(fixturePNG, { headers: { "Content-Type": "image/png" } }),
    );
  const old = new StockLogoCache(dir, false, fetcher, noCatalog);
  try {
    expect(await old.get("AACO")).not.toBeNull();
    old.close();
    const seed = fixtureCatalog("rejected");
    const offline = new StockLogoCache(
      dir,
      true,
      fetcher,
      new LogoCatalog(dir, true, fetcher, seed),
    );
    expect(offline.peek("AACO")).toBeNull();
    expect(await offline.get("AACO")).toBeNull();
    offline.close();
    const online = new StockLogoCache(
      dir,
      false,
      fetcher,
      new LogoCatalog(dir, true, fetcher, seed),
    );
    expect(await online.get("AACO")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await online.get("AACO")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    online.close();
  } finally {
    old.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("promotes matching exact-URL cache bytes into a newly reviewed source without downloading again", async () => {
  const { fixturePNG, fixtureCatalog } = await import("./logo-fixtures");
  const { LogoCatalog } = await import("./logo-catalog");
  const dir = mkdtempSync(join(tmpdir(), "aifi-reviewed-logo-upgrade-"));
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(fixturePNG, { headers: { "Content-Type": "image/png" } }),
    );
  const previous = new StockLogoCache(dir, false, fetcher, noCatalog);
  try {
    await previous.get("AACO");
    previous.close();
    const cache = new StockLogoCache(
      dir,
      true,
      fetcher,
      new LogoCatalog(dir, true, fetcher, fixtureCatalog()),
    );
    expect(cache.peek("AACO")?.source).toContain("company-logo-catalog");
    expect((await cache.get("AACOW"))?.source).toContain(
      "company-logo-catalog",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    cache.close();
    const changed = fixtureCatalog();
    changed.companies[0]!.logos[0]!.sha256 = "a".repeat(64);
    const strict = new StockLogoCache(
      dir,
      true,
      fetcher,
      new LogoCatalog(dir, true, fetcher, changed),
    );
    expect(await strict.get("AACOW")).toBeNull();
    strict.close();
  } finally {
    previous.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("reports queue pressure as retryable and never as a cached missing image", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-logo-pressure-"));
  const releases: (() => void)[] = [];
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
    await new Promise<void>((resolve) => releases.push(resolve));
    return response();
  });
  const cache = new StockLogoCache(dir, false, fetcher, noCatalog);
  try {
    const first = Array.from({ length: 16 }, (_, i) => cache.get(`F${i}`));
    await expect(cache.get("FICO")).rejects.toThrow("busy");
    while (releases.length || fetcher.mock.calls.length < 16) {
      releases.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await Promise.all(first);
    const retry = cache.get("FICO");
    await new Promise((resolve) => setTimeout(resolve, 0));
    releases.shift()?.();
    expect(await retry).not.toBeNull();
    expect(
      readdirSync(join(dir, "stock-logos", "v2")).some((f) =>
        f.endsWith(".missing"),
      ),
    ).toBe(false);
  } finally {
    cache.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
