// Synthetic ownership histories. No provider traffic or personal account data.
import React from "react";
import { createRoot } from "react-dom/client";
import { emptyResearch } from "@aifi/core";
import { Funds } from "../../packages/ui/src/pages/Funds";
import "../../packages/ui/src/styles.css";
const data = emptyResearch("TEST");
const point = (name: string, date: string, shares: number, more = {}) => ({
  recordKind: "holding",
  holderKind: "institution",
  holderId: name.toLowerCase(),
  name,
  reportDate: date,
  shares,
  current: true,
  observedAt: "2026-10-17T00:00:00Z",
  ...more,
});
const records = [
  point("Alpha manager", "2026-06-30", 100, {
    changePercent: 10,
    ownershipPercent: 2,
    value: 35000,
  }),
  point("Alpha manager", "2026-03-31", 90, { current: false }),
  point("Alpha manager", "2025-12-31", 80, { current: false }),
  point("Beta manager", "2026-06-30", 200, { changePercent: 0 }),
  point("Earlier sample", "2026-03-31", 75, { current: false }),
  point(
    "Monthly fund with a deliberately long descriptive investment name",
    "2026-08-31",
    50,
    { holderKind: "fund", changePercent: -2 },
  ),
  point(
    "Monthly fund with a deliberately long descriptive investment name",
    "2026-06-30",
    60,
    { holderKind: "fund", current: false },
  ),
];
data.datasets.funds = {
  provider: "yahoo",
  fetchedAt: "2026-10-17T00:00:00Z",
  recordCount: records.length,
  sources: ["https://finance.yahoo.com/quote/TEST/holders/"],
  data: {
    version: 1,
    complete: false,
    records,
    ownership: {
      institutionsPercent: 66.35,
      institutionsCount: 7695,
      floatPercent: 67.46,
    },
    window: "Synthetic top-holder sample",
  },
};
const root = createRoot(document.getElementById("root")!);
function render(empty = false, zero = false) {
  root.render(
    <main
      style={{
        background: "var(--canvas)",
        minHeight: "100vh",
        maxWidth: "100vw",
      }}
    >
      <Funds
        data={
          empty
            ? emptyResearch("EMPTY")
            : zero
              ? {
                  ...data,
                  datasets: {
                    funds: {
                      ...data.datasets.funds!,
                      data: {
                        ...data.datasets.funds!.data,
                        records: records.map((r) => ({ ...r, shares: 0 })),
                      },
                    },
                  },
                }
              : data
        }
      />
    </main>,
  );
}
Object.assign(window, {
  fundsFixture: {
    empty: () => render(true),
    zero: () => render(false, true),
    restore: () => render(),
  },
});
render();
