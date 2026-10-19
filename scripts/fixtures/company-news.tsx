// Synthetic local snapshots, settings and empty states; no network or credentials.
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import {
  emptyResearch,
  researchDatasets,
  type ResearchConfig,
  type DirectoryEntry,
} from "@aifi/core";
import "../../packages/ui/src/styles.css";
const config: ResearchConfig = {
  revision: 0,
  newsSource: "yahoo",
  priceSource: "yahoo",
  automatic: true,
  historyDays: 730,
  datasets: Object.fromEntries(
    researchDatasets.map((d) => [d, { enabled: true, intervalHours: 24 }]),
  ) as ResearchConfig["datasets"],
  limits: {
    massive: { perMinute: 5, perDay: 200 },
    sec: { perMinute: 240, perDay: 10000 },
    fmp: { perMinute: 4, perDay: 200 },
    yahoo: { perMinute: 20, perDay: 10000 },
    nasdaq: { perMinute: 20, perDay: 10000 },
    thirteenf: { perMinute: 12, perDay: 2000 },
    congress: { perMinute: 6, perDay: 450 },
  },
};
const fixture = { config, calls: [] as string[] };
Object.assign(window, { newsFixture: fixture });
window.aifiDesktop = {
  getRuntimeInfo: async () => ({
    kind: "desktop",
    platform: "darwin",
    version: "fixture",
  }),
  onChatGPTDelta: () => () => {},
  requestData: async (method, params) => {
    fixture.calls.push(method);
    if (method === "status")
      return {
        settings: {
          revision: 0,
          directoryEnabled: true,
          automatic: false,
          intervalHours: 24,
          secUserAgent: "",
        },
        directory: {
          snapshotId: "fixture",
          rows: 3,
          candidates: 3,
          sources: [],
          recentRuns: [],
        },
        running: false,
        queued: false,
        offline: true,
        credentials: [],
        dataDir: "fixture",
        databaseBytes: 0,
      };
    if (method === "research.status")
      return {
        config: fixture.config,
        universe: 3,
        priced: 0,
        progress: [],
        providers: [],
      };
    if (method === "research.settings") {
      fixture.config = {
        ...(params as ResearchConfig),
        revision: fixture.config.revision + 1,
      };
      return fixture.config;
    }
    throw Error("Unsupported fixture action");
  },
};
const entries: DirectoryEntry[] = ["AAPL", "EMPTY", "OFF"].map((symbol) => ({
  id: symbol,
  symbol,
  name: `Fixture ${symbol}`,
  exchangeCode: "Q",
  source: "fixture",
  securityType: "stock",
}));
location.hash = "/stocks/AAPL?tab=chart";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (q) => ({
        snapshotId: "fixture",
        scope: "candidates",
        offset: q.offset,
        total: 3,
        items: entries,
      }),
      get: async (symbol) => ({
        snapshotId: "fixture",
        item: entries.find((e) => e.symbol === symbol) ?? null,
      }),
    }}
    logos={{ get: async () => null }}
    stockResearch={{
      get: async (symbol) => {
        const d = emptyResearch(symbol);
        if (symbol === "OFF") {
          d.coverage.news = "disabled";
          return d;
        }
        d.datasets.news = {
          provider: "yahoo",
          fetchedAt: "2026-10-19T15:00:00Z",
          sources: [
            "https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL&region=US&lang=en-US",
          ],
          recordCount: symbol === "EMPTY" ? 0 : 4,
          data: {
            complete: false,
            window: "Latest public ticker RSS window",
            records:
              symbol === "EMPTY"
                ? []
                : [
                    {
                      title: "Older headline",
                      publishedDate: "2026-10-18T14:00:00Z",
                      url: "https://finance.yahoo.com/news/older.html",
                      publisher: "Yahoo Finance",
                    },
                    {
                      title: "Latest company development",
                      publishedDate: "2026-10-19T14:34:20Z",
                      url: "https://finance.yahoo.com/news/latest.html",
                      publisher: "Yahoo Finance",
                      text: "A short source-provided snippet.",
                    },
                    {
                      title: "Duplicate headline",
                      publishedDate: "2026-10-19T14:34:20Z",
                      url: "https://finance.yahoo.com/news/latest.html",
                    },
                    {
                      title: "Unsafe link stays plain",
                      publishedDate: "2026-10-17T14:00:00Z",
                      url: "javascript:alert(1)",
                    },
                  ],
          },
        };
        return d;
      },
    }}
  />,
);
