// Synthetic prices and deferred local reads. No collection, credentials or OAuth.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch, type DirectoryEntry } from "@aifi/core";
import "../../packages/ui/src/styles.css";
let release!: () => void;
const pending = new Promise<void>((resolve) => {
  release = resolve;
});
const fixture = { release, reads: [] as string[], dataCalls: [] as string[] };
Object.assign(window, { chartFixture: fixture });
const entries: DirectoryEntry[] = ["AAPL", "MSFT", "BAD", "RAW"].map(
  (symbol) => ({
    id: symbol,
    symbol,
    name: symbol === "AAPL" ? "Fixture Apple" : `Fixture ${symbol}`,
    exchangeCode: "Q",
    source: "fixture",
    securityType: "stock",
  }),
);
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    platform: "darwin",
    version: "fixture",
  }),
  requestData: async (method) => {
    fixture.dataCalls.push(method);
    throw Error("No data actions permitted");
  },
  onChatGPTDelta: () => () => {},
};
location.hash = "/stocks/AAPL?tab=chart";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (q) => {
        const rows = entries.filter((e) =>
          `${e.symbol} ${e.name}`.toLowerCase().includes(q.query.toLowerCase()),
        );
        return {
          snapshotId: "fixture",
          scope: "candidates",
          offset: q.offset,
          total: rows.length,
          items: rows.slice(q.offset, q.offset + q.limit),
        };
      },
      get: async (symbol) => ({
        snapshotId: "fixture",
        item: entries.find((e) => e.symbol === symbol) ?? null,
      }),
    }}
    logos={{ get: async () => null }}
    stockResearch={{
      get: async (symbol) => {
        fixture.reads.push(symbol);
        if (symbol === "MSFT") await pending;
        const data = emptyResearch(symbol);
        data.basis = symbol === "RAW" ? "raw" : "split-adjusted";
        if (symbol !== "BAD")
          data.bars = Array.from({ length: 700 }, (_, i) => {
            const close =
              (symbol === "MSFT" ? 200 + i * 0.5 : 100 + i * 0.2) +
              Math.sin(i / 12) * 6;
            return {
              date: new Date(Date.UTC(2024, 10, i + 1))
                .toISOString()
                .slice(0, 10),
              open: close - 1,
              close,
              high: close + 3,
              low: close - 2,
              volume: 100000 + i * 200,
            };
          });
        data.datasets.prices = {
          provider: "yahoo",
          fetchedAt: "2026-10-18T00:00:00Z",
          recordCount: data.bars.length,
          sources: [],
          data: { complete: true },
        };
        data.datasets.profile = {
          provider: "fixture",
          fetchedAt: "2026-10-18T00:00:00Z",
          recordCount: 1,
          sources: [],
          data: { profile: { name: `Fixture ${symbol}` } },
        };
        return data;
      },
    }}
  />,
);
