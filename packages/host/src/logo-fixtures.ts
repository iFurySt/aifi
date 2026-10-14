import { createHash } from "node:crypto";
export const fixturePNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGMQSdnyHx9mGBkKAC4RisFexU89AAAAAElFTkSuQmCC",
  "base64",
);
export function fixtureCatalog(
  status = "verified",
  url = "https://financialmodelingprep.com/image-stock/AACO.png",
) {
  return {
    schemaVersion: 1,
    catalogVersion: "0.1.0",
    updatedAt: "2026-10-14",
    companies: [
      {
        id: "abony",
        reviewedAt: "2026-10-14",
        securities: [
          { market: "US", symbol: "AACO" },
          { market: "US", symbol: "AACOW", aliases: ["AACO-W"] },
          { market: "US", symbol: "AACOU" },
        ],
        logos: [
          {
            status,
            url,
            format: "png",
            checkedAt: "2026-10-14",
            width: 8,
            height: 8,
            sha256: createHash("sha256").update(fixturePNG).digest("hex"),
          },
        ],
      },
    ],
    symbols: { "US:EVIL": "abony" },
  };
}
