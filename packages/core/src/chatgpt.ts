import type { Message } from "./workspace";

export interface ChatGPTProfile {
  id: string;
  label: string;
  email?: string;
  connected: boolean;
  sharing: boolean;
}
export interface ChatGPTStatus {
  profiles: ChatGPTProfile[];
  activeProfileId?: string;
  signingIn: boolean;
  welcomeSeen: boolean;
}
export interface ChatGPTModel {
  slug: string;
  displayName: string;
}
export interface ChatGPTRequest {
  requestId: string;
  profileId: string;
  model: string;
  messages: Message[];
}
export type ChatGPTMethod =
  | "status"
  | "signIn"
  | "cancelSignIn"
  | "selectProfile"
  | "signOut"
  | "models"
  | "respond"
  | "cancelResponse"
  | "openUsage"
  | "acknowledgeWelcome";
export const chatGPTMethods: readonly ChatGPTMethod[] = [
  "status",
  "signIn",
  "cancelSignIn",
  "selectProfile",
  "signOut",
  "models",
  "respond",
  "cancelResponse",
  "openUsage",
  "acknowledgeWelcome",
];
export type ChatGPTResult<T> =
  { ok: true; value: T } | { ok: false; error: string };
export interface ChatGPTDelta {
  requestId: string;
  text: string;
}
export const chatGPTOutputLimit = 32000;
export function validateChatGPTRequest(
  value: unknown,
): asserts value is ChatGPTRequest {
  if (!value || typeof value !== "object") throw Error("Invalid chat request.");
  const v = value as ChatGPTRequest;
  if (
    Object.keys(v).some(
      (k) => !["requestId", "profileId", "model", "messages"].includes(k),
    ) ||
    !validChatGPTId(v.requestId) ||
    !validChatGPTId(v.profileId) ||
    typeof v.model !== "string" ||
    !/^[a-zA-Z0-9._:-]{1,160}$/.test(v.model) ||
    !Array.isArray(v.messages) ||
    !v.messages.length ||
    v.messages.length > 100 ||
    v.messages.some(
      (m) =>
        !m ||
        typeof m !== "object" ||
        Object.keys(m).some(
          (k) => !["role", "content", "source"].includes(k),
        ) ||
        !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        !m.content.trim() ||
        m.content.length > (m.role === "user" ? 2000 : chatGPTOutputLimit),
    ) ||
    v.messages.at(-1)?.role !== "user" ||
    v.messages.reduce((n, m) => n + m.content.length, 0) > 100000
  )
    throw Error("Chat is too long or invalid. Start a new chat.");
}
export const validChatGPTId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
