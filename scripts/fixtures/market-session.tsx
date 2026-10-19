// Clock-only UI regression with Friday's persisted data. No network/collection.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import { emptyResearch, type DirectoryEntry } from "@aifi/core";
import "../../packages/ui/src/styles.css";
const fixture = {
  now: Date.parse("2026-10-19T13:29:59.900Z"),
  calls: [] as string[],
};
Date.now = () => fixture.now;
Object.assign(window, { marketFixture: fixture });
const item: DirectoryEntry = {
  id: "AAPL",
  symbol: "AAPL",
  name: "Apple",
  exchangeCode: "Q",
  source: "fixture",
  securityType: "stock",
};
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    platform: "darwin",
    version: "fixture",
  }),
  requestData: async (method) => {
    fixture.calls.push(method);
    throw Error("Read-only fixture");
  },
  onChatGPTDelta: () => () => {},
};
location.hash = "/stocks/AAPL?tab=chart";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (q) => ({
        snapshotId: "fixture",
        scope: "candidates",
        offset: q.offset,
        total: 1,
        items: [item],
      }),
      get: async () => ({ snapshotId: "fixture", item }),
    }}
    logos={{ get: async () => null }}
    stockResearch={{
      get: async (symbol) => {
        const data = emptyResearch(symbol);
        data.basis = "split-adjusted";
        data.bars = [
          {
            date: "2026-10-16",
            open: 342,
            high: 345,
            low: 340,
            close: 343.46,
            volume: 1000,
          },
        ];
        data.datasets.prices = {
          provider: "yahoo",
          fetchedAt: "2026-10-17T04:00:00Z",
          sources: [],
          recordCount: 1,
          data: {
            quote: {
              price: 343.46,
              previousClose: 342,
              asOf: "2026-10-16T20:00:01Z",
              state: "CLOSED",
              sessionStart: Date.parse("2026-10-16T13:30:00Z") / 1000,
              sessionEnd: Date.parse("2026-10-16T20:00:00Z") / 1000,
            },
          },
        };
        return data;
      },
    }}
  />,
);
