import { it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import seed from "./company-fund-logo-catalog.json";
import { fixturePNG } from "./logo-fixtures";
import { FundLogoCache, parseFundCatalog } from "./fund-logos";
import { fundCatalogURL, trustedLogoURL } from "./public-assets";
const fixture = () => ({
  ...seed,
  funds: [
    {
      ...seed.funds[0]!,
      logos: [
        {
          ...seed.funds[0]!.logos[0]!,
          width: 8,
          height: 8,
          sha256: createHash("sha256").update(fixturePNG).digest("hex"),
        },
      ],
    },
  ],
});
it("uses reviewed CIK identities, strict image metadata and fixed source paths", () => {
  expect(parseFundCatalog(seed).mappings.size).toBe(16);
  for (const fund of seed.funds)
    expect(
      parseFundCatalog(seed).mappings.get("F." + fund.cik)?.logos,
    ).toHaveLength(1);
  const changed = fixture();
  changed.funds[0]!.cik = "../private";
  expect(() => parseFundCatalog(changed)).toThrow();
  const duplicate = fixture();
  duplicate.funds.push({ ...duplicate.funds[0]! });
  expect(() => parseFundCatalog(duplicate)).toThrow();
  const bad = fixture();
  bad.funds[0]!.logos[0]!.width = 100000;
  expect(() => parseFundCatalog(bad)).toThrow();
  expect(trustedLogoURL(seed.funds[0]!.logos[0]!.url + "&extra=1")).toBe(false);
  const malicious = fixture();
  malicious.funds[0]!.logos[0]!.url = "https://evil.example/secret.png";
  expect(
    parseFundCatalog(malicious).mappings.get("F." + malicious.funds[0]!.cik)
      ?.logos,
  ).toEqual([]);
});
it("coalesces exact CIK logo reads, persists verified bytes and reuses them offline without fallback", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aifi-fund-logo-"));
  const manifest = fixture();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) =>
    String(input) === fundCatalogURL
      ? new Response(JSON.stringify(manifest))
      : new Response(fixturePNG, {
          headers: { "Content-Type": "image/png" },
        }),
  );
  const cache = new FundLogoCache(dir, false, fetcher, manifest);
  try {
    const cik = manifest.funds[0]!.cik;
    const [a, b] = await Promise.all([cache.get(cik), cache.get(cik)]);
    expect(a?.dataUrl).toContain(fixturePNG.toString("base64"));
    expect(b).toEqual(a);
    expect(
      fetcher.mock.calls.filter(([u]) => String(u) !== fundCatalogURL),
    ).toHaveLength(1);
    expect(() => cache.get("../../private")).toThrow();
    expect(await cache.get("0000000001")).toBeNull();
    cache.close();
    fetcher.mockClear();
    const offline = new FundLogoCache(dir, true, fetcher, manifest);
    expect((await offline.get(cik))?.dataUrl).toBe(a?.dataUrl);
    expect(await offline.get("0000000001")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    offline.close();
  } finally {
    cache.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("rejects renderer URLs and malformed CIKs before starting the host service", async () => {
  const { DataHost } = await import("./runtime");
  const host = new DataHost("unused-test-binary");
  for (const params of [
    null,
    { cik: 123 },
    { cik: "../../private" },
    { cik: "0001067983", url: "https://evil.example/logo.png" },
  ])
    await expect(host.request("fund.logo", params)).rejects.toThrow(
      "Invalid manager logo request",
    );
  await host.stop();
});
