import { randomUUID } from "node:crypto";
import {
  chatGPTMethods,
  validChatGPTId,
  validateChatGPTRequest,
  type ChatGPTMethod,
  type ChatGPTStatus,
  type ChatGPTModel,
  type ChatGPTDelta,
} from "../../core/src/chatgpt";
import { ChatGPTStore, type SavedProfile } from "./chatgpt-store";
import { startChatGPTSignIn } from "./chatgpt-oauth";
import {
  ChatGPTTransport,
  ChatGPTError,
  CHATGPT_TOKEN,
  CHATGPT_RESOURCE,
  CHATGPT_REVOKE,
  CHATGPT_USAGE,
  readChatGPTStream,
  providerError,
} from "./chatgpt-transport";

function clearTokens(p: SavedProfile) {
  delete p.accessToken;
  delete p.refreshToken;
  delete p.idToken;
  p.scopes = [];
  p.expiresAt = 0;
  delete p.earliestRefreshAt;
}
function applyTokens(
  p: SavedProfile,
  data: Record<string, unknown>,
  refresh = false,
) {
  if (
    data.access_token &&
    data.token_type !== "Bearer" &&
    data.token_type !== "bearer"
  )
    throw Error("Invalid ChatGPT token response.");
  if (typeof data.scope !== "string" && !refresh)
    throw Error("ChatGPT did not return granted permissions.");
  const scopes =
    typeof data.scope === "string"
      ? data.scope.split(/\s+/).filter(Boolean)
      : p.scopes;
  if (
    scopes.includes("chatgpt.tokens.use.direct") &&
    (typeof data.access_token !== "string" ||
      !data.access_token ||
      typeof data.expires_in !== "number" ||
      data.expires_in <= 0 ||
      data.expires_in > 86400)
  )
    throw Error("ChatGPT did not return valid plan credentials.");
  if (
    refresh &&
    (typeof data.refresh_token !== "string" || !data.refresh_token)
  )
    throw Error("ChatGPT did not renew the connection. Sign in again.");
  p.accessToken =
    typeof data.access_token === "string" ? data.access_token : undefined;
  p.refreshToken =
    typeof data.refresh_token === "string" ? data.refresh_token : undefined;
  if (typeof data.id_token === "string") p.idToken = data.id_token;
  p.scopes = scopes;
  p.expiresAt =
    Date.now() +
    (typeof data.expires_in === "number" ? data.expires_in * 1000 : 0);
  p.earliestRefreshAt =
    typeof data.earliest_refresh_at === "number"
      ? data.earliest_refresh_at * 1000
      : undefined;
}
function profileId(params: unknown) {
  if (
    !params ||
    typeof params !== "object" ||
    Object.keys(params).length !== 1 ||
    !validChatGPTId((params as { profileId?: unknown }).profileId)
  )
    throw Error("Choose a valid ChatGPT account.");
  return (params as { profileId: string }).profileId;
}

/** Desktop-owned capability. All external endpoints and browser destinations
 * are fixed here; no credential or arbitrary URL crosses the preload bridge. */
