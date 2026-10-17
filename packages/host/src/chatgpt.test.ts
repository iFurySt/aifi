import { afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { ChatGPTStore } from "./chatgpt-store";
import { ChatGPTHost } from "./chatgpt";
import {
  ChatGPTTransport,
  CHATGPT_ISSUER,
  CHATGPT_TOKEN,
  CHATGPT_RESOURCE,
  readChatGPTStream,
} from "./chatgpt-transport";
import type { ChatGPTStatus, ChatGPTRequest } from "../../core/src/chatgpt";

const directories: string[] = [],
  hosts: ChatGPTHost[] = [];
let key: Awaited<ReturnType<typeof generateKeyPair>>,
  keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  key = await generateKeyPair("RS256");
  keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(key.publicKey)), kid: "test", alg: "RS256" }],
  });
});
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.dispose()));
  for (const path of directories.splice(0))
    rmSync(path, { recursive: true, force: true });
});
function store() {
  const directory = mkdtempSync(join(tmpdir(), "aifi-chatgpt-test-"));
  directories.push(directory);
  return new ChatGPTStore(directory);
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const frame = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
function stream(events: unknown[], fragment = false) {
  const bytes = new TextEncoder().encode(events.map(frame).join(""));
  return new Response(
    new ReadableStream({
      start(controller) {
        if (fragment)
          for (let i = 0; i < bytes.length; i += 3)
            controller.enqueue(bytes.slice(i, i + 3));
        else controller.enqueue(bytes);
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
const delta = (text: string) => ({
  type: "response.output_text.delta",
  delta: text,
});
const completed = {
  type: "response.completed",
  response: { status: "completed" },
};
const request: ChatGPTRequest = {
  requestId: "request-1",
  profileId: "profile-1",
  model: "test-model",
  messages: [{ role: "user", content: "Hello" }],
};
async function authorized(fetcher: typeof fetch) {
  const s = store();
  await s.transaction((v) => {
    v.activeProfileId = "profile-1";
    v.profiles.push({
      id: "profile-1",
      clientId: "issued-client",
      subject: "subject-1",
      email: "same@example.invalid",
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
      idToken: "synthetic-id",
      scopes: ["chatgpt.tokens.use.direct"],
      expiresAt: Date.now() + 3600000,
    });
  });
  const h = new ChatGPTHost(
    s,
    async () => {},
    new ChatGPTTransport(fetcher, keys),
  );
  hosts.push(h);
  await h.request("status");
  return { h, s };
}
function models() {
  return json({
    models: [
      { slug: "test-model", display_name: "Test model", visibility: "list" },
      { slug: "hidden", display_name: "Hidden", visibility: "hide" },
    ],
  });
}

it("encrypts credentials, preserves the host ID, and serializes distinct runtime transactions", async () => {
  const s = store();
  await s.transaction((v) => {
    v.profiles.push({
      id: "one",
      clientId: "issued",
      scopes: [],
      expiresAt: 0,
      refreshToken: "secret-fixture",
    });
  });
  const hostId = s.read().hostId;
  expect(
    readFileSync(join(s.directory, "profiles.enc")).toString(),
  ).not.toContain("secret-fixture");
  if (process.platform !== "win32")
    expect(statSync(join(s.directory, "profiles.enc")).mode & 0o777).toBe(
      0o600,
    );
  const second = new ChatGPTStore(join(s.directory, ".."));
  await Promise.all([
    s.transaction(async (v) => {
      await new Promise((r) => setTimeout(r, 20));
      v.welcomeSeen = true;
    }),
    second.transaction((v) => {
      v.activeProfileId = "one";
    }),
  ]);
  expect(s.read()).toMatchObject({
    hostId,
    welcomeSeen: true,
    activeProfileId: "one",
  });
  writeFileSync(join(s.directory, "profiles.enc"), "corrupt", { mode: 0o600 });
  await expect(s.transaction(() => {})).rejects.toThrow("could not be read");
  expect(readFileSync(join(s.directory, "profiles.enc"), "utf8")).toBe(
    "corrupt",
  );
});

it("dynamically registers with PKCE, verifies identity and scope, and keeps tokens out of status", async () => {
  const s = store();
  let authorize!: URL;
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(CHATGPT_TOKEN);
      const form = init?.body as URLSearchParams;
      expect(s.read().profiles[0].clientId).toBe("issued-client"); // saved before exchange
      expect(form.get("client_id")).toBe("issued-client");
      expect(form.get("redirect_uri")).toBe(
        authorize.searchParams.get("redirect_uri"),
      );
      expect(
        createHash("sha256")
          .update(form.get("code_verifier")!)
          .digest("base64url"),
      ).toBe(authorize.searchParams.get("code_challenge"));
      const id = await new SignJWT({
        nonce: authorize.searchParams.get("nonce"),
        email: "test@example.invalid",
      })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer(CHATGPT_ISSUER)
        .setAudience("issued-client")
        .setSubject("test-subject")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(key.privateKey);
      return json({
        token_type: "Bearer",
        access_token: "secret-access",
        refresh_token: "secret-refresh",
        id_token: id,
        scope: "openid chatgpt.tokens.use.direct",
        expires_in: 3600,
      });
    },
  ) as unknown as typeof fetch;
  const open = async (value: string) => {
    authorize = new URL(value);
    expect(authorize.searchParams.get("client_id")).toBe(
      "dynamic_agent_client",
    );
    expect(authorize.searchParams.get("agent_name_hint")).toBe("AIFi");
    expect(authorize.searchParams.get("ext_agent_host_id")).toBe(
      s.read().hostId,
    );
    const callback = new URL(authorize.searchParams.get("redirect_uri")!);
    callback.search = new URLSearchParams({
      state: "bad-state",
      code: "test-code",
      client_id: "issued-client",
    }).toString();
    expect((await fetch(callback)).status).toBe(400);
    callback.searchParams.set("state", authorize.searchParams.get("state")!);
    expect((await fetch(callback)).status).toBe(200);
  };
  const h = new ChatGPTHost(s, open, new ChatGPTTransport(fetcher, keys));
  hosts.push(h);
  const status = (await h.request("signIn")) as ChatGPTStatus;
  expect(status.profiles[0]).toMatchObject({
    connected: true,
    sharing: true,
    email: "test@example.invalid",
  });
  expect(JSON.stringify(status)).not.toMatch(
    /secret-|accessToken|refreshToken|clientId|test-subject/,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("retains an issued registration when exchange fails and reuses it on reconnect", async () => {
  const s = store();
  let count = 0;
  const open = async (value: string) => {
    const url = new URL(value);
    count++;
    expect(url.searchParams.get("client_id")).toBe(
      count === 1 ? "dynamic_agent_client" : "issued-client",
    );
    expect(url.searchParams.has("agent_name_hint")).toBe(count === 1);
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    callback.search = new URLSearchParams({
      state: url.searchParams.get("state")!,
      code: "test",
      ...(count === 1 ? { client_id: "issued-client" } : {}),
    }).toString();
    await fetch(callback);
  };
  const fetcher = vi.fn(async () =>
    json({ error: "invalid_grant" }, 400),
  ) as unknown as typeof fetch;
  const h = new ChatGPTHost(s, open, new ChatGPTTransport(fetcher, keys));
  hosts.push(h);
  await expect(h.request("signIn")).rejects.toThrow("new sign-in");
  expect(s.read().profiles).toHaveLength(1);
  await expect(h.request("signIn")).rejects.toThrow("new sign-in");
  expect(s.read().profiles).toHaveLength(1);
});

it("cancels a pending browser sign-in without registering or replacing the active account", async () => {
  let opened!: () => void;
  const ready = new Promise<void>((r) => {
    opened = r;
  });
  const { h, s } = await authorized(vi.fn() as unknown as typeof fetch);
  Object.assign(h, {
    openBrowser: async () => {
      opened();
    },
  });
  const signingIn = h.request("signIn", { newProfile: true });
  await ready;
  await h.request("cancelSignIn");
  await expect(signingIn).rejects.toThrow("cancelled");
  expect(s.read().activeProfileId).toBe("profile-1");
  expect(s.read().profiles).toHaveLength(1);
});

it("rejects JWTs with the wrong audience, nonce, issuer, or signature", async () => {
  const t = new ChatGPTTransport(fetch, keys);
  const token = (aud: string, issuer = CHATGPT_ISSUER) =>
    new SignJWT({ nonce: "correct" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience(aud)
      .setSubject("subject")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key.privateKey);
  await expect(
    t.identity(await token("wrong"), "issued", "correct"),
  ).rejects.toThrow();
  await expect(
    t.identity(await token("issued"), "issued", "wrong"),
  ).rejects.toThrow();
  await expect(
    t.identity(
      await token("issued", "https://wrong.invalid"),
      "issued",
      "correct",
    ),
  ).rejects.toThrow();
  const valid = await token("issued"),
    parts = valid.split(".");
  parts[2] = "a".repeat(parts[2].length);
  await expect(
    t.identity(parts.join("."), "issued", "correct"),
  ).rejects.toThrow();
});

it("serializes rotating refresh tokens across simultaneous calls and preserves replacements", async () => {
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url) === CHATGPT_TOKEN) {
        expect((init?.body as URLSearchParams).get("refresh_token")).toBe(
          "synthetic-refresh",
        );
        return json({
          token_type: "Bearer",
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        });
      }
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Bearer new-access",
      );
      return models();
    },
  ) as unknown as typeof fetch;
  const { h, s } = await authorized(fetcher);
  await s.transaction((v) => {
    v.profiles[0].expiresAt = 0;
  });
  await Promise.all([
    h.request("models", { profileId: "profile-1" }),
    h.request("models", { profileId: "profile-1" }),
  ]);
  expect(
    vi
      .mocked(fetcher)
      .mock.calls.filter(([url]) => String(url) === CHATGPT_TOKEN),
  ).toHaveLength(1);
  expect(s.read().profiles[0].refreshToken).toBe("new-refresh");
});

it("requires actual plan scope and clears invalid renewable credentials", async () => {
  const fetcher = vi.fn(async () =>
    json({ error: "invalid_grant" }, 400),
  ) as unknown as typeof fetch;
  const { h, s } = await authorized(fetcher);
  await s.transaction((v) => {
    v.profiles[0].scopes = ["openid"];
  });
  await expect(h.request("models", { profileId: "profile-1" })).rejects.toThrow(
    "enable plan usage",
  );
  expect(fetcher).not.toHaveBeenCalled();
  await s.transaction((v) => {
    v.profiles[0].scopes = ["chatgpt.tokens.use.direct"];
    v.profiles[0].expiresAt = 0;
  });
  await expect(h.request("models", { profileId: "profile-1" })).rejects.toThrow(
    "new sign-in",
  );
  expect(s.read().profiles[0].refreshToken).toBeUndefined();
  expect(s.read().profiles[0].clientId).toBe("issued-client");
});

it("discovers the account model catalog and completes a direct public Responses request", async () => {
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith("/models")) return models();
      expect(String(url)).toBe(`${CHATGPT_RESOURCE}/responses`);
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        model: "test-model",
        store: false,
        stream: true,
      });
      expect(body).not.toHaveProperty("temperature");
      expect(body.input).toEqual([
        { role: "user", content: "old" },
        { role: "user", content: "Hello" },
      ]);
      return stream([delta("你好"), delta(" world"), completed], true);
    },
  ) as unknown as typeof fetch;
  const { h } = await authorized(fetcher),
    emitted: string[] = [];
  const messages: ChatGPTRequest["messages"] = [
    { role: "user", content: "old" },
    { role: "assistant", content: "sample" },
    ...request.messages,
  ];
  expect(
    await h.request("respond", { ...request, messages }, (e) =>
      emitted.push(e.text),
    ),
  ).toEqual({ text: "你好 world" });
  expect(emitted.join("")).toBe("你好 world");
  await expect(
    h.request("respond", { ...request, model: "hidden" }),
  ).rejects.toThrow("available");
});

