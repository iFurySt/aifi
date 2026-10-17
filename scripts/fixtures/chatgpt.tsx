// Synthetic transport only: no real credentials, browser authorization or inference.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch } from "@aifi/core";
import "../../packages/ui/src/styles.css";
// Synthetic desktop capability for renderer regression only. It never opens a
// browser, reads a real credential, or sends inference requests.
const chatListeners = new Set<
  (value: { requestId: string; text: string }) => void
>();
const chatFixture = { failure: false, cancelled: false, delay: 40 };
Object.assign(window, { chatFixture });
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "web",
    version: "test",
    platform: "fixture",
  }),
  requestData: async () => {
    throw Error("Fixture data bridge is unavailable.");
  },
  onChatGPTDelta: (callback) => {
    chatListeners.add(callback);
    return () => chatListeners.delete(callback);
  },
  requestChatGPT: async (method, params) => {
    if (method === "status")
      return {
        ok: true,
        value: {
          activeProfileId: "fixture-profile",
          welcomeSeen: true,
          signingIn: false,
          profiles: [
            {
              id: "fixture-profile",
              label: "Test account",
              email: "test@example.invalid",
              connected: true,
              sharing: true,
            },
          ],
        },
      };
    if (method === "models")
      return {
        ok: true,
        value: [{ slug: "fixture-model", displayName: "Fixture model" }],
      };
    if (method === "cancelResponse") {
      chatFixture.cancelled = true;
      return { ok: true, value: undefined };
    }
    if (method === "respond") {
      chatFixture.cancelled = false;
      const { requestId } = params as { requestId: string };
      await new Promise((resolve) => setTimeout(resolve, chatFixture.delay));
      for (const listener of chatListeners)
        listener({ requestId, text: "Synthetic streamed reply." });
      await new Promise((resolve) => setTimeout(resolve, chatFixture.delay));
      return chatFixture.cancelled || chatFixture.failure
        ? { ok: false, error: "Synthetic interrupted response." }
        : { ok: true, value: { text: "Synthetic streamed reply." } };
    }
    return { ok: true, value: undefined };
  },
};

location.hash = "/research";
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
