import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dataMethods, type DataMethod } from "../../core/src/data-service.ts";
export interface DataBackend {
  request(method: DataMethod, params?: unknown): Promise<unknown>;
}
export function webBridge(backend: DataBackend, port: () => number) {
  const token = randomBytes(32).toString("hex");
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (!req.url?.startsWith("/api/local/")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    const send = (code: number, value: unknown) => {
      res.statusCode = code;
      res.end(JSON.stringify(value));
    };
    const host = req.headers.host || "";
    if (
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress || "",
      ) ||
      !["127.0.0.1", "localhost"].some(
        (name) => host === `${name}:${port()}`,
      ) ||
      (req.headers.origin && req.headers.origin !== `http://${host}`) ||
      ["cross-site", "same-site"].includes(
        String(req.headers["sec-fetch-site"]),
      )
    ) {
      send(403, { error: "Local origin required." });
      return;
    }
    if (req.url === "/api/local/session" && req.method === "GET") {
      send(200, { token });
      return;
    }
    req.setTimeout(10000, () => req.destroy());
    const auth = req.headers["x-aifi-session"];
    if (
      typeof auth !== "string" ||
      !/^[0-9a-f]{64}$/.test(auth) ||
      !timingSafeEqual(Buffer.from(auth), Buffer.from(token))
    ) {
      send(403, { error: "Local session required." });
      return;
    }
    if (
      req.url !== "/api/local/request" ||
      req.method !== "POST" ||
      req.headers["content-type"]?.split(";")[0] !== "application/json"
    ) {
      send(405, { error: "Unsupported local request." });
      return;
    }
    try {
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 64 << 10) {
          send(413, { error: "Request too large." });
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      req.setTimeout(0);
      const input = JSON.parse(Buffer.concat(chunks).toString()) as {
        method: DataMethod;
        params?: unknown;
      };
      if (!input || !dataMethods.includes(input.method)) {
        send(400, { error: "Unsupported data action." });
        return;
      }
      send(200, { result: await backend.request(input.method, input.params) });
    } catch {
      send(400, {
        error: "Data action failed. Check the service and your settings.",
      });
    }
  };
}
