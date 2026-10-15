import { useEffect, useState } from "react";
import {
  researchDatasets,
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
          {sources[dataset]}
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
  provider: "massive" | "sec" | "fmp";
  config: ResearchConfig;
  busy: boolean;
  save: (c: ResearchConfig) => Promise<void>;
}) {
  const limit = config.limits[provider],
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
        <strong>{provider.toUpperCase()}</strong>
        <p>Match your account limits.</p>
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
                  <strong>Price history</strong>
                  <p>Background backfill across the directory.</p>
                </div>
                <div className="setting-control">
                  <select
                    aria-label="Price history"
                    value={state.config.historyDays}
                    disabled={busy}
                    onChange={(e) =>
                      void save({
                        ...state.config,
                        historyDays: Number(e.target.value),
                      })
                    }
                  >
                    <option value={30}>1 month</option>
                    <option value={365}>1 year</option>
                    <option value={730}>2 years</option>
                  </select>
                </div>
              </div>
              {researchDatasets.map((d) => (
                <DatasetRow
                  key={d}
                  dataset={d}
                  sourceState={
                    state.providers.find(
                      (p) =>
                        p.provider ===
                        (d === "facts" || d === "filings" || d === "insiders"
                          ? "sec"
                          : d === "prices" || d === "profile" || d === "actions"
                            ? "massive"
                            : "fmp"),
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
            (["massive", "sec", "fmp"] as const).map((p) => (
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
