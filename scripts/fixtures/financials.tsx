// Synthetic, isolated financial history. No providers, OAuth or personal data.
import React from "react";
import { createRoot } from "react-dom/client";
import { emptyResearch, type FinancialFact } from "@aifi/core";
import { Financials } from "../../packages/ui/src/pages/Financials";
import "../../packages/ui/src/styles.css";
const data = emptyResearch("TEST");
const facts: FinancialFact[] = [];
for (let i = 0; i < 24; i++) {
  const year = 2020 + Math.floor(i / 4),
    quarter = i % 4;
  const end = new Date(Date.UTC(year, quarter * 3 + 3, 0))
    .toISOString()
    .slice(0, 10);
  const start = new Date(Date.UTC(year, quarter * 3, 1))
    .toISOString()
    .slice(0, 10);
  const values: Record<string, number> = {
    revenue: 1000 + i * 10,
    grossProfit: 500 + i * 5,
    netIncome: 200 + i * 2,
    eps: 2 + i * 0.02,
    researchAndDevelopment: 50,
    weightedSharesBasic: 100,
    operatingCashFlow: 300,
    capex: 50,
    assets: 2000,
    currentAssets: 500,
    currentLiabilities: 300,
    liabilities: 1000,
    equity: 1000,
  };
  for (const [metric, value] of Object.entries(values)) {
    const instant = [
      "assets",
      "currentAssets",
      "currentLiabilities",
      "liabilities",
      "equity",
    ].includes(metric);
    const base = {
      metric,
      tag: `us-gaap:${metric}`,
      unit:
        metric === "eps"
          ? "USD/shares"
          : metric === "weightedSharesBasic"
            ? "shares"
            : "USD",
      value: String(value),
      end,
      filed: `${year + 1}-02-01`,
      accession: "fixture",
      form: quarter === 3 ? "10-K" : "10-Q",
      fiscalYear: year,
      fiscalPeriod: `Q${quarter + 1}`,
    };
    facts.push({ ...base, ...(!instant ? { start } : {}) });
    if (quarter === 3 && !instant)
      facts.push({ ...base, start: `${year}-01-01`, value: String(value * 4) });
  }
}
data.datasets.facts = {
  provider: "sec",
  fetchedAt: "2026-10-17T00:00:00Z",
  sources: ["https://data.sec.gov/api/xbrl/companyfacts/CIK0000000123.json"],
  recordCount: facts.length,
  data: { version: 1, complete: false, facts },
};
const root = createRoot(document.getElementById("root")!);
const render = (zero = false) =>
  root.render(
    <main
      style={{
        background: "var(--canvas)",
        minHeight: "100vh",
        maxWidth: "100vw",
      }}
    >
      <Financials
        data={
          zero
            ? {
                ...data,
                datasets: {
                  facts: {
                    ...data.datasets.facts!,
                    data: {
                      ...data.datasets.facts!.data,
                      facts: facts.map((f) => ({ ...f, value: "0" })),
                    },
                  },
                },
              }
            : data
        }
      />
    </main>,
  );
Object.assign(window, { financialFixture: { zero: () => render(true) } });
render();
