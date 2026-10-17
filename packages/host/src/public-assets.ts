import fundSeed from "./company-fund-logo-catalog.json" with { type: "json" };
import { Agent, get as httpsGet } from "node:https";
import { Readable } from "node:stream";
import { validDirectorySymbol } from "../../core/src/stock-directory.ts";

export const catalogURL =
  "https://raw.githubusercontent.com/ifuryst/company-logo-catalog/main/catalog.json";
export const fallbackCatalogURL =
  "https://raw.githubusercontent.com/ifuryst/company-logo-catalog/main/app-fallbacks.json";
export const fundCatalogURL =
  "https://raw.githubusercontent.com/ifuryst/company-logo-catalog/main/funds-catalog.json";
const reviewedFundURLs = new Set(
  fundSeed.funds.flatMap((f) => f.logos.map((l) => l.url)),
);
const agent = new Agent({
  proxyEnv: process.env,
  keepAlive: true,
  maxSockets: 5,
});
// Exact official assets reviewed in the bundled catalog. A remote manifest cannot
// broaden these origins or paths. New assets require a code review here.
const issuerLogoURLs = new Set([
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Skydance_Corporation_Dark_Logo_2026.svg/330px-Skydance_Corporation_Dark_Logo_2026.svg.png",
  "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=https%3A%2F%2Fwww.vylor.com&size=128",
  "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=https%3A%2F%2Fwww.vivmarkresidential.com&size=128",
  "https://www.adarx.com/apple-touch-icon.png",
  "https://s25.q4cdn.com/125328972/files/design/site_logo/ADI_Logo_White.png",
  "https://adbt.io/favicon-192.png",
  "https://apogeeacquisitioncorp.com/wp-content/uploads/2026/02/cropped-AAC-LOGO-192x192.png",
  "https://cdn.prod.website-files.com/6a32c781f257940eba92bcf0/6a5e7e4a39e67f4aa00a20d0_accelevation-icon-512-brand.png",
  "https://www.analog.com/media/favicon/adi-icon-iphone-retina-180x180.png",
  "https://www.elevancehealth.com/content/dam/elevance-health-non-index/logos/Elevance_Health_Avatar_1200x1200.png",
]);
/** Only explicitly reviewed origins/paths may supply company images. */
export function trustedLogoURL(value: string): boolean {
  try {
    if (reviewedFundURLs.has(value) || issuerLogoURLs.has(value)) return true;
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return false;
    if (url.hostname === "raw.githubusercontent.com") {
      const match =
        /^\/(?:nvstly\/icons\/[0-9a-f]{40}\/ticker_icons|ShaadyEmad\/ticker-logos\/[0-9a-f]{40}\/US%20Market\/PNG|ngnmarket\/us-companies-logos\/[0-9a-f]{40}\/dist\/png)\/([^/]+)\.png$/.exec(
          url.pathname,
        );
      if (!match) return false;
      const symbol = decodeURIComponent(match[1]!);
      return validDirectorySymbol(symbol) && !symbol.split("/").includes("..");
    }
    if (url.hostname === "financialmodelingprep.com") {
      const match = /^\/image-stock\/([^/]+)\.png$/.exec(url.pathname);
      if (!match) return false;
      const symbol = decodeURIComponent(match[1]!);
      return validDirectorySymbol(symbol) && !symbol.split("/").includes("..");
    }
    return (
      url.hostname === "tacticalresources.com" &&
      /^\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-zA-Z0-9_-]+\.png$/.test(
        url.pathname,
      )
    );
  } catch {
    return false;
  }
}
/** Scoped HTTPS transport; TLS checked, no redirects, cookies or global fetch changes. */
export const fetchPublicAsset: typeof fetch = (input, options) =>
  new Promise((resolve, reject) => {
    const value = String(input);
    if (
      value !== catalogURL &&
      value !== fallbackCatalogURL &&
      value !== fundCatalogURL &&
      !trustedLogoURL(value)
    ) {
      reject(Error("Untrusted public asset source."));
      return;
    }
    const request = httpsGet(
      value,
      {
        agent,
        headers: Object.fromEntries(new Headers(options?.headers).entries()),
        signal: options?.signal ?? undefined,
      },
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
export async function readPublicBytes(
  response: Response,
  maxBytes: number,
  mime?: string,
) {
  if (
    !response.ok ||
    !response.body ||
    Number(response.headers.get("content-length") || 0) > maxBytes ||
    (mime && response.headers.get("content-type")?.split(";")[0] !== mime)
  ) {
    await response.body?.cancel();
    throw Error("Public asset unavailable.");
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > maxBytes) throw Error("Public asset too large.");
      chunks.push(Buffer.from(next.value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}
