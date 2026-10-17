import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, RefreshCw, Trash2, CircleCheck } from "lucide-react";
import type { DataStatus, DataSettings, CredentialProvider } from "@aifi/core";
import {
  readDataStatus,
  saveDataSettings,
  syncDirectory,
  saveCredentials,
  removeCredentials,
} from "@aifi/platform";
import { useWorkspace } from "../workspace-context";
import { Button, Modal } from "../components/primitives";
import { ResearchSyncSettings } from "./ResearchSyncSettings";
import { settingItems } from "../components/SettingsSidebar";
import { ChatGPTSettings } from "./ChatGPTSettings";
import { StorageSettings } from "./StorageSettings";
function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="setting-group">
      <h2>{title}</h2>
      <div className="setting-card">{children}</div>
    </section>
  );
}
function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`setting-switch ${checked ? "on" : ""}`}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
const when = (value?: string) =>
  value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export function Settings() {
  const {
    workspace,
    update,
    reset,
    settingsSection: section,
    notify,
  } = useWorkspace();
  const [data, setData] = useState<DataStatus>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [provider, setProvider] = useState<CredentialProvider>();
  const [values, setValues] = useState<Record<string, string>>({});
  const [hours, setHours] = useState("24");
  const [agent, setAgent] = useState("");
  const refresh = useCallback(async () => {
    try {
      const next = await readDataStatus();
      setData((old) =>
        old && old.settings.revision > next.settings.revision ? old : next,
      );
      setError("");
    } catch {
      setError("Data service unavailable.");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (data) setHours(String(data.settings.intervalHours));
  }, [data?.settings.intervalHours]);
  useEffect(() => {
    if (data) setAgent(data.settings.secUserAgent);
  }, [data?.settings.secUserAgent]);
  async function action(run: () => Promise<unknown>, message?: string) {
    setBusy(true);
    try {
      await run();
      await refresh();
      if (message) notify(message);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function configure(patch: Partial<DataSettings>) {
    if (!data) return;
    await action(async () => {
      const settings = await saveDataSettings({ ...data.settings, ...patch });
      setData((old) => (old ? { ...old, settings } : old));
    }, "Saved.");
  }
  const connected = !!data && !error;
  const fields =
    provider === "alpaca"
      ? [
          { id: "keyId", label: "Key ID" },
          { id: "secret", label: "Secret key" },
        ]
      : [{ id: "apiKey", label: "API key" }];
  return (
    <div className="settings-content">
      <h1>{settingItems.find((x) => x.id === section)?.label}</h1>
      {error && section !== "chatgpt" && section !== "storage" && (
        <div className="settings-service-error" role="status">
          {error}
          <Button variant="ghost" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}
      {section === "chatgpt" && <ChatGPTSettings />}
      {section === "general" && (
        <>
          <Group title="Workspace">
            <Row title="Local workspace" description="Saved on this device.">
              <span>Personal</span>
            </Row>
            <Row title="Data service" description="Starts with the app.">
              <span className="service-status">
                <i className={connected ? "ready" : ""} />
                {connected ? "Running" : error ? "Unavailable" : "Starting…"}
              </span>
            </Row>
          </Group>
          <Group title="Data">
            <Row
              title="Directory sync"
              description="Check for updates in the background."
            >
              <Toggle
                label="Automatic directory sync"
                checked={data?.settings.automatic ?? false}
                disabled={!connected || busy}
                onChange={() =>
                  void configure({ automatic: !data?.settings.automatic })
                }
              />
            </Row>
            <Row title="Sync settings">
              <a className="setting-link" href="#/settings/sync">
                Manage
              </a>
            </Row>
            <Row title="API credentials">
              <a className="setting-link" href="#/settings/keys">
                Manage
              </a>
            </Row>
          </Group>
        </>
      )}
      {section === "appearance" && (
        <Group title="Theme">
          <Row title="Color theme">
            <select
              aria-label="Color theme"
              value={workspace.theme}
              onChange={(e) =>
                update((w) => ({
                  ...w,
                  theme: e.target.value as "light" | "dark",
                }))
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Row>
        </Group>
      )}
      {section === "sources" && (
        <>
          <Group title="Market data">
            <Row
              title="Nasdaq Trader"
              description="Security directory · No key required"
            >
              <Toggle
                label="Enable Nasdaq Trader"
                checked={data?.settings.directoryEnabled ?? false}
                disabled={!connected || busy}
                onChange={() =>
                  void configure({
                    directoryEnabled: !data?.settings.directoryEnabled,
                  })
                }
              />
            </Row>
            <Row title="External API keys">
              <a className="setting-link" href="#/settings/keys">
                Manage
              </a>
            </Row>
          </Group>
          <Group title="Company data">
            <Row
              title="SEC"
              description="Filings, financials and insider disclosures · No API key"
            >
              <span>
                {data?.settings.secUserAgent ? "Saved" : "Not configured"}
              </span>
            </Row>
            <div className="setting-inline-form">
              <label htmlFor="sec-agent">Identification</label>
              <input
                id="sec-agent"
                aria-label="SEC identification"
                placeholder="App name and contact email"
                value={agent}
                maxLength={255}
                onChange={(e) => setAgent(e.target.value)}
                disabled={!connected || busy}
              />
              <Button
                disabled={
                  !connected ||
                  busy ||
                  agent === (data?.settings.secUserAgent ?? "")
                }
                onClick={() => void configure({ secUserAgent: agent.trim() })}
              >
                Save
              </Button>
            </div>
          </Group>
        </>
      )}
      {section === "keys" && (
        <Group title="External services">
          {" "}
          {(["massive", "fmp", "alpaca"] as const).map((p) => (
            <Row
              key={p}
              title={
                {
                  massive: "Massive",
                  fmp: "Financial Modeling Prep",
                  alpaca: "Alpaca",
                }[p]
              }
              description={
                {
                  massive:
                    "Daily prices, company profiles and corporate actions",
                  fmp: "Holdings, politician trades, ratings and news · Access depends on plan",
                  alpaca: "Reserved for an alternate price source",
                }[p]
              }
            >
              <span className="credential-state">
                {data?.credentials.find((x) => x.provider === p)?.fields
                  .length ? (
                  <>
                    <CircleCheck size={14} /> Saved
                  </>
                ) : (
                  "No credentials"
                )}
              </span>
              <Button
                disabled={!connected || busy}
                onClick={() => {
                  setProvider(p);
                  setValues({});
                }}
              >
                Configure
              </Button>
            </Row>
          ))}
        </Group>
      )}
      {section === "sync" && (
        <>
          <Group title="Directory">
            <Row
              title="Automatic sync"
              description="Refresh when the cached directory is due."
            >
              <Toggle
                label="Automatic directory sync"
                checked={data?.settings.automatic ?? false}
                disabled={!connected || busy}
                onChange={() =>
                  void configure({ automatic: !data?.settings.automatic })
                }
              />
            </Row>
            <Row
              title="Interval"
              description="Hours between successful updates."
            >
              <input
                className="interval-input"
                type="number"
                min={1}
                max={720}
                aria-label="Directory interval hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                disabled={!connected || busy}
              />
              <span>hours</span>
              <Button
                disabled={
                  !connected ||
                  busy ||
                  !Number.isInteger(Number(hours)) ||
                  Number(hours) < 1 ||
                  Number(hours) > 720 ||
                  Number(hours) === data?.settings.intervalHours
                }
                onClick={() => void configure({ intervalHours: Number(hours) })}
              >
                Save
              </Button>
            </Row>
            <Row title="Last successful sync">
              <span>{when(data?.lastSuccess)}</span>
            </Row>
            <Row title="Next sync">
              <span>
                {data?.settings.automatic && data.settings.directoryEnabled
                  ? when(data.nextSync)
                  : "Paused"}
              </span>
            </Row>
            <Row
              title="Directory"
              description={
                data
                  ? `${data.directory.rows.toLocaleString()} securities · ${data.directory.candidates.toLocaleString()} candidates`
                  : undefined
              }
            >
              <span>
                {data?.running
                  ? "Syncing…"
                  : data?.queued
                    ? "Queued"
                    : data?.offline
                      ? "Network paused"
                      : ""}
              </span>
              <Button
                disabled={
                  !connected ||
                  busy ||
                  data?.running ||
                  data?.queued ||
                  data?.offline ||
                  !data?.settings.directoryEnabled
                }
                onClick={() =>
                  void action(() => syncDirectory(), "Sync queued.")
                }
              >
                <RefreshCw
                  size={15}
                  className={data?.running ? "spinning" : ""}
                />
                Sync now
              </Button>
            </Row>
          </Group>
          <ResearchSyncSettings />
          <Group title="Recent syncs">
            {data?.directory.recentRuns.length ? (
              data.directory.recentRuns.slice(0, 6).map((run) => (
                <Row
                  key={run.id}
                  title={when(run.finishedAt || run.startedAt)}
                  description={
                    run.error
                      ? /cancel/i.test(run.error)
                        ? "Stopped."
                        : /timeout|deadline/i.test(run.error)
                          ? "Request timed out."
                          : /429/.test(run.error)
                            ? "Rate limited."
                            : "Sync failed."
                      : undefined
                  }
                >
                  <span
                    className={`sync-state ${({ running: "Syncing", succeeded: "Synced", failed: "Failed", interrupted: "Interrupted" } as Record<string, string>)[run.state] ?? run.state}`}
                  >
                    {(
                      {
                        running: "Syncing",
                        succeeded: "Synced",
                        failed: "Failed",
                        interrupted: "Interrupted",
                      } as Record<string, string>
                    )[run.state] ?? run.state}
                  </span>
                </Row>
              ))
            ) : (
              <div className="settings-empty">No syncs yet</div>
            )}
          </Group>
        </>
      )}
      {section === "storage" && (
        <>
          <StorageSettings />
          <Group title="Workspace">
            <Row
              title="Reset workspace"
              description="Restore demo chats, agents and watchlist."
            >
              <Button onClick={() => setConfirm(true)}>
                <Trash2 size={15} />
                Reset
              </Button>
            </Row>
          </Group>
        </>
      )}
      <Modal
        open={!!provider}
        onOpenChange={(open) => {
          if (!open) {
            setProvider(undefined);
            setValues({});
          }
        }}
        title={
          provider === "fmp"
            ? "Financial Modeling Prep"
            : provider === "alpaca"
              ? "Alpaca"
              : "Massive"
        }
        description="Credentials are encrypted on this device."
      >
        <form
          className="credential-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (provider)
              void action(async () => {
                await saveCredentials(provider, values);
                setValues({});
                setProvider(undefined);
              }, "Credentials saved.");
          }}
        >
          {fields.map((field) => (
            <label key={field.id}>
              {field.label}
              <input
                type="password"
                autoComplete="off"
                aria-label={field.label}
                maxLength={4096}
                placeholder={
                  data?.credentials
                    .find((x) => x.provider === provider)
                    ?.fields.includes(field.id)
                    ? "Saved · enter to replace"
                    : "Enter credential"
                }
                value={values[field.id] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.id]: e.target.value }))
                }
              />
            </label>
          ))}
          <div className="dialog-actions">
            <Button
              type="button"
              disabled={
                busy ||
                !data?.credentials.find((x) => x.provider === provider)?.fields
                  .length
              }
              onClick={() => {
                if (provider)
                  void action(async () => {
                    await removeCredentials(provider);
                    setProvider(undefined);
                    setValues({});
                  }, "Credentials removed.");
              }}
            >
              Remove saved
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !Object.values(values).some((x) => x.trim())}
            >
              <Check size={15} />
              Save
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset workspace?"
        description="Replaces your agents, watchlist, chats and theme with demo defaults."
      >
        <div className="dialog-actions">
          <Button onClick={() => setConfirm(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              reset();
              setConfirm(false);
            }}
          >
            Reset workspace
          </Button>
        </div>
      </Modal>
    </div>
  );
}
