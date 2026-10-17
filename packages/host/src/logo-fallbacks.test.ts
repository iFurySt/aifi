import { it, expect } from "vitest";
import seed from "./company-logo-fallbacks.json";
import { parseLogoFallbacks } from "./logo-fallbacks";
import { trustedLogoURL } from "./public-assets";
it("keeps availability candidates distinct from reviewed identity and uses exact stock keys", () => {
  const parsed = parseLogoFallbacks(seed);
  expect(parsed.mappings.size).toBe(seed.items.length);
  const row = seed.items[0]!;
  expect(parsed.mappings.get(row.symbol)?.logos[0]?.source).toContain(
    "availability:",
  );
  expect(parsed.mappings.get("NO-SUCH-STOCK")).toBeUndefined();
  expect(parsed.mappings.get(row.symbol)?.logos[0]?.expectedHash).toBe(
    row.sha256,
  );
});
it("rejects duplicate symbols, changed checksum, unknown basis and arbitrary source paths", () => {
  for (const update of [
    { sha256: "bad" },
    { basis: "verified" },
    { width: 0 },
    { url: "https://evil.example/stock.png" },
  ]) {
    const value = structuredClone(seed);
    Object.assign(value.items[0]!, update);
    expect(() => parseLogoFallbacks(value)).toThrow();
  }
  const duplicate = structuredClone(seed);
  duplicate.items.push(duplicate.items[0]!);
  expect(() => parseLogoFallbacks(duplicate)).toThrow();
  expect(
    trustedLogoURL(
      "https://raw.githubusercontent.com/ngnmarket/us-companies-logos/main/dist/png/A.png",
    ),
  ).toBe(false);
  expect(
    trustedLogoURL(
      "https://raw.githubusercontent.com/ngnmarket/us-companies-logos/" +
        "a".repeat(40) +
        "/dist/png/A%2F..%2Fsecret.png",
    ),
  ).toBe(false);
});
