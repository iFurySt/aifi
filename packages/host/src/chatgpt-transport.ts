import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";
import { chatGPTOutputLimit } from "../../core/src/chatgpt";

export const CHATGPT_ISSUER = "https://auth.openai.com";
export const CHATGPT_RESOURCE = "https://api.openai.com/v1";
export const CHATGPT_USAGE = "https://chatgpt.com/settings/usage";
export const CHATGPT_TOKEN = `${CHATGPT_ISSUER}/api/accounts/oauth/token`;
export const CHATGPT_REVOKE = `${CHATGPT_ISSUER}/api/accounts/oauth/revoke`;

export class ChatGPTError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function providerError(code: unknown, status?: number): ChatGPTError {
  if (code === "subscription_sharing_usage_limit_exceeded" || status === 429)
    return new ChatGPTError(
      "usage_limit",
      "ChatGPT usage limit reached. Open Manage usage to review your limits.",
    );
  if (code === "subscription_sharing_usage_unavailable")
    return new ChatGPTError(
      "unavailable",
      "ChatGPT plan usage is temporarily unavailable. Try again later or open Manage usage.",
    );
  if (code === "invalid_grant" || status === 401)
    return new ChatGPTError(
      "sign_in",
      "Your ChatGPT connection needs a new sign-in.",
    );
  if (status === 403)
    return new ChatGPTError(
      "permission",
      "This account has not enabled ChatGPT plan usage for AIFi. Reconnect or review Manage usage.",
    );
  return new ChatGPTError(
    "request",
    "ChatGPT could not complete this request. Try again or reconnect your account.",
  );
}
export async function boundedText(response: Response, limit: number) {
  if (!response.body) throw Error("Empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw Error("Response too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
const remoteKeys = createRemoteJWKSet(
  new URL(`${CHATGPT_ISSUER}/.well-known/jwks.json`),
  {
    [customFetch]: (url, init) =>
      fetch(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      }),
    timeoutDuration: 10000,
  },
);

export class ChatGPTTransport {
  constructor(
    readonly fetcher: typeof fetch = fetch,
    private keys: JWTVerifyGetKey = remoteKeys,
  ) {}
  async json(url: string, init: RequestInit, signal?: AbortSignal) {
    const response = await this.fetcher(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(20000),
        ...(signal ? [signal] : []),
      ]),
    });
    const value = JSON.parse(await boundedText(response, 1024 * 1024));
    if (!response.ok)
      throw providerError(value?.error?.code ?? value?.error, response.status);
    return value;
  }
  async identity(token: string, clientId: string, nonce?: string) {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: CHATGPT_ISSUER,
      audience: clientId,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat"],
      clockTolerance: 5,
    });
    if (!payload.sub || (nonce !== undefined && payload.nonce !== nonce))
      throw Error("ChatGPT identity could not be verified.");
    return {
      subject: payload.sub,
      email:
        typeof payload.email === "string"
          ? payload.email.slice(0, 254)
          : undefined,
      name:
        typeof payload.name === "string"
          ? payload.name.slice(0, 100)
          : undefined,
    };
  }
}

/** SSE deltas are provisional; only a terminal completed event commits a reply. */
export async function readChatGPTStream(
  response: Response,
  onDelta: (text: string) => void,
) {
  if (!response.ok) {
    let code: unknown;
    try {
      code = JSON.parse(await boundedText(response, 65536))?.error?.code;
    } catch {
      /* Never show raw bodies. */
    }
    throw providerError(code, response.status);
  }
  // The direct plan route can return valid SSE without Content-Type. Accept
  // an absent header, but still require framed JSON events, bounded text and a
  // terminal completion below. Explicit conflicting media types stay rejected.
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if ((contentType && contentType !== "text/event-stream") || !response.body)
    throw Error("ChatGPT returned an invalid response. Try again.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    text = "",
    bytes = 0,
    completed = false;
  const event = (frame: string) => {
    const data = frame
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    const item = JSON.parse(data);
    if (
      item.type === "response.output_text.delta" &&
      typeof item.delta === "string"
    ) {
      text += item.delta;
      if (text.length > chatGPTOutputLimit)
        throw Error(
          "Reply exceeded the local size limit. Ask for a shorter answer.",
        );
      onDelta(item.delta);
    } else if (item.type === "response.failed" || item.type === "error") {
      throw providerError(
        item.response?.error?.code ?? item.error?.code ?? item.code,
      );
    } else if (item.type === "response.incomplete") {
      throw Error("ChatGPT could not finish the reply. Try again.");
    } else if (item.type === "response.completed") {
      if (item.response?.status !== "completed")
        throw Error("ChatGPT did not complete the reply.");
      completed = true;
    }
  };
  try {
    while (!completed) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2 * 1024 * 1024)
        throw Error("ChatGPT response exceeded the local size limit.");
      buffer += decoder.decode(value, { stream: true });
      // Normalize CRLF after accumulation so a split CR/LF remains intact.
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 512 * 1024)
        throw Error("ChatGPT stream event is too large.");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1 && !completed) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        event(frame);
      }
    }
    if (!completed || !text.trim())
      throw Error("ChatGPT did not finish a text reply. Try again.");
    return text;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
