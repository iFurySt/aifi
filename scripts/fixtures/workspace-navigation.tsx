// Isolated renderer fixture: no auth, provider requests, real storage or credentials.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch, type DirectoryEntry } from "@aifi/core";
import "../../packages/ui/src/styles.css";

window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    version: "test",
    platform: "darwin",
  }),
  requestData: async () => {
    throw Error("Synthetic data service unavailable.");
  },
};
const entries: DirectoryEntry[] = Array.from({ length: 12 }, (_, i) => ({
  id: `fixture-${i}`,
  symbol: `TEST${i}`,
  name: `Company ${i} with a long security description that must stay on one line rather than stretching the search dialog`,
  exchangeCode: "Q",
  source: "fixture",
  securityType: "stock",
}));
location.hash = "/settings/general";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (query) => ({
        scope: "candidates",
        snapshotId: "fixture",
        offset: query.offset,
        total: entries.length,
        items: entries,
      }),
      get: async (symbol) => ({
        snapshotId: "fixture",
        item: entries.find((e) => e.symbol === symbol) ?? null,
      }),
    }}
    logos={{ get: async () => null }}
    stockResearch={{ get: async (symbol) => emptyResearch(symbol) }}
  />,
);
