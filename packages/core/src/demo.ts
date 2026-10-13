import type { Workspace } from "./workspace";
export function createDemoWorkspace(): Workspace {
  return {
    schemaVersion: 1,
    theme: "light",
    watchlist: ["NVDA", "AAPL", "MSFT", "GOOGL", "AMD"],
    conversations: [],
    agents: [
      {
        id: "earnings",
        name: "Earnings tracker",
        prompt: "Track earnings and guidance for $NVDA and $AMD.",
        symbols: ["NVDA", "AMD"],
        cadence: "Daily",
        active: true,
        tone: "mint",
      },
      {
        id: "portfolio",
        name: "Portfolio review",
        prompt: "Review concentration across $AAPL, $MSFT and $GOOGL.",
        symbols: ["AAPL", "MSFT", "GOOGL"],
        cadence: "Weekly",
        active: true,
        tone: "blue",
      },
      {
        id: "thesis",
        name: "Thesis watch",
        prompt: "Track evidence against the $AAPL thesis.",
        symbols: ["AAPL"],
        cadence: "Daily",
        active: true,
        tone: "peach",
      },
      {
        id: "semis",
        name: "Semiconductor watch",
        prompt: "Compare $NVDA and $AMD demand and margins.",
        symbols: ["NVDA", "AMD"],
        cadence: "Weekly",
        active: false,
        tone: "violet",
      },
    ],
    events: [
      {
        id: "sample-1",
        agentId: "earnings",
        title: "Earnings review",
        summary: "Revenue drivers, guidance and open questions.",
        createdAt: "2026-10-12T08:30:00.000Z",
      },
      {
        id: "sample-2",
        agentId: "portfolio",
        title: "Portfolio exposure",
        summary: "Shared exposure to cloud and AI spending.",
        createdAt: "2026-10-11T08:30:00.000Z",
      },
    ],
  };
}
export const sampleQuotes: Record<
  string,
  {
    name: string;
    price: number;
    change: number;
    points: number[];
    sector: string;
  }
> = {
  NVDA: {
    name: "NVIDIA",
    price: 124.8,
    change: 2.34,
    points: [25, 23, 29, 27, 34, 33, 39, 36, 43, 47, 45, 53],
    sector: "Semiconductors",
  },
  AAPL: {
    name: "Apple",
    price: 228.6,
    change: -0.42,
    points: [49, 45, 48, 43, 44, 40, 43, 36, 39, 35, 34, 36],
    sector: "Consumer technology",
  },
  MSFT: {
    name: "Microsoft",
    price: 419.2,
    change: 0.86,
    points: [28, 32, 30, 35, 33, 36, 40, 37, 43, 45, 43, 47],
    sector: "Software & cloud",
  },
  GOOGL: {
    name: "Alphabet",
    price: 174.3,
    change: 1.12,
    points: [30, 29, 33, 36, 32, 39, 38, 43, 42, 47, 46, 48],
    sector: "Internet services",
  },
  AMD: {
    name: "Advanced Micro Devices",
    price: 156.4,
    change: -1.28,
    points: [48, 53, 46, 48, 42, 45, 39, 43, 37, 39, 33, 30],
    sector: "Semiconductors",
  },
};
export const samplePositions = [
  { symbol: "NVDA", shares: 80, cost: 98.5, color: "#719f86" },
  { symbol: "MSFT", shares: 24, cost: 386, color: "#839bb7" },
  { symbol: "AAPL", shares: 40, cost: 208, color: "#c1a080" },
  { symbol: "GOOGL", shares: 36, cost: 159, color: "#a39ab8" },
];
export const agentTemplates = [
  {
    label: "Earnings & guidance",
    prompt: "Track earnings and guidance for $NVDA and $AMD.",
  },
  {
    label: "Portfolio risk",
    prompt: "Review portfolio concentration and shared exposures.",
  },
  {
    label: "Thesis changes",
    prompt: "Track evidence against my $AAPL thesis.",
  },
  {
    label: "Industry shifts",
    prompt: "Compare $MSFT and $GOOGL cloud demand.",
  },
];
export const librarySkills = [
  {
    name: "Company research",
    category: "Research",
    description: "Business, earnings and risks.",
    path: "skills/company-research-workflow",
    sections: [
      "Build a company snapshot",
      "Gather source-linked evidence",
      "Compare bull, base, and bear cases",
    ],
  },
  {
    name: "Earnings review",
    category: "Research",
    description: "Results, guidance and cash flow.",
    path: "skills/earnings-call-analysis",
    sections: [
      "Compare results with prior guidance",
      "Review cash conversion and margins",
      "Capture management commentary",
    ],
  },
  {
    name: "Valuation scenarios",
    category: "Valuation",
    description: "Compare bull, base and bear cases.",
    path: "skills/valuation-scenario-analysis",
    sections: [
      "Set a base-case narrative",
      "Expose sensitivity to assumptions",
      "Record what would invalidate the case",
    ],
  },
  {
    name: "Portfolio exposure",
    category: "Portfolio",
    description: "Concentration and shared drivers.",
    path: "skills/portfolio-exposure-review",
    sections: [
      "Review position sizing",
      "Map overlapping exposures",
      "Collect unresolved risks",
    ],
  },
];
