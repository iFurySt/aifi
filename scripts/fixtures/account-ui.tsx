// Synthetic account state only; never touches a real account or opens OAuth.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch } from "@aifi/core";
import "../../packages/ui/src/styles.css";

const accountFixture = { connected: false, signIns: 0, usageOpens: 0 };
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
  requestChatGPT: async (method) => {
    if (method === "status")
      return {
        ok: true,
        value: {
          activeProfileId: accountFixture.connected ? "fixture" : undefined,
          welcomeSeen: true,
          signingIn: false,
          profiles: accountFixture.connected
            ? [
                {
                  id: "fixture",
                  label: "Test User · 1",
                  name: "Test User",
                  email: "test@example.invalid",
                  connected: true,
                  sharing: true,
                },
              ]
            : [],
        },
      };
    if (method === "models")
      return {
        ok: true,
        value: [{ slug: "fixture-model", displayName: "Fixture model" }],
      };
    if (method === "signIn") {
      accountFixture.signIns++;
      accountFixture.connected = true;
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
