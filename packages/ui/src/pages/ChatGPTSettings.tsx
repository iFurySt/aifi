import { Select } from "../components/Select";
import { useChatGPT } from "../chatgpt-context";
import { Button } from "../components/primitives";

export function ChatGPTSettings() {
  const {
    available,
    status,
    busy,
    signingIn,
    error,
    models,
    model,
    setModel,
    action,
    refresh,
  } = useChatGPT();
  const active = status?.profiles.find((p) => p.id === status.activeProfileId);
  if (!available)
    return (
      <section className="setting-group">
        <h2>ChatGPT</h2>
        <div className="setting-card">
          <div className="setting-row">
            <p>Open the desktop app to connect your ChatGPT plan.</p>
          </div>
        </div>
      </section>
    );
  return (
    <>
      <section className="setting-group">
        <h2>ChatGPT plan</h2>
        <div className="setting-card">
          <div className="setting-row">
            <div>
              <strong>
                {active?.connected ? "Connected" : "Connect ChatGPT"}
              </strong>
              <p>
                {active?.sharing
                  ? "ChatGPT plan usage is enabled."
                  : active?.connected
                    ? "Reconnect to enable ChatGPT plan usage."
                    : "Use your ChatGPT plan in AIFi."}
              </p>
            </div>
            <div className="setting-control">
              {signingIn ? (
                <Button onClick={() => void action("cancelSignIn")}>
                  Cancel sign-in
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      "signIn",
                      active ? { profileId: active.id } : undefined,
                    )
                  }
                >
                  Continue with ChatGPT
                </Button>
              )}
            </div>
          </div>
          {!!status?.profiles.length && (
            <div className="setting-row">
              <div>
                <strong>Account</strong>
                {active?.email && <p>{active.email}</p>}
              </div>
              <div className="setting-control">
                <Select
                  label="ChatGPT account"
                  value={status.activeProfileId ?? ""}
                  disabled={busy}
                  onValueChange={(value) =>
                    void action("selectProfile", { profileId: value })
                  }
                  searchable
                  placeholder="Choose account"
                  options={status.profiles.map((p) => ({
                    value: p.id,
                    label: `${p.label}${p.connected ? "" : " · Sign in needed"}`,
                  }))}
                />
              </div>
            </div>
          )}
          {active?.sharing && (
            <div className="setting-row">
              <div>
                <strong>Model</strong>
              </div>
              <div className="setting-control">
                <Select
                  label="ChatGPT model"
                  value={model}
                  disabled={busy || !models.length}
                  onValueChange={setModel}
                  searchable
                  placeholder="No models available"
                  options={models.map((m) => ({
                    value: m.slug,
                    label: m.displayName,
                  }))}
                />
                <Button
                  disabled={busy}
                  onClick={() =>
                    void action("models", { profileId: active.id })
                  }
                >
                  Refresh
                </Button>
              </div>
            </div>
          )}
          <div className="setting-row">
            <div>
              <strong>Usage</strong>
              <p>Review your plan and this app’s limits.</p>
            </div>
            <div className="setting-control">
              <Button onClick={() => void action("openUsage")}>
                Manage usage
              </Button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <strong>Connections</strong>
            </div>
            <div className="setting-control">
              <Button
                disabled={busy}
                onClick={() => void action("signIn", { newProfile: true })}
              >
                Add account
              </Button>
              {active?.connected && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void action("signOut", { profileId: active.id })
                  }
                >
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
      {error && (
        <div className="settings-service-error" role="alert">
          {error}
          <Button variant="ghost" onClick={() => void refresh()}>
            Refresh connection
          </Button>
        </div>
      )}
    </>
  );
}
