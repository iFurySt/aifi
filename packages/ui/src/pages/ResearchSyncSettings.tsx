import { Select } from "../components/Select";
import { useEffect, useState } from "react";
import {
  researchDatasets,
  researchProvider,
  type ResearchConfig,
  type ResearchDataset,
  type ResearchStatus,
} from "@aifi/core";
import {
  readResearchStatus,
  saveResearchConfig,
  syncResearch,
} from "@aifi/platform";
import { Button } from "../components/primitives";
import { useWorkspace } from "../workspace-context";
const names: Record<ResearchDataset, string> = {
  prices: "Daily prices",
  profile: "Company profiles",
  filings: "SEC filings",
  facts: "Financial statements",
  actions: "Splits & dividends",
  insiders: "Insider transactions",
  funds: "Institutional holdings",
  politicians: "Politician trades",
  analyst: "Analyst ratings",
  earnings: "Earnings & estimates",
  peers: "Related stocks",
  news: "Company news",
};
const sources: Record<ResearchDataset, string> = {
  prices: "Massive · Market sessions",
  profile: "Massive · Listings",
  filings: "SEC · Issuers",
  facts: "SEC · Issuers",
  actions: "Massive · Market batch",
  insiders: "SEC · Issuers",
  funds: "FMP · Listings",
  politicians: "FMP · Listings",
  analyst: "FMP · Listings",
  earnings: "Yahoo Finance · No key",
  peers: "Yahoo Finance · No key",
  news: "FMP · Listings",
};
function DatasetRow({
  dataset,
  config,
  status,
  disabled,
  save,
  sourceState,
}: {
  sourceState?: string;
  dataset: ResearchDataset;
  config: ResearchConfig;
  status?: ResearchStatus["progress"][number];
  disabled: boolean;
  save: (c: ResearchConfig) => Promise<void>;
}) {
  const v = config.datasets[dataset],
    [hours, setHours] = useState(String(v.intervalHours));
  useEffect(() => setHours(String(v.intervalHours)), [v.intervalHours]);
  return (
    <div className="setting-row research-dataset-row">
      <div>
        <strong>{names[dataset]}</strong>
        <p>
          {researchProvider(config, dataset) === "congress"
            ? "CongressInvests · No API key"
            : researchProvider(config, dataset) === "thirteenf"
              ? "13f.info · Reported history · No API key"
              : researchProvider(config, dataset) === "yahoo"
                ? "Yahoo Finance · No API key"
                : sources[dataset]}
          {status
            ? ` · ${status.stored.toLocaleString()} / ${status.total.toLocaleString()} synced`
            : ""}
        </p>
        {sourceState && (
          <p>
            {(
              {
                needs_key: "API key required",
                needs_contact: "SEC contact required",
                access_denied: "Source access required",
                invalid_key: "Check API key",
              } as Record<string, string>
            )[sourceState] ?? sourceState}
          </p>
        )}
        {status?.lastError && (
          <p>
            {status.blocked
              ? "Access required"
              : status.running
                ? "Syncing…"
                : "Retry pending"}
          </p>
        )}
      </div>
      <div className="setting-control">
        <input
          className="interval-input"
          aria-label={`${names[dataset]} interval hours`}
          type="number"
          min={1}
          max={2160}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          disabled={disabled}
        />
        <span>h</span>
        <Button
          disabled={
            disabled ||
            !Number.isInteger(Number(hours)) ||
            Number(hours) < 1 ||
            Number(hours) > 2160 ||
            Number(hours) === v.intervalHours
          }
          onClick={() =>
            void save({
              ...config,
              datasets: {
                ...config.datasets,
                [dataset]: { ...v, intervalHours: Number(hours) },
              },
            })
          }
        >
          Save
        </Button>
        <button
          className={`setting-switch ${v.enabled ? "on" : ""}`}
          role="switch"
          aria-label={`Sync ${names[dataset]}`}
          aria-checked={v.enabled}
          disabled={disabled}
          onClick={() =>
            void save({
              ...config,
              datasets: {
                ...config.datasets,
                [dataset]: { ...v, enabled: !v.enabled },
              },
            })
          }
        >
          <span />
        </button>
      </div>
    </div>
  );
}
function BudgetRow({
  provider,
  config,
  busy,
  save,
}: {
  provider:
    "massive" | "sec" | "fmp" | "yahoo" | "thirteenf" | "congress" | "nasdaq";
  config: ResearchConfig;
  busy: boolean;
  save: (c: ResearchConfig) => Promise<void>;
}) {
  const limit =
      config.limits[provider] ??
      (provider === "nasdaq"
        ? { perMinute: 20, perDay: 10000 }
        : provider === "congress"
          ? { perMinute: 6, perDay: 450 }
          : { perMinute: 12, perDay: 2000 }),
    [rpm, setRPM] = useState(String(limit.perMinute)),
    [daily, setDaily] = useState(String(limit.perDay));
  useEffect(() => {
    setRPM(String(limit.perMinute));
    setDaily(String(limit.perDay));
  }, [limit.perMinute, limit.perDay]);
  const valid =
    Number.isInteger(Number(rpm)) &&
    Number(rpm) >= 1 &&
    Number(rpm) <= 300 &&
    Number.isInteger(Number(daily)) &&
    Number(daily) >= 1 &&
    Number(daily) <= 1000000;
  return (
    <div className="setting-row">
      <div>
        <strong>
          {provider === "thirteenf"
            ? "13f.info"
            : provider === "congress"
              ? "CongressInvests"
              : provider.toUpperCase()}
        </strong>
        <p>
          {provider === "nasdaq" ||
          provider === "yahoo" ||
          provider === "thirteenf" ||
          provider === "congress"
            ? "Public endpoint · Personal research"
            : "Match your account limits."}
        </p>
      </div>
      <div className="setting-control">
        <label className="quota-input">
          <input
            className="interval-input"
            type="number"
            aria-label={`${provider} requests per minute`}
            min={1}
            max={300}
            value={rpm}
            onChange={(e) => setRPM(e.target.value)}
            disabled={busy}
          />{" "}
          / min
        </label>
        <label className="quota-input">
          <input
            className="interval-input"
            type="number"
            aria-label={`${provider} requests per day`}
            min={1}
            max={1000000}
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            disabled={busy}
          />{" "}
          / day
        </label>
        <Button
          disabled={
            busy ||
            !valid ||
            (Number(rpm) === limit.perMinute && Number(daily) === limit.perDay)
          }
          onClick={() =>
            void save({
              ...config,
              limits: {
                ...config.limits,
                [provider]: { perMinute: Number(rpm), perDay: Number(daily) },
              },
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
export function ResearchSyncSettings() {
  const [state, setState] = useState<ResearchStatus>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { notify } = useWorkspace();
  async function refresh() {
    try {
      const s = await readResearchStatus();
      setState((old) =>
        old && old.config.revision > s.config.revision ? old : s,
      );
      setError("");
    } catch {
      setError("Research service unavailable.");
    }
  }
  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const s = await readResearchStatus();
        if (active) {
          setState((old) =>
            old && old.config.revision > s.config.revision ? old : s,
          );
          setError("");
        }
      } catch {
        if (active) setError("Research service unavailable.");
      }
    };
    void read();
    const timer = setInterval(() => void read(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function save(config: ResearchConfig) {
    setBusy(true);
    try {
      const next = await saveResearchConfig(config);
      setState((old) => (old ? { ...old, config: next } : old));
      notify("Saved.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="setting-group">
        <h2>Stock research</h2>
        <div className="setting-card">
          {error && <div className="settings-empty">{error}</div>}
          <div className="setting-row">
            <div>
              <strong>Coverage</strong>
              <p>All directory listings · Saved on this device</p>
            </div>
            <div className="setting-control">
              <span>
                {state
                  ? `${state.priced.toLocaleString()} / ${state.universe.toLocaleString()} with prices`
                  : "—"}
              </span>
              <Button
                disabled={busy || !state}
                onClick={() => {
                  setBusy(true);
                  void syncResearch()
                    .then(refresh)
                    .then(() => notify("Sync queued."))
                    .catch((e) => notify((e as Error).message))
                    .finally(() => setBusy(false));
                }}
              >
                Sync now
              </Button>
            </div>
          </div>
          {state && (
            <>
              <div className="setting-row">
                <div>
                  <strong>Automatic research sync</strong>
                </div>
                <div className="setting-control">
                  <button
                    className={`setting-switch ${state.config.automatic ? "on" : ""}`}
                    role="switch"
                    aria-label="Automatic research sync"
                    aria-checked={state.config.automatic}
                    disabled={busy}
                    onClick={() =>
                      void save({
                        ...state.config,
                        automatic: !state.config.automatic,
                      })
                    }
                  >
                    <span />
                  </button>
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Daily price source</strong>
                  <p>Yahoo is unofficial and may be rate limited.</p>
                </div>
                <div className="setting-control">
                  <Select
                    label="Daily price source"
                    value={state.config.priceSource ?? "yahoo"}
                    disabled={busy}
                    onValueChange={(value) =>
                      void save({ ...state.config, priceSource: value })
                    }
                    options={[
                      { value: "yahoo", label: "Yahoo Finance · No key" },
                      { value: "massive", label: "Massive · API key" },
                    ]}
                  />
                </div>
              </div>
              {(
                [
                  ["profileSource", "Company details source", "massive"],
                  ["analystSource", "Analyst source", "fmp"],
                  ["fundsSource", "Institutional holdings source", "fmp"],
                  ["factsSource", "Financial statements source", "sec"],
                  ["filingsSource", "Filings source", "sec"],
                ] as const
              ).map(([field, label, official]) => (
                <div className="setting-row" key={field}>
                  <div>
                    <strong>{label}</strong>
                  </div>
                  <div className="setting-control">
                    <Select
                      label={label}
                      value={state.config[field] ?? "yahoo"}
                      disabled={busy}
                      onValueChange={(value) =>
                        void save({ ...state.config, [field]: value })
                      }
                      options={[
                        ...(field === "fundsSource"
                          ? [
                              {
                                value: "thirteenf",
                                label: "13f.info · Fund history · No key",
                              },
                            ]
                          : []),
                        {
                          value: "yahoo",
                          label:
                            field === "profileSource" ||
                            field === "analystSource"
                              ? "Yahoo Finance + Nasdaq backup · No key"
                              : "Yahoo Finance · No key",
                        },
                        {
                          value: official,
                          label:
                            official === "sec"
                              ? "SEC · Contact required"
                              : official === "fmp"
                                ? "FMP · API key"
                                : "Massive · API key",
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
              <div className="setting-row">
                <div>
                  <strong>Politician trades source</strong>
                </div>
                <div className="setting-control">
                  <Select
                    label="Politician trades source"
                    value={state.config.politiciansSource ?? "congress"}
                    disabled={busy}
                    options={[
                      { value: "congress", label: "CongressInvests · No key" },
                      { value: "fmp", label: "FMP · API key" },
                    ]}
                    onValueChange={(value) =>
                      void save({
                        ...state.config,
                        politiciansSource: value as "congress" | "fmp",
                      })
                    }
                  />
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Price history</strong>
                  <p>Background backfill across the directory.</p>
                </div>
                <div className="setting-control">
                  <Select
                    label="Price history"
                    value={String(state.config.historyDays)}
                    disabled={busy}
                    onValueChange={(value) =>
                      void save({ ...state.config, historyDays: Number(value) })
                    }
                    options={[
                      { value: "30", label: "1 month" },
                      { value: "365", label: "1 year" },
                      { value: "730", label: "2 years" },
                    ]}
                  />
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Fund history</strong>
                </div>
                <div className="setting-control">
                  <Select
                    label="Fund history quarters"
                    value={String(state.config.fundsHistoryQuarters ?? 14)}
                    disabled={busy}
                    options={[4, 8, 14, 20].map((n) => ({
                      value: String(n),
                      label: `${n} quarters`,
                    }))}
                    onValueChange={(value) =>
                      void save({
                        ...state.config,
                        fundsHistoryQuarters: Number(value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Insider history</strong>
                </div>
                <div className="setting-control">
                  <Select
                    label="Insider filing history"
                    disabled={busy}
                    value={String(state.config.insiderHistoryFilings ?? 120)}
                    options={[40, 120, 240].map((n) => ({
                      value: String(n),
                      label: `${n} filings`,
                    }))}
                    onValueChange={(v) =>
                      void save({
                        ...state.config,
                        insiderHistoryFilings: Number(v),
                      })
                    }
                  />
                </div>
              </div>
              {researchDatasets.map((d) => (
                <DatasetRow
                  key={d}
                  dataset={d}
                  sourceState={
                    state.providers.find(
                      (p) => p.provider === researchProvider(state.config, d),
                    )?.blocked
                  }
                  config={state.config}
                  status={state.progress.find((p) => p.dataset === d)}
                  disabled={busy}
                  save={save}
                />
              ))}
            </>
          )}
        </div>
      </section>
      <section className="setting-group">
        <h2>Request limits</h2>
        <div className="setting-card">
          {state &&
            (
              [
                "congress",
                "thirteenf",
                "nasdaq",
                "yahoo",
                "massive",
                "sec",
                "fmp",
              ] as const
            ).map((p) => (
              <BudgetRow
                key={p}
                provider={p}
                config={state.config}
                busy={busy}
                save={save}
              />
            ))}
        </div>
      </section>
    </>
  );
}
