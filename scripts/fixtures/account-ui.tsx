// Synthetic account state only; never touches a real account or opens OAuth.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch, type ChatGPTProfile } from "@aifi/core";
import "../../packages/ui/src/styles.css";

const accountFixture = {
  signIns: 0,
  usageOpens: 0,
  profiles: [] as ChatGPTProfile[],
  activeProfileId: undefined as string | undefined,
  calls: [] as { method: string; params?: unknown }[],
  holdSignIn: false,
  failSignIn: false,
  pending: undefined as (() => void) | undefined,
};
const profile = (id: string, name: string): ChatGPTProfile => ({
  id,
  label: `${name} · 1`,
  name,
  email: `${id}@example.invalid`,
  connected: true,
  sharing: true,
});
Object.assign(window, { accountFixture });
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    version: "test",
    platform: "darwin",
  }),
  requestData: async () => {
    throw Error("Fixture data service unavailable.");
  },
  onChatGPTDelta: () => () => {},
  requestChatGPT: async (method, params) => {
    accountFixture.calls.push({ method, params });
    const args = params as
      { profileId?: string; newProfile?: boolean } | undefined;
    if (method === "status")
      return {
        ok: true,
        value: {
          activeProfileId: accountFixture.activeProfileId,
          welcomeSeen: true,
          signingIn: !!accountFixture.pending,
          profiles: accountFixture.profiles.map((p) => ({ ...p })),
        },
      };
    if (method === "models")
      return {
        ok: true,
        value: [{ slug: "fixture-model", displayName: "Fixture model" }],
      };
    if (method === "signIn") {
      accountFixture.signIns++;
      if (accountFixture.holdSignIn) {
        await new Promise<void>((resolve) => {
          accountFixture.pending = resolve;
        });
        accountFixture.pending = undefined;
        return { ok: true, value: undefined };
      }
      if (accountFixture.failSignIn)
        return { ok: false, error: "Synthetic sign-in failed. Try again." };
      const id = args?.profileId || (args?.newProfile ? "second" : "test");
      let next = accountFixture.profiles.find((p) => p.id === id);
      if (!next) {
        next = profile(id, id === "second" ? "Second User" : "Test User");
        accountFixture.profiles.push(next);
      }
      next.connected = true;
      next.sharing = true;
      accountFixture.activeProfileId = id;
    }
    if (method === "cancelSignIn") accountFixture.pending?.();
    if (method === "selectProfile")
      accountFixture.activeProfileId = args!.profileId;
    if (method === "signOut") {
      const selected = accountFixture.profiles.find(
        (p) => p.id === args?.profileId,
      )!;
      selected.connected = false;
      selected.sharing = false;
      return { ok: true, value: { revoked: true } };
    }
    if (method === "openUsage") accountFixture.usageOpens++;
    return { ok: true, value: undefined };
  },
};
location.hash = "/settings/general";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (query) => ({
        scope: "candidates",
        snapshotId: "fixture",
        offset: query.offset,
        total: 0,
        items: [],
      }),
      get: async () => ({ snapshotId: "fixture", item: null }),
    }}
    logos={{ get: async () => null }}
    stockResearch={{ get: async (symbol) => emptyResearch(symbol) }}
  />,
);
