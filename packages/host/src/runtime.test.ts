import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDecipheriv } from "node:crypto";
import { DataHost, encryptCredential, validateSettings } from "./runtime";
describe("host credential boundary", () => {
  it("encrypts with authenticated ciphertext and a private device key", () => {
    const dir = mkdtempSync(join(tmpdir(), "aifi-vault-test-"));
    try {
      const secret = "synthetic-key-for-testing";
      const encoded = encryptCredential(dir, secret);
      expect(encoded).not.toContain(secret);
      const bytes = Buffer.from(encoded.slice(3), "base64");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        readFileSync(join(dir, "aifi-vault.key")),
        bytes.subarray(0, 12),
      );
      decipher.setAuthTag(bytes.subarray(12, 28));
      expect(
        Buffer.concat([
          decipher.update(bytes.subarray(28)),
          decipher.final(),
        ]).toString(),
      ).toBe(secret);
      if (process.platform !== "win32")
        expect(statSync(join(dir, "aifi-vault.key")).mode & 0o777).toBe(0o600);
      expect(encryptCredential(dir, secret)).not.toBe(encoded);
      expect(() => encryptCredential(dir, "bad\nkey")).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects invalid settings before crossing into the host service", () => {
    const settings = {
      revision: 0,
      directoryEnabled: true,
      automatic: true,
      intervalHours: 24,
      secUserAgent: "",
    };
    expect(() => validateSettings(settings)).not.toThrow();
    expect(() => validateSettings({ ...settings, intervalHours: 0 })).toThrow();
    expect(() =>
      validateSettings({ ...settings, arbitraryCommand: "ignored" }),
    ).toThrow();
    expect(() => validateSettings({ ...settings, automatic: "yes" })).toThrow();
  });
});

it("rejects invalid directory reads before starting any child or RPC", async () => {
  const host = new DataHost("unused-test-binary");
  await expect(
    host.request("directory.list", { query: "", limit: 1000, offset: 0 }),
  ).rejects.toThrow("Invalid directory query");
  await expect(
    host.request("directory.get", { symbol: "AAPL", path: "/private" }),
  ).rejects.toThrow("Invalid directory symbol");
  await expect(host.request("directory.get", { symbol: 42 })).rejects.toThrow(
    "Invalid directory symbol",
  );
});

it("rejects arbitrary logo URLs before any service or outbound request", async () => {
  const host = new DataHost("unused-test-binary");
  await expect(
    host.request("stock.logo", {
      symbol: "AAPL",
      url: "https://other.invalid/image.png",
    }),
  ).rejects.toThrow("Invalid directory symbol");
});
it("validates logo batches and checks directory membership in one batch before disk-only reads", async () => {
  const { vi } = await import("vitest");
  const host = new DataHost("unused-test-binary");
  for (const params of [
    { symbols: ["AAPL"], url: "https://bad.invalid" },
    { symbols: Array(51).fill("AAPL") },
    { symbols: ["../private"] },
  ])
    await expect(host.request("stock.logos.cached", params)).rejects.toThrow(
      "Invalid logo batch",
    );
  let active = 0,
    peak = 0;
  const rpc = vi.fn(async () => {
    active++;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active--;
    return [];
  });
  const peek = vi.fn();
  Object.assign(host, { rpc, logoCache: { peek } });
  expect(
    await host.request("stock.logos.cached", {
      symbols: ["aapl", "AAPL", "MSFT"],
    }),
  ).toEqual([]);
  expect(rpc.mock.calls.length).toBe(1);
  expect(peak).toBe(1);
  expect(peek).not.toHaveBeenCalled();
});
it("bounds cached batch concurrency and total image payload", async () => {
  const { vi } = await import("vitest");
  const host = new DataHost("unused-test-binary");
  const symbols = Array.from({ length: 50 }, (_, i) => `A${i}`);
  let release!: (symbols: string[]) => void;
  const blocked = new Promise<string[]>((resolve) => {
    release = resolve;
  });
  const rpc = vi.fn().mockReturnValue(blocked);
  const logo = {
    dataUrl: "x".repeat(350000),
    source: "fixture",
    fetchedAt: "",
  };
  Object.assign(host, { rpc, logoCache: { peek: () => logo } });
  const first = host.request("stock.logos.cached", { symbols });
  const second = host.request("stock.logos.cached", { symbols });
  await expect(host.request("stock.logos.cached", { symbols })).rejects.toThrow(
    "Logo cache busy",
  );
  release(symbols);
  const batches = (await Promise.all([first, second])) as {
    symbol: string;
    logo: typeof logo;
  }[][];
  for (const batch of batches) {
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.length).toBeLessThan(50);
    expect(
      batch.reduce((bytes, entry) => bytes + entry.logo.dataUrl.length, 0),
    ).toBeLessThanOrEqual(8 * 1024 * 1024);
  }
  expect(rpc).toHaveBeenCalledTimes(2);
  expect(await host.request("stock.logos.cached", { symbols: [] })).toEqual([]);
});
