// Delayed local reads only. No SQLite writes, credentials or provider traffic.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch, type DirectoryEntry } from "@aifi/core";
import "../../packages/ui/src/styles.css";
let releaseDirectory!: () => void, releaseLogos!: () => void;
const directoryGate = new Promise<void>((r) => {
  releaseDirectory = r;
});
const logoGate = new Promise<void>((r) => {
  releaseLogos = r;
});
const stats = {
  reads: 0,
  logos: 0,
  logoDone: false,
  failed: false,
  time: 0,
  releaseDirectory: () => releaseDirectory(),
  releaseLogos: () => releaseLogos(),
};
Object.assign(window, { reentry: stats });
const realNow = Date.now;
Date.now = () => realNow() + stats.time;
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    platform: "fixture",
    version: "fixture",
  }),
  requestData: async () => {
    throw Error("Fixture bridge unavailable");
  },
  onChatGPTDelta: () => () => {},
};
const entries: DirectoryEntry[] = Array.from({ length: 110 }, (_, i) => ({
  id: i === 0 ? "AAPL" : `S${i}`,
  symbol: i === 0 ? "AAPL" : `S${i}`,
  name: i === 0 ? "Apple" : `Company ${i}`,
  source: "fixture",
  exchangeCode: "Q",
  securityType: "stock",
}));
location.hash = "/settings/appearance";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App
      directory={{
        search: async (query) => {
          stats.reads++;
          await directoryGate;
          if (stats.failed) throw Error("Offline local read");
          const rows =
            query.collection === "nasdaq100" ? entries.slice(0, 30) : entries;
          return {
            scope: "candidates",
            snapshotId: `local-${query.collection ?? "all-us"}`,
            offset: query.offset,
            total: rows.length,
            items: rows.slice(query.offset, query.offset + query.limit),
          };
        },
        get: async (symbol) => ({
          snapshotId: "local",
          item: entries.find((e) => e.symbol === symbol) ?? null,
        }),
      }}
      logos={{
        get: async () => null,
        getCached: async () => {
          stats.logos++;
          await logoGate;
          stats.logoDone = true;
          return [];
        },
      }}
      stockResearch={{ get: async (symbol) => emptyResearch(symbol) }}
    />
  </React.StrictMode>,
);
