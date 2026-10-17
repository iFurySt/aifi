import { Analysts } from "../../packages/ui/src/pages/Analysts";
import React from "react";
import { createRoot } from "react-dom/client";
import { emptyResearch } from "@aifi/core";
import { Insiders } from "../../packages/ui/src/pages/Insiders";
import { Politicians } from "../../packages/ui/src/pages/Politicians";
import "../../packages/ui/src/styles.css";
const data = emptyResearch("TEST");
const records = [
  {
    id: "1",
    name: "Example Buyer",
    chamber: "house",
    type: "buy",
    transactionDate: "2026-10-01",
    disclosureDate: "2026-10-10",
    amount: "$1,001 - $15,000",
    url: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/123.pdf",
  },
  {
    id: "2",
    name: "Example Seller",
    chamber: "senate",
    type: "sell",
    transactionDate: "2026-09-20",
    disclosureDate: "2026-10-02",
    amount: "$15,001 - $50,000",
  },
  {
    id: "3",
    name: "Ambiguous Member",
    chamber: "house",
    type: "buy",
    transactionDate: "2026-10-01",
    disclosureDate: "2026-10-10",
    amount: "$1,001 - $15,000",
    ambiguousDuplicate: true,
  },
];
data.datasets.politicians = {
  provider: "congress",
  fetchedAt: "2026-10-18T00:00:00Z",
  recordCount: records.length,
  sources: [
    "https://congressinfor-production.up.railway.app/trades/TEST?limit=100&offset=0",
  ],
  data: { version: 1, records, complete: false },
};
const insiderData = emptyResearch("INSIDER");
const insider = {
  name: "Example Officer",
  date: "2026-10-01",
  filed: "2026-10-02",
  code: "S",
  direction: "D",
  shares: "10",
  price: "12.50",
  sharesAfter: "90",
  securityKind: "nonDerivative",
  url: "https://www.sec.gov/Archives/edgar/data/123/000000012326000001/form4.xml",
};
const insiderRecords = [
  { ...insider, id: "sale" },
  { ...insider, id: "award", code: "A", direction: "A" },
  { ...insider, id: "derivative", securityKind: "derivative" },
  { ...insider, id: "amend", amendment: true },
  { ...insider, id: "old", superseded: true },
  { ...insider, id: "unpriced", name: "Unpriced Officer", price: "" },
];
insiderData.datasets.insiders = {
  provider: "sec",
  fetchedAt: "2026-10-18T00:00:00Z",
  recordCount: insiderRecords.length,
  sources: ["https://data.sec.gov/submissions/CIK0000000123.json"],
  data: { version: 2, records: insiderRecords, complete: false },
};
const analystData = emptyResearch("ANALYST");
const analystRecords = [
  {
    recordKind: "price-target-consensus",
    targetConsensus: 120,
    targetLow: 80,
    targetHigh: 140,
    analystCount: 39,
    recommendation: "buy",
    recommendationMean: 2.2,
  },
  {
    recordKind: "recommendations",
    period: "0m",
    strongBuy: 6,
    buy: 19,
    hold: 13,
    sell: 3,
    strongSell: 3,
  },
  {
    recordKind: "grades",
    date: "2026-10-01",
    gradingCompany: "Example Firm",
    newGrade: "Buy",
    previousGrade: "Hold",
    action: "main",
    currentPriceTarget: 120,
    priorPriceTarget: 110,
  },
  {
    recordKind: "grades",
    date: "2026-10-02",
    gradingCompany: "Another Firm",
    newGrade: "Sell",
    action: "down",
    currentPriceTarget: 80,
    analystName: "Example Analyst",
  },
  {
    recordKind: "grades",
    date: "2026-10-03",
    gradingCompany: "Missing Target",
    action: "reit",
    currentPriceTarget: 0,
  },
];
analystData.datasets.analyst = {
  provider: "yahoo",
  fetchedAt: "2026-10-18T00:00:00Z",
  recordCount: analystRecords.length,
  sources: ["https://finance.yahoo.com/quote/TEST/analysis/"],
  data: {
    version: 3,
    records: analystRecords,
    complete: false,
    quote: { price: 100, asOf: "2026-10-17T20:00:00Z" },
  },
};
const root = createRoot(document.getElementById("root")!);
function render(empty = false, kind = "politicians") {
  root.render(
    <main
      style={{
        background: "var(--canvas)",
        minHeight: "100vh",
        maxWidth: "100vw",
      }}
    >
      {kind === "analyst" ? (
        <Analysts data={empty ? emptyResearch("EMPTY") : analystData} />
      ) : kind === "insiders" ? (
        <Insiders data={empty ? emptyResearch("EMPTY") : insiderData} />
      ) : (
        <Politicians data={empty ? emptyResearch("EMPTY") : data} />
      )}
    </main>,
  );
}
Object.assign(window, {
  activityFixture: {
    analyst: () => render(false, "analyst"),
    insiders: () => render(false, "insiders"),
    restore: () => render(),
    empty: () => render(true),
  },
});
render();
