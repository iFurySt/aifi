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
