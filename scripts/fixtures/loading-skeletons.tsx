// Deferred synthetic reads only: no accounts, SQLite writes, network or collection.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import {
  emptyResearch,
  type DirectoryEntry,
  type ResearchDatasetView,
} from "@aifi/core";
import "../../packages/ui/src/styles.css";
const gates = new Map<
  string,
  { promise: Promise<void>; resolve: () => void; reject: (e: Error) => void }
>();
const hold = (key: string) => {
  let resolve!: () => void, reject!: (e: Error) => void;
  const promise = new Promise<void>((a, b) => {
    resolve = a;
    reject = b;
  });
  void promise.catch(() => {});
  gates.set(key, { promise, resolve, reject });
};
for (const key of [
  "directory",
  "identity",
  "research",
  "logos",
  "status",
  "models",
  "settings",
  "sync",
  "storage",
  "files",
  "details",
  "usage",
])
  hold(key);
const fixture = {
  empty: false,
  calls: {} as Record<string, number>,
  hold,
  release: (key: string) => gates.get(key)!.resolve(),
  fail: (key: string) =>
    gates.get(key)!.reject(Error(`Synthetic ${key} read failure`)),
};
const wait = async (key: string) => {
  fixture.calls[key] = (fixture.calls[key] ?? 0) + 1;
  await gates.get(key)!.promise;
};
Object.assign(window, { loadingFixture: fixture });
const entries: DirectoryEntry[] = Array.from({ length: 80 }, (_, i) => ({
  id: i ? `S${i}` : "AAPL",
  symbol: i ? `S${i}` : "AAPL",
  name: i ? `Fixture company ${i}` : "Fixture Apple",
  source: "fixture",
  exchangeCode: "Q",
  securityType: "stock",
}));
const view = (data: ResearchDatasetView["data"]): ResearchDatasetView => ({
  provider: "fixture",
  fetchedAt: "2026-10-18T00:00:00Z",
  sources: [],
  recordCount: 1,
  data,
});
const settings = {
  settings: {
    revision: 0,
    directoryEnabled: false,
    automatic: false,
    intervalHours: 24,
    secUserAgent: "",
  },
  directory: { rows: 80, candidates: 80, recentRuns: [] },
  credentials: [],
  running: false,
  queued: false,
  offline: true,
  lastSuccess: "",
  nextSync: "",
};
const files = Array.from({ length: 2 }, (_, i) => ({
  kind: "file",
  relativePath: `fixture-${i}.db`,
  fileCount: 1,
  bytes: 512,
  category: "database",
}));
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    version: "fixture",
    platform: "darwin",
  }),
  onChatGPTDelta: () => () => {},
  requestChatGPT: async (method) => {
    if (method === "status") {
      await wait("status");
      return {
        ok: true,
        value: {
          profiles: [
            {
              id: "fixture",
              label: "Fixture",
              name: "Fixture User",
              email: "fixture@example.invalid",
              connected: true,
              sharing: true,
            },
          ],
          activeProfileId: "fixture",
          welcomeSeen: true,
          signingIn: false,
        },
      };
    }
    if (method === "models") {
      await wait("models");
      return {
        ok: true,
        value: [{ slug: "fixture-model", displayName: "Fixture model" }],
      };
    }
    throw Error("Actions are disabled in the loading fixture");
  },
  requestData: async (method) => {
    if (method === "status") {
      await wait("settings");
      return settings;
    }
    if (method === "research.status") {
      await wait("sync");
      throw Error("Synthetic sync read failure");
    }
    if (method === "storage.read") {
      await wait("storage");
      return {
        snapshotId: "fixture",
        offset: 0,
        dataDir: "/fixture",
        scannedAt: "2026-10-18T00:00:00Z",
        totalBytes: 1024,
        fileCount: 2,
        entryCount: 2,
        categories: [{ id: "database", label: "Database", bytes: 1024 }],
        files: files.slice(0, 1),
        database: { bytes: 0, categories: [], pending: true },
      };
    }
    if (method === "storage.files") {
      await wait("files");
      return { snapshotId: "fixture", offset: 1, files: files.slice(1) };
    }
    if (method === "storage.details") {
      await wait("details");
      return {
        bytes: 1024,
        categories: [{ id: "prices", label: "Prices", bytes: 1024 }],
        pending: false,
      };
    }
    // Optional feature: the same fixture covers Usage whenever that route exists.
    if ((method as string) === "usage.read") {
      await wait("usage");
      const summary = Object.fromEntries(
        [
          "requests",
          "succeeded",
          "failed",
          "cancelled",
          "interrupted",
          "running",
          "measured",
          "inputTokens",
          "outputTokens",
          "totalTokens",
          "cachedTokens",
          "reasoningTokens",
          "cachedMeasured",
          "reasoningMeasured",
          "durationMs",
          "longestMs",
        ].map((k) => [k, 0]),
      );
      return {
        summary: { key: "all", ...summary },
        daily: [],
        models: [],
        efforts: [],
        accounts: [],
        conversations: [],
        conversationCount: 0,
        activeDays: 0,
        currentStreak: 0,
        longestStreak: 0,
        peakDailyTokens: 0,
        timezone: "UTC",
        fromDay: "2026-10-18",
        throughDay: "2026-10-18",
      };
    }
    throw Error(`Unsupported fixture read ${method}`);
  },
};
const params = new URLSearchParams(location.search);
location.hash = params.get("route") || "/stocks/AAPL?tab=chart";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (query) => {
        await wait("directory");
        return {
          scope: "candidates",
          snapshotId: "fixture",
          offset: query.offset,
          total: fixture.empty ? 0 : entries.length,
          items: fixture.empty
            ? []
            : entries.slice(query.offset, query.offset + query.limit),
        };
      },
      get: async (symbol) => {
        await wait("identity");
        return {
          snapshotId: "fixture",
          item: entries.find((e) => e.symbol === symbol) ?? null,
        };
      },
    }}
    logos={{
      get: async () => {
        await wait("logos");
        return null;
      },
      getCached: async () => {
        await wait("logos");
        return [];
      },
    }}
    stockResearch={{
      get: async (symbol) => {
        await wait("research");
        const data = emptyResearch(symbol);
        if (!fixture.empty) {
          data.bars = Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.UTC(2026, 8, i + 1)).toISOString().slice(0, 10),
            open: 100 + i,
            high: 104 + i,
            low: 99 + i,
            close: 102 + i,
            volume: 1000 + i * 100,
          }));
          data.datasets.profile = view({
            profile: {
              name: "Fixture Apple",
              description: "A synthetic company for local loading checks.",
            },
          });
        }
        return data;
      },
    }}
  />,
);
