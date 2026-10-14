import { Agent, get as httpsGet } from "node:https";
import { Readable } from "node:stream";
import { validDirectorySymbol } from "../../core/src/stock-directory.ts";

export const catalogURL =
  "https://raw.githubusercontent.com/ifuryst/company-logo-catalog/main/catalog.json";
const agent = new Agent({
  proxyEnv: process.env,
  keepAlive: true,
  maxSockets: 5,
});
/** Only explicitly reviewed origins/paths may supply company images. */
export function trustedLogoURL(value: string): boolean {
  try {
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
    if (value !== catalogURL && !trustedLogoURL(value)) {
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
