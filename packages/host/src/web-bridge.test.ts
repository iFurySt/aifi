import { it, expect } from "vitest";
import { createServer, request as rawRequest } from "node:http";
import { webBridge } from "./web-bridge";
it("requires loopback Host, same-origin session and an allowlisted bounded request", async () => {
  let calls = 0;
  const server = createServer();
  server.on(
    "request",
    webBridge(
      {
        request: async () => {
          calls++;
          return { safe: true };
        },
      },
      () => {
        const a = server.address();
        return a && typeof a !== "string" ? a.port : 0;
      },
    ),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw Error("no listener");
    const base = `http://127.0.0.1:${address.port}`;
    const badHost = await new Promise<number>((resolve) => {
      const req = rawRequest(
        base + "/api/local/session",
        { headers: { Host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode!);
        },
      );
      req.end();
    });
    expect(badHost).toBe(403);
    expect(
      (
        await fetch(base + "/api/local/session", {
          headers: { Origin: "https://evil.example" },
        })
      ).status,
    ).toBe(403);
    const { token } = await (await fetch(base + "/api/local/session")).json();
    expect(
      (
        await fetch(base + "/api/local/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "status" }),
        })
      ).status,
    ).toBe(403);
    const malformedToken = await new Promise<number>((resolve) => {
      const req = rawRequest(
        base + "/api/local/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AIFi-Session": "é".repeat(64),
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode!);
        },
      );
      req.end(JSON.stringify({ method: "status" }));
    });
    expect(malformedToken).toBe(403);
    const headers = {
      "Content-Type": "application/json",
      "X-AIFi-Session": token,
      Origin: base,
    };
    expect(
      (
        await fetch(base + "/api/local/request", {
          method: "POST",
          headers,
          body: JSON.stringify({ method: "vault.read" }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(base + "/api/local/request", {
          method: "POST",
          headers,
          body: "x".repeat(65537),
        })
      ).status,
    ).toBe(413);
    expect(
      (
        await fetch(base + "/api/local/request", {
          method: "POST",
          headers,
          body: JSON.stringify({ method: "status" }),
        })
      ).status,
    ).toBe(200);
    expect(calls).toBe(1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
