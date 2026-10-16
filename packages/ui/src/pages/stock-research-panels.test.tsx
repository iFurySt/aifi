import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyResearch, type ResearchDatasetView } from "@aifi/core";
import {
  Financials,
  Activity,
  FilingsTable,
  MissingData,
} from "./stock-research-panels";
const view = (data: ResearchDatasetView["data"]): ResearchDatasetView => ({
  provider: "sec",
  fetchedAt: "2026-10-15T00:00:00Z",
  sources: [],
  recordCount: data.records?.length ?? 0,
  data,
});
it("shows actual stored financial periods/values and source provenance without fixtures", () => {
  const data = emptyResearch("AAPL");
  data.datasets.facts = view({
    complete: false,
    facts: [
      {
        metric: "revenue",
        tag: "us-gaap:Revenues",
        value: "123000000000",
        unit: "USD",
        start: "2025-09-28",
        end: "2026-09-26",
        filed: "2026-10-15",
        accession: "source-accession",
        form: "10-K",
        fiscalYear: 2026,
        fiscalPeriod: "FY",
      },
    ],
  });
  const html = renderToStaticMarkup(<Financials data={data} />);
  expect(html).toContain("2026-09-26");
  expect(html).toContain("$123B");
  expect(html).toContain("SEC");
  expect(html).toContain("Partial coverage");
  expect(html).not.toContain("FY 2025");
  expect(html).not.toContain("Sample");
});
it("renders issuer insider transactions from real records without classifying withholding as a purchase", () => {
  const data = emptyResearch("AAPL");
  data.datasets.insiders = view({
    complete: false,
    records: [
      {
        name: "Example officer",
        role: "Officer",
        code: "F",
        shares: "10",
        price: "100",
        date: "2026-10-12",
        filed: "2026-10-14",
        securityKind: "nonDerivative",
      },
    ],
  });
  const html = renderToStaticMarkup(<Activity data={data} kind="insiders" />);
  expect(html).toContain("Example officer");
  expect(html).toContain("tax withholding");
  expect(html).toContain(">F<");
});
it("renders source filing links and explicit key requirements with no invented records", () => {
  const data = emptyResearch("AAPL");
  data.coverage.prices = "needs_key";
  expect(
    renderToStaticMarkup(<MissingData data={data} dataset="prices" />),
  ).toContain("API key required");
  data.datasets.filings = view({
    complete: false,
    filings: [
      {
        accession: "a",
        form: "10-K",
        reportDate: "2026-09-26",
        filed: "2026-10-15",
        accepted: "2026-10-15T12:00:00Z",
        url: "https://www.sec.gov/Archives/edgar/data/320193/test/report.htm",
      },
    ],
  });
  const html = renderToStaticMarkup(<FilingsTable data={data} />);
  expect(html).toContain("https://www.sec.gov/Archives/");
  expect(html).toContain("2026-09-26");
  expect(html).not.toContain("No filings");
});

it("shows vendor annual periods without fabricating a filing date", () => {
  const data = emptyResearch("OTHER.B");
  data.datasets.facts = {
    ...view({
      complete: false,
      facts: [
        {
          period: "annual",
          metric: "revenue",
          tag: "yahoo:annualTotalRevenue",
          unit: "USD",
          value: "123000000000",
          end: "2025-09-30",
          filed: "",
          accession: "",
          form: "",
          fiscalYear: 0,
          fiscalPeriod: "",
        },
      ],
    }),
    provider: "yahoo",
  };
  const html = renderToStaticMarkup(<Financials data={data} />);
  expect(html).toContain("2025-09-30");
  expect(html).toContain("$123B");
  expect(html).toContain("Vendor period end");
  expect(html).not.toContain("Actual period ends");
  expect(html).not.toContain("Filed  ·");
  expect(html).toContain("YAHOO");
});