export class ChatGPTHost {
  private signingIn?: AbortController;
  private response?: { id: string; controller: AbortController };
  private models = new Map<
    string,
    { expires: number; value: ChatGPTModel[] }
  >();
  private ready: Promise<unknown>;
  private disposed = false;
  private pending = new Set<Promise<unknown>>();
  constructor(
    readonly store: ChatGPTStore,
    private openBrowser: (url: string) => Promise<unknown>,
    private transport = new ChatGPTTransport(),
  ) {
    this.ready = store.transaction(() => {});
    void this.ready.catch(() => {});
  }
  async status(): Promise<ChatGPTStatus> {
    await this.ready;
    const s = this.store.read();
    return {
      activeProfileId: s.activeProfileId,
      welcomeSeen: s.welcomeSeen,
      signingIn: !!this.signingIn,
      profiles: s.profiles.map((p, i) => ({
        id: p.id,
        label: `${p.name || p.email || "Connection"} · ${i + 1}`,
        email: p.email,
        connected: !!p.subject && !!(p.accessToken || p.idToken),
        sharing:
          !!p.accessToken && p.scopes.includes("chatgpt.tokens.use.direct"),
      })),
    };
  }
  private async credentials(id: string, signal: AbortSignal) {
    return this.store.transaction(async (s) => {
      const p = s.profiles.find((p) => p.id === id);
      if (
        !p?.accessToken ||
        !p.subject ||
        !p.scopes.includes("chatgpt.tokens.use.direct")
      )
        throw Error(
          "Connect your ChatGPT account and enable plan usage first.",
        );
      if (p.expiresAt <= Date.now() + 30000) {
        if (!p.refreshToken) {
          clearTokens(p);
          throw providerError("invalid_grant");
        }
        if (p.earliestRefreshAt && p.earliestRefreshAt > Date.now()) {
          if (p.expiresAt <= Date.now())
            throw Error("ChatGPT connection is renewing. Try again shortly.");
          return p.accessToken;
        }
        try {
          const data = await this.transport.json(
            CHATGPT_TOKEN,
            {
              method: "POST",
              body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: p.clientId,
                refresh_token: p.refreshToken,
                resource: CHATGPT_RESOURCE,
              }),
            },
            signal,
          );
          // Preserve rotated credentials before any subsequent ID-token check.
          const previous = p.subject;
          applyTokens(p, data, true);
          if (data.id_token) {
            try {
              const identity = await this.transport.identity(
                data.id_token,
                p.clientId,
              );
              if (identity.subject !== previous)
                throw Error("ChatGPT account changed. Sign in again.");
            } catch (e) {
              clearTokens(p);
              throw e;
            }
          }
        } catch (e) {
          if (e instanceof ChatGPTError && e.code === "sign_in") clearTokens(p);
          throw e;
        }
      }
      if (!p.accessToken || !p.scopes.includes("chatgpt.tokens.use.direct"))
        throw Error("Enable ChatGPT plan usage first.");
      return p.accessToken;
    });
  }
  private async signIn(params: unknown) {
    if (this.signingIn || this.response)
      throw Error("Finish or cancel the current ChatGPT request first.");
    const args = params as
      { profileId?: string; newProfile?: boolean } | undefined;
    if (
      args &&
      (typeof args !== "object" ||
        Object.keys(args).some(
          (k) => !["profileId", "newProfile"].includes(k),
        ) ||
        (args.profileId !== undefined && !validChatGPTId(args.profileId)) ||
        (args.newProfile !== undefined &&
          typeof args.newProfile !== "boolean") ||
        (args.profileId && args.newProfile))
    )
      throw Error("Invalid ChatGPT sign-in request.");
    const controller = new AbortController();
    this.signingIn = controller;
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    try {
      const s = this.store.read();
      const old = args?.newProfile
        ? undefined
        : (s.profiles.find(
            (p) => p.id === (args?.profileId ?? s.activeProfileId),
          ) ??
          (!args?.profileId ? s.profiles.find((p) => !p.subject) : undefined));
      if (args?.profileId && !old) throw Error("ChatGPT account not found.");
      if (!old && s.profiles.length >= 20)
        throw Error("This device has reached its ChatGPT connection limit.");
      const id = old?.id ?? randomUUID();
      const result = await startChatGPTSignIn({
        hostId: s.hostId,
        clientId: old?.clientId,
        idToken: old?.idToken,
        signal: controller.signal,
        openBrowser: this.openBrowser,
        onRegistration: async (clientId) => {
          await this.store.transaction((state) => {
            if (!state.profiles.some((p) => p.id === id))
              state.profiles.push({ id, clientId, scopes: [], expiresAt: 0 });
          });
        },
      });
      const data = await this.transport.json(
        CHATGPT_TOKEN,
        {
          method: "POST",
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: result.clientId,
            code: result.code,
            code_verifier: result.verifier,
            redirect_uri: result.redirectUri,
            resource: CHATGPT_RESOURCE,
          }),
        },
        controller.signal,
      );
      if (typeof data.id_token !== "string")
        throw Error("ChatGPT did not return a verified identity.");
      const identity = await this.transport.identity(
        data.id_token,
        result.clientId,
        result.nonce,
      );
      controller.signal.throwIfAborted();
      if (old?.subject && identity.subject !== old.subject)
        throw Error(
          "This is a different ChatGPT account. Use Add account instead.",
        );
      await this.store.transaction((state) => {
        const p = state.profiles.find((p) => p.id === id)!;
        const next = { ...p, ...identity };
        applyTokens(next, data);
        Object.assign(p, next);
        state.activeProfileId = id;
      });
      this.models.delete(id);
    } finally {
      clearTimeout(timeout);
      this.signingIn = undefined;
    }
    return this.status();
  }
  private async listModels(id: string, signal = AbortSignal.timeout(30000)) {
    const token = await this.credentials(id, signal);
    const data = await this.transport.json(
      `${CHATGPT_RESOURCE}/models`,
      { headers: { Authorization: `Bearer ${token}` } },
      signal,
    );
    if (!Array.isArray(data.models))
      throw Error("ChatGPT model list is unavailable. Reconnect or try again.");
    const models: ChatGPTModel[] = data.models
      .filter(
        (m: Record<string, unknown>) =>
          m &&
          m.visibility === "list" &&
          typeof m.slug === "string" &&
          /^[\w.:-]{1,160}$/.test(m.slug) &&
          typeof m.display_name === "string",
      )
      .slice(0, 200)
      .map((m: { slug: string; display_name: string }) => ({
        slug: m.slug,
        displayName: m.display_name.slice(0, 160),
      }));
    this.models.set(id, { expires: Date.now() + 60000, value: models });
    return models;
  }
  private async respond(params: unknown, emit: (event: ChatGPTDelta) => void) {
    validateChatGPTRequest(params);
    if (this.response || this.signingIn)
      throw Error("Finish or cancel the current ChatGPT request first.");
    if (this.store.read().activeProfileId !== params.profileId)
      throw Error("ChatGPT account changed. Try again.");
    const controller = new AbortController();
    this.response = { id: params.requestId, controller };
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const cached = this.models.get(params.profileId);
      const models =
        cached && cached.expires > Date.now()
          ? cached.value
          : await this.listModels(params.profileId, controller.signal);
      if (!models.some((m) => m.slug === params.model))
        throw Error("Choose an available ChatGPT model.");
      const token = await this.credentials(params.profileId, controller.signal);
      const response = await this.transport.fetcher(
        `${CHATGPT_RESOURCE}/responses`,
        {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: params.model,
            store: false,
            stream: true,
            instructions:
              "You are AIFi's investment research assistant. Separate facts, interpretations, risks and open questions. Do not invent current prices, filings, sources or tool access. No market data or research tools are attached to this chat yet. Say when evidence is missing. Provide research support; do not place trades.",
            input: params.messages
              .filter((m) => m.role === "user" || m.source === "chatgpt")
              .map(({ role, content }) => ({ role, content })),
          }),
        },
      );
      const text = await readChatGPTStream(response, (text) =>
        emit({ requestId: params.requestId, text }),
      );
      controller.signal.throwIfAborted();
      return { text };
    } finally {
      clearTimeout(timeout);
      this.response = undefined;
    }
  }
  request(
    method: ChatGPTMethod,
    params?: unknown,
    emit: (event: ChatGPTDelta) => void = () => {},
  ): Promise<unknown> {
    const operation = this.dispatch(method, params, emit);
    this.pending.add(operation);
    void operation
      .finally(() => this.pending.delete(operation))
      .catch(() => {});
    return operation;
  }
  private async dispatch(
    method: ChatGPTMethod,
    params: unknown,
    emit: (event: ChatGPTDelta) => void,
  ): Promise<unknown> {
    if (!chatGPTMethods.includes(method) || this.disposed)
      throw Error("ChatGPT capability unavailable.");
    try {
      await this.ready;
      if (this.disposed) throw Error("ChatGPT capability unavailable.");
      if (method === "status") return this.status();
      if (method === "signIn") return await this.signIn(params);
      if (method === "cancelSignIn") {
        this.signingIn?.abort();
        return;
      }
      if (method === "cancelResponse") {
        const id = (params as { requestId?: unknown })?.requestId;
        if (!validChatGPTId(id)) throw Error("Invalid chat request.");
        if (this.response?.id === id) this.response.controller.abort();
        return;
      }
      if (method === "openUsage") {
        await this.openBrowser(CHATGPT_USAGE);
        return;
      }
      if (method === "acknowledgeWelcome") {
        await this.store.transaction((s) => {
          s.welcomeSeen = true;
        });
        return;
      }
      if (method === "respond") return await this.respond(params, emit);
      const id = profileId(params);
      if (method === "models") return await this.listModels(id);
      if (this.response || this.signingIn)
        throw Error("Finish or cancel the current ChatGPT request first.");
      if (method === "selectProfile") {
        await this.store.transaction((s) => {
          if (!s.profiles.some((p) => p.id === id))
            throw Error("ChatGPT account not found.");
          s.activeProfileId = id;
        });
        this.models.clear();
        return this.status();
      }
      if (method === "signOut") {
        let revoked = true;
        await this.store.transaction(async (s) => {
          const p = s.profiles.find((p) => p.id === id);
          if (!p) throw Error("ChatGPT account not found.");
          try {
            if (p.refreshToken) {
              const response = await this.transport.fetcher(CHATGPT_REVOKE, {
                method: "POST",
                redirect: "error",
                signal: AbortSignal.timeout(10000),
                body: new URLSearchParams({
                  token: p.refreshToken,
                  token_type_hint: "refresh_token",
                  client_id: p.clientId,
                }),
              });
              revoked = response.status === 200;
              await response.body?.cancel();
            }
          } catch {
            revoked = false;
          } finally {
            clearTokens(p);
          }
        });
        this.models.delete(id);
        return { revoked, status: await this.status() };
      }
    } catch (e) {
      if (e instanceof ChatGPTError) throw e;
      if (
        e instanceof Error &&
        (e.name === "AbortError" || e.name === "TimeoutError")
      )
        throw Error("ChatGPT request was cancelled or timed out.");
      // Local validation errors are safe; external transport/JWT errors may
      // contain URLs/claims, so only allow our known, fixed messages.
      if (
        e instanceof Error &&
        /^(ChatGPT |Chat |Choose |Connect |Enable |Finish |This |Your |Invalid chat|Reply |Unsafe |Invalid credential)/.test(
          e.message,
        )
      )
        throw e;
      throw Error(
        "ChatGPT connection failed. Try again or reconnect your account.",
      );
    }
  }
  cancelPending() {
    this.signingIn?.abort();
    this.response?.controller.abort();
  }
  async dispose() {
    this.disposed = true;
    this.cancelPending();
    await Promise.allSettled([...this.pending, this.ready]);
  }
}
