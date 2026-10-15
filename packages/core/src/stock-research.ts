import type { DailyBar } from "./stocks";
export const researchDatasets = [
  "prices",
  "profile",
  "filings",
  "facts",
  "actions",
  "insiders",
  "funds",
  "politicians",
  "analyst",
  "news",
] as const;
export type ResearchDataset = (typeof researchDatasets)[number];
export interface ResearchConfig {
  revision: number;
  automatic: boolean;
  historyDays: number;
  datasets: Record<
    ResearchDataset,
    { enabled: boolean; intervalHours: number }
  >;
  limits: Record<
    "massive" | "sec" | "fmp",
    { perMinute: number; perDay: number }
  >;
}
export interface CompanyProfile {
  symbol?: string;
  name: string;
  cik?: string;
  description?: string;
  industry?: string;
  website?: string;
  currency?: string;
  type?: string;
  shares?: number;
  sharesDate?: string;
}
export interface FinancialFact {
  metric: string;
  tag: string;
  unit: string;
  value: string;
  start?: string;
  end: string;
  filed: string;
  accession: string;
  form: string;
  fiscalYear: number;
  fiscalPeriod: string;
}
export interface CompanyFiling {
  accession: string;
  form: string;
  reportDate: string;
  filed: string;
  accepted: string;
  url: string;
}
export type ResearchRecord = Record<string, unknown>;
export interface ResearchPayload {
  profile?: CompanyProfile;
  facts?: FinancialFact[];
  filings?: CompanyFiling[];
  records?: ResearchRecord[];
  window?: string;
  complete: boolean;
}
export interface ResearchDatasetView {
  provider: string;
  fetchedAt: string;
  sources: string[];
  recordCount: number;
  data: ResearchPayload;
}
export interface StockResearch {
  symbol: string;
  bars: DailyBar[];
  basis: "raw";
  datasets: Partial<Record<ResearchDataset, ResearchDatasetView>>;
  coverage: Partial<Record<ResearchDataset, string>>;
}
export interface ResearchStatus {
  config: ResearchConfig;
  universe: number;
  priced: number;
  progress: {
    dataset: string;
    total: number;
    stored: number;
    failed: number;
    blocked: number;
    running: number;
    lastError?: string;
  }[];
  providers: {
    provider: string;
    calls: number;
    day: string;
    cooldown: string;
    blocked: string;
  }[];
}
/** Domain reader is independent of local IPC, SQLite and future sync sources. */
export interface StockResearchRepository {
  get(symbol: string): Promise<StockResearch>;
}
export const emptyResearch = (symbol: string): StockResearch => ({
  symbol,
  bars: [],
  basis: "raw",
  datasets: {},
  coverage: {},
});

export function splitAdjustedBars(data: StockResearch): {
  bars: DailyBar[];
  adjusted: boolean;
} {
  const actions = data.datasets.actions;
  if (!actions?.data.complete) return { bars: data.bars, adjusted: false };
  const splits = (actions.data.records ?? []).filter(
    (r) => r.kind === "splits",
  );
  return {
    adjusted: true,
    bars: data.bars.map((b) => {
      let factor = 1;
      for (const s of splits) {
        const from = Number(s.split_from),
          to = Number(s.split_to),
          date = String(s.execution_date ?? "");
        // Ignore future announced actions until a stored session reaches them.
        if (
          date > b.date &&
          date <= (data.bars.at(-1)?.date ?? "") &&
          from > 0 &&
          to > 0
        )
          factor *= from / to;
      }
      return {
        ...b,
        open: b.open * factor,
        high: b.high * factor,
        low: b.low * factor,
        close: b.close * factor,
        volume: b.volume / factor,
      };
    }),
  };
}
const day = (s: string) => Date.parse(`${s}T00:00:00Z`) / 86400000;
export interface FinancialPoint {
  end: string;
  value: number;
  filed: string;
  accession: string;
  derived: boolean;
}
function metricFacts(facts: FinancialFact[], metric: string) {
  const unit =
    metric === "shares" ? "shares" : metric === "eps" ? "USD/shares" : "USD";
  const precedence: Record<string, number> = {
    "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax": 3,
    "us-gaap:Revenues": 2,
    "us-gaap:SalesRevenueNet": 1,
  };
  const rows = new Map<string, FinancialFact>();
  for (const f of facts) {
    if (
      f.metric !== metric ||
      f.unit !== unit ||
      !Number.isFinite(Number(f.value))
    )
      continue;
    const key = `${f.start ?? ""}/${f.end}`,
      old = rows.get(key);
    if (
      !old ||
      f.filed > old.filed ||
      (f.filed === old.filed &&
        (precedence[f.tag] ?? 0) > (precedence[old.tag] ?? 0))
    )
      rows.set(key, f);
  }
  return [...rows.values()];
}
/** Preserve actual fiscal dates. Derive a quarter only from matching YTD start
 * dates; never divide an annual total by four or label a calendar quarter FY. */