it("never accepts partial, failed, incomplete, empty, or oversized streams as completed replies", async () => {
  for (const events of [
    [delta("partial")],
    [delta("partial"), { type: "response.incomplete" }],
    [
      delta("partial"),
      {
        type: "response.failed",
        response: {
          error: {
            code: "subscription_sharing_usage_limit_exceeded",
            message: "secret-body",
          },
        },
      },
    ],
    [completed],
    [delta("x".repeat(32001)), completed],
  ]) {
    await expect(readChatGPTStream(stream(events), () => {})).rejects.toThrow();
  }
  await expect(
    readChatGPTStream(
      stream([
        delta("partial"),
        {
          type: "response.failed",
          response: {
            error: { code: "subscription_sharing_usage_limit_exceeded" },
          },
        },
      ]),
      () => {},
    ),
  ).rejects.toThrow("Manage usage");
});

it("accepts completed SSE without Content-Type while rejecting conflicting or unframed responses", async () => {
  const response = stream([delta("OK"), completed], true);
  response.headers.delete("content-type");
  expect(await readChatGPTStream(response, () => {})).toBe("OK");
  for (const type of ["application/json", "text/html"]) {
    const conflicting = stream([delta("OK"), completed]);
    conflicting.headers.set("content-type", type);
    await expect(readChatGPTStream(conflicting, () => {})).rejects.toThrow(
      "invalid response",
    );
  }
  const plain = new Response(new TextEncoder().encode("OK"));
  plain.headers.delete("content-type");
  await expect(readChatGPTStream(plain, () => {})).rejects.toThrow(
    "did not finish",
  );
  const partial = stream([delta("partial")]);
  partial.headers.delete("content-type");
  await expect(readChatGPTStream(partial, () => {})).rejects.toThrow(
    "did not finish",
  );
});

