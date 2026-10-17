// Synthetic local repositories only: no credentials, authorization or providers.
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../packages/ui/src/App";
import {
  emptyResearch,
  type DirectoryEntry,
  type ResearchDatasetView,
} from "@aifi/core";
import "../../packages/ui/src/styles.css";

if (new URLSearchParams(location.search).get("host") !== "web")
  window.aifiDesktop = {
    getRuntimeInfo: async () => ({
      kind: "desktop",
      version: "fixture",
      platform: "darwin",
    }),
    requestData: async () => {
      throw Error("Fixture data bridge unavailable.");
    },
    onChatGPTDelta: () => () => {},
  };
const entries: DirectoryEntry[] = [
  {
    id: "AAPL",
    symbol: "AAPL",
    name: "Fixture Apple with a deliberately long company name for narrow headers",
    exchangeCode: "Q",
    source: "nasdaqlisted",
    securityType: "stock",
  },
  {
    id: "MSFT",
    symbol: "MSFT",
    name: "Fixture Microsoft",
    exchangeCode: "Q",
    source: "nasdaqlisted",
    securityType: "stock",
  },
  ...Array.from({ length: 108 }, (_, i) => ({
    id: `S${i}`,
    symbol: `S${i}`,
    name: `Fixture company ${i}`,
    exchangeCode: "Q",
    source: "nasdaqlisted",
    securityType: "stock",
  })),
];
const view = (data: ResearchDatasetView["data"]): ResearchDatasetView => ({
  provider: "fixture",
  fetchedAt: "2026-10-17T00:00:00Z",
  sources: [],
  recordCount: 1,
  data,
});
const empty = new URLSearchParams(location.search).has("empty");
const extraDatasets = empty
  ? {}
  : {
      facts: view({
        facts: Array.from({ length: 8 }, (_, i) => {
          const year = 2025 + Math.floor(i / 4),
            quarter = i % 4;
          return {
            metric: "revenue",
            tag: "us-gaap:Revenues",
            unit: "USD",
            value: String(1000 + i * 50),
            start: new Date(Date.UTC(year, quarter * 3, 1))
              .toISOString()
              .slice(0, 10),
            end: new Date(Date.UTC(year, quarter * 3 + 3, 0))
              .toISOString()
              .slice(0, 10),
            fiscalYear: year,
            fiscalPeriod: `Q${quarter + 1}`,
            form: "10-Q",
          };
        }),
      }),
      funds: view({
        records: [
          {
            recordKind: "holding",
            holderKind: "institution",
            holderId: "alpha",
            name: "An exceptionally long synthetic investment manager name",
            reportDate: "2026-06-30",
            shares: 100,
            current: true,
          },
          {
            recordKind: "holding",
            holderKind: "institution",
            holderId: "alpha",
            name: "An exceptionally long synthetic investment manager name",
            reportDate: "2026-03-31",
            shares: 80,
            current: false,
          },
        ],
      }),
      politicians: view({
        records: [
          {
            id: "fixture",
            name: "A deliberately long synthetic politician name",
            chamber: "house",
            type: "buy",
            transactionDate: "2026-10-01",
            amount: "$1,001 - $15,000",
          },
        ],
      }),
      insiders: view({
        records: [
          {
            id: "fixture",
            name: "A deliberately long synthetic officer name",
            date: "2026-10-01",
            code: "S",
            direction: "D",
            shares: "10",
            price: "12.5",
            securityKind: "nonDerivative",
          },
        ],
      }),
      analyst: view({
        records: [
          {
            recordKind: "price-target-consensus",
            targetConsensus: 140,
            targetLow: 100,
            targetHigh: 170,
            analystCount: 20,
            recommendationMean: 2.1,
            recommendation: "buy",
          },
          {
            recordKind: "recommendations",
            count: 20,
            strongSell: 1,
            sell: 2,
            hold: 3,
            buy: 10,
            strongBuy: 4,
          },
          {
            recordKind: "grades",
            date: "2026-10-01",
            gradingCompany:
              "An exceptionally long synthetic research firm name",
            previousGrade: "Hold",
            newGrade: "Buy",
            action: "upgrade",
          },
        ],
      }),
    };
location.hash = "/stocks/AAPL?tab=chart";
createRoot(document.getElementById("root")!).render(
  <App
    directory={{
      search: async (q) => {
        const rows = entries.filter((e) =>
          (e.symbol + " " + e.name)
            .toLowerCase()
            .includes(q.query.toLowerCase()),
        );
        return {
          scope: "candidates",
          snapshotId: "fixture",
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
      get: async (symbol) => ({
        ...emptyResearch(symbol),
        bars: Array.from({ length: 300 }, (_, i) => ({
          date: new Date(Date.UTC(2025, 11, i + 1)).toISOString().slice(0, 10),
          open: 100 + i / 10,
          close: 101 + i / 10,
          high: 103 + i / 10,
          low: 99 + i / 10,
          volume: 1000000 + i * 1000,
        })),
        datasets: {
          ...extraDatasets,
          profile: view({
            complete: true,
            profile: {
              symbol,
              name: entries.find((e) => e.symbol === symbol)?.name,
              description:
                "Synthetic company information remains available at every window width. ".repeat(
                  6,
                ),
              sector: "Technology",
              industry: "Software",
              currency: "USD",
            },
          }),
        },
      }),
    }}
  />,
);