export function financialSeries(
  facts: FinancialFact[],
  metric: string,
  period: "Yearly" | "Quarter",
): FinancialPoint[] {
  const rows = metricFacts(facts, metric),
    points = new Map<string, FinancialPoint>();
  const put = (f: FinancialFact, value: number, derived = false) => {
    const old = points.get(f.end);
    if (
      !old ||
      (!derived && old.derived) ||
      (old.derived === derived && f.filed > old.filed)
    )
      points.set(f.end, {
        end: f.end,
        value,
        filed: f.filed,
        accession: f.accession,
        derived,
      });
  };
  for (const f of rows) {
    const duration = f.start ? day(f.end) - day(f.start) + 1 : 0;
    if (!f.start) {
      put(f, Number(f.value));
      continue;
    }
    if (
      (period === "Yearly" && duration >= 330 && duration <= 380) ||
      (period === "Quarter" && duration >= 70 && duration <= 115)
    )
      put(f, Number(f.value));
    if (
      period === "Quarter" &&
      duration > 115 &&
      duration <= 380 &&
      metric !== "eps"
    ) {
      const prior = rows
        .filter(
          (p) =>
            p.start === f.start &&
            p.end < f.end &&
            day(f.end) - day(p.end) >= 70 &&
            day(f.end) - day(p.end) <= 115,
        )
        .sort((a, b) => b.end.localeCompare(a.end))[0];
      if (prior) put(f, Number(f.value) - Number(prior.value), true);
    }
  }
  return [...points.values()].sort((a, b) => b.end.localeCompare(a.end));
}
export function trailingMetric(
  facts: FinancialFact[],
  metric: string,
): { value: number; end: string; basis: string } | undefined {
  const quarters = financialSeries(facts, metric, "Quarter").slice(0, 4);
  if (
    quarters.length === 4 &&
    quarters.every(
      (p, i) =>
        i === 0 ||
        (day(quarters[i - 1]!.end) - day(p.end) >= 70 &&
          day(quarters[i - 1]!.end) - day(p.end) <= 115),
    )
  )
    return {
      value: quarters.reduce((v, p) => v + p.value, 0),
      end: quarters[0]!.end,
      basis: "TTM",
    };
  const annual = financialSeries(facts, metric, "Yearly")[0];
  return annual
    ? { value: annual.value, end: annual.end, basis: "Annual" }
    : undefined;
}
export function priceMetrics(bars: DailyBar[]) {
  const latest = bars.at(-1);
  const candidatePrevious = bars.at(-2);
  const previous =
    latest &&
    candidatePrevious &&
    day(latest.date) - day(candidatePrevious.date) <= 7
      ? candidatePrevious
      : undefined;
  if (!latest) return {};
  const cutoff = new Date(`${latest.date}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const history = bars.filter(
    (b) => b.date >= cutoff.toISOString().slice(0, 10),
  );
  const year = latest.date.slice(0, 4),
    priorYear = [...bars].reverse().find((b) => b.date.slice(0, 4) < year);
  const yearAgo = [...bars]
    .reverse()
    .find((b) => b.date <= cutoff.toISOString().slice(0, 10));
  let rsi: number | undefined;
  if (bars.length >= 15) {
    let gain = 0,
      loss = 0;
    for (let i = 1; i <= 14; i++) {
      const delta = bars[i]!.close - bars[i - 1]!.close;
      gain += Math.max(0, delta) / 14;
      loss += Math.max(0, -delta) / 14;
    }
    for (let i = 15; i < bars.length; i++) {
      const delta = bars[i]!.close - bars[i - 1]!.close;
      gain = (gain * 13 + Math.max(0, delta)) / 14;
      loss = (loss * 13 + Math.max(0, -delta)) / 14;
    }
    rsi =
      gain === 0 && loss === 0
        ? 50
        : loss === 0
          ? 100
          : 100 - 100 / (1 + gain / loss);
  }
  return {
    latest,
    previous,
    change: previous ? (latest.close / previous.close - 1) * 100 : undefined,
    ytd:
      priorYear && day(`${year}-01-01`) - day(priorYear.date) <= 7
        ? (latest.close / priorYear.close - 1) * 100
        : undefined,
    yearChange:
      yearAgo && day(cutoff.toISOString().slice(0, 10)) - day(yearAgo.date) <= 7
        ? (latest.close / yearAgo.close - 1) * 100
        : undefined,
    high52:
      yearAgo && history.length >= 240
        ? Math.max(...history.map((b) => b.high))
        : undefined,
    low52:
      yearAgo && history.length >= 240
        ? Math.min(...history.map((b) => b.low))
        : undefined,
    rsi,
  };
}

/** Only primary public research hosts may open outside the desktop sandbox. */
export function isResearchSourceURL(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      value.length <= 2048 &&
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      [
        "www.sec.gov",
        "data.sec.gov",
        "investor.apple.com",
        "www.apple.com",
        "api.massive.com",
        "massive.com",
        "financialmodelingprep.com",
        "site.financialmodelingprep.com",
      ].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