it("signs out locally even if remote revocation fails, retaining the registration", async () => {
  const { h, s } = await authorized(
    vi.fn(
      async () => new Response("sensitive-body", { status: 503 }),
    ) as unknown as typeof fetch,
  );
  const result = await h.request("signOut", { profileId: "profile-1" });
  expect(result).toMatchObject({ revoked: false });
  expect(s.read().profiles[0]).toMatchObject({
    clientId: "issued-client",
    subject: "subject-1",
    scopes: [],
  });
  expect(s.read().profiles[0].refreshToken).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain("sensitive-body");
});

it("rejects malformed capabilities and caller-supplied endpoints before transport", async () => {
  const fetcher = vi.fn() as unknown as typeof fetch;
  const { h } = await authorized(fetcher);
  await expect(
    h.request("respond", { ...request, url: "https://other.invalid" }),
  ).rejects.toThrow();
  await expect(
    h.request("models", { profileId: "profile-1", token: "injected" }),
  ).rejects.toThrow();
  await expect(h.request("signIn", { clientId: "other" })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});

it("preserves verified identity without enabling plan calls when consent lacks the plan scope", async () => {
  const s = store();
  let nonce = "";
  const open = async (value: string) => {
    const url = new URL(value);
    nonce = url.searchParams.get("nonce")!;
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    callback.search = new URLSearchParams({
      state: url.searchParams.get("state")!,
      code: "code",
      client_id: "issued",
    }).toString();
    await fetch(callback);
  };
  const fetcher = vi.fn(async () =>
    json({
      scope: "openid email",
      id_token: await new SignJWT({ nonce })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer(CHATGPT_ISSUER)
        .setAudience("issued")
        .setSubject("subject")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(key.privateKey),
    }),
  ) as unknown as typeof fetch;
  const h = new ChatGPTHost(s, open, new ChatGPTTransport(fetcher, keys));
  hosts.push(h);
  const status = (await h.request("signIn")) as ChatGPTStatus;
  expect(status.profiles[0]).toMatchObject({ connected: true, sharing: false });
  await expect(
    h.request("models", { profileId: status.activeProfileId }),
  ).rejects.toThrow("enable plan usage");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("rejects a returning callback that swaps client registration before exchanging any code", async () => {
  const fetcher = vi.fn() as unknown as typeof fetch;
  const { h, s } = await authorized(fetcher);
  Object.assign(h, {
    openBrowser: async (value: string) => {
      const url = new URL(value),
        callback = new URL(url.searchParams.get("redirect_uri")!);
      callback.search = new URLSearchParams({
        state: url.searchParams.get("state")!,
        code: "code",
        client_id: "different",
      }).toString();
      expect((await fetch(callback)).status).toBe(400);
    },
  });
  await expect(h.request("signIn", { profileId: "profile-1" })).rejects.toThrow(
    "verified",
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(s.read().profiles[0].refreshToken).toBe("synthetic-refresh");
});
