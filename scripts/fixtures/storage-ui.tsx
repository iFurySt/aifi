// Isolated renderer against a disposable, offline Go/Node data host.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch } from "@aifi/core";
import "../../packages/ui/src/styles.css";
const bridge = (
  window as unknown as { storageBridge: NonNullable<Window["aifiDesktop"]> }
).storageBridge;
const fixture = { fail: false, reads: 0, web: false, delay: 80 };
Object.assign(window, { storageFixture: fixture });
window.aifiDesktop = {
  ...bridge,
  getRuntimeInfo: async () => ({
    kind: fixture.web ? "web" : "desktop",
    version: "test",
    platform: "darwin",
  }),
  requestData: async (method, params) => {
    if (method === "storage.read") {
      fixture.reads++;
      await new Promise((resolve) => setTimeout(resolve, fixture.delay));
      if (fixture.fail) throw Error("Synthetic read failure");
    }
    return bridge.requestData(method, params);
  },
  onChatGPTDelta: () => () => {},
  requestChatGPT: async () => ({ ok: false, error: "Offline fixture" }),
};
location.hash = "/settings/storage";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (q) => ({
        scope: "candidates",
        snapshotId: "fixture",
        offset: q.offset,
        total: 0,
        items: [],
      }),
      get: async () => ({ snapshotId: "fixture", item: null }),
    }}
    logos={{ get: async () => null }}
    stockResearch={{ get: async (symbol) => emptyResearch(symbol) }}
  />,
);
