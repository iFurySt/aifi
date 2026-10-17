import React from "react";
import { createRoot } from "react-dom/client";
import { emptyResearch } from "@aifi/core";
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
const root = createRoot(document.getElementById("root")!);
function render(empty = false) {
  root.render(
    <main
      style={{
        background: "var(--canvas)",
        minHeight: "100vh",
        maxWidth: "100vw",
      }}
    >
      <Politicians data={empty ? emptyResearch("EMPTY") : data} />
    </main>,
  );
}
Object.assign(window, {
  activityFixture: { restore: () => render(), empty: () => render(true) },
});
render();
