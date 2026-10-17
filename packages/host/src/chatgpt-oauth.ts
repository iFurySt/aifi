import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { CHATGPT_ISSUER, CHATGPT_RESOURCE } from "./chatgpt-transport";

export async function startChatGPTSignIn(options: {
  hostId: string;
  clientId?: string;
  idToken?: string;
  signal: AbortSignal;
  openBrowser: (url: string) => Promise<unknown>;
  onRegistration: (clientId: string) => Promise<void>;
}) {
  const state = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  let redirectUri = "",
    used = false;
  let resolve!: (value: { code: string; clientId: string }) => void,
    reject!: (error: Error) => void;
  const callback = new Promise<{ code: string; clientId: string }>(
    (yes, no) => {
      resolve = yes;
      reject = no;
    },
  );
  // Attach rejection handling before asynchronous listener startup/browser open.
  void callback.catch(() => {});
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
    response.setHeader("Referrer-Policy", "no-referrer");
    const finish = (status: number, body: string) => {
      response.writeHead(status);
      response.end(body);
    };
    try {
      if (
        request.method !== "GET" ||
        !request.url ||
        request.url.length > 16384 ||
        used ||
        request.headers.host !== new URL(redirectUri).host
      )
        return finish(400, "Invalid sign-in callback.");
      const url = new URL(request.url, redirectUri);
      if (
        url.pathname !== "/auth/callback" ||
        url.origin !== new URL(redirectUri).origin ||
        [...url.searchParams.keys()].some(
          (key) => url.searchParams.getAll(key).length !== 1,
        ) ||
        url.searchParams.get("state") !== state
      )
        return finish(400, "Sign-in could not be verified.");
      used = true;
      if (url.searchParams.has("error")) {
        finish(400, "Sign-in was not completed. Return to AIFi to try again.");
        reject(Error("ChatGPT sign-in was declined. You can try again."));
        return;
      }
      const code = url.searchParams.get("code"),
        clientId = url.searchParams.get("client_id") ?? options.clientId;
      if (
        !code ||
        !clientId ||
        clientId === "dynamic_agent_client" ||
        !/^[\w-]{1,200}$/.test(clientId) ||
        (options.clientId && clientId !== options.clientId)
      ) {
        finish(400, "Sign-in registration could not be verified.");
        reject(Error("ChatGPT registration could not be verified."));
        return;
      }
      finish(
        200,
        "Authorization received. Return to AIFi to finish connecting.",
      );
      resolve({ code, clientId });
    } catch {
      finish(400, "Invalid sign-in callback.");
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxConnections = 8;
  const abort = () =>
    reject(Error("ChatGPT sign-in was cancelled or timed out."));
  options.signal.addEventListener("abort", abort, { once: true });
  server.on("error", () =>
    reject(Error("ChatGPT sign-in listener is unavailable.")),
  );
  try {
    options.signal.throwIfAborted();
    await new Promise<void>((yes, no) => {
      server.once("error", no);
      server.listen(0, "127.0.0.1", () => {
        server.removeListener("error", no);
        yes();
      });
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw Error("ChatGPT sign-in listener is unavailable.");
    redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
    const url = new URL(`${CHATGPT_ISSUER}/api/accounts/authorize`);
    url.search = new URLSearchParams({
      client_id: options.clientId ?? "dynamic_agent_client",
      ext_agent_host_id: options.hostId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope:
        "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
      resource: CHATGPT_RESOURCE,
      state,
      nonce,
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      ...(options.clientId
        ? options.idToken
          ? { id_token_hint: options.idToken }
          : {}
        : { agent_name_hint: "AIFi" }),
    }).toString();
    options.signal.throwIfAborted();
    await options.openBrowser(url.href);
    const result = await callback;
    options.signal.throwIfAborted();
    await options.onRegistration(result.clientId);
    return { ...result, nonce, verifier, redirectUri };
  } finally {
    options.signal.removeEventListener("abort", abort);
    server.close();
    server.closeAllConnections();
  }
}
