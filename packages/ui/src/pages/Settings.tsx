import { useState } from "react";
import {
  Check,
  CircleHelp,
  Database,
  Laptop,
  Link2,
  LockKeyhole,
  Moon,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "../workspace-context";
import { Button, Modal, PageHeading, Tag } from "../components/primitives";
export function Settings() {
  const { workspace, update, reset } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page-container settings-page">
      <PageHeading
        title="Make room for your way of working."
        description="A local workspace, with a few thoughtful defaults."
      />
      <section className="settings-section">
        <div className="settings-section-title">
          <Sun size={18} />
          <h2>Appearance</h2>
        </div>
        <p>Choose a theme for this workspace.</p>
        <div className="theme-options">
          {(["light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              className={`theme-option ${workspace.theme === theme ? "selected" : ""}`}
              aria-pressed={workspace.theme === theme}
              onClick={() => update((w) => ({ ...w, theme }))}
            >
              <span className={`theme-preview preview-${theme}`}>
                <span />
                <span>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span className="theme-option-label">
                {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "light" ? "Light" : "Dark"}
                {workspace.theme === theme && <Check size={15} />}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-title">
          <Sparkles size={18} />
          <h2>Models & research</h2>
          <Tag>Planned</Tag>
        </div>
        <p>
          This version demonstrates the workflow. Live AI research is not
          connected yet.
        </p>
        <div className="connection-card">
          <span className="connection-icon">
            <Sparkles size={20} />
          </span>
          <div>
            <strong>Continue with ChatGPT</strong>
            <p>
              Planned for eligible local open-source clients, using official
              OAuth and ChatGPT plan access.
            </p>
          </div>
          <Tag>Not connected</Tag>
        </div>
        <div className="connection-card">
          <span className="connection-icon">
            <LockKeyhole size={19} />
          </span>
          <div>
            <strong>Bring your own API key</strong>
            <p>
              A future option for supported model providers. No credentials are
              collected in this preview.
            </p>
          </div>
          <Tag>Planned</Tag>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-title">
          <Link2 size={18} />
          <h2>Broker connections</h2>
          <Tag>Planned</Tag>
        </div>
        <p>
          Start with observation and research. Account access will require a
          separate setup.
        </p>
        <div className="connection-card">
          <span className="broker-mark">S</span>
          <div>
            <strong>Charles Schwab</strong>
            <p>
              First planned direct connection for your own accounts, positions,
              and market data.
            </p>
          </div>
          <Tag>Priority</Tag>
        </div>
        <div className="connection-card">
          <span className="broker-mark plaid-mark">P</span>
          <div>
            <strong>Plaid</strong>
            <p>
              A future alternative for supported institutions and investment
              account aggregation.
            </p>
          </div>
          <Tag>Optional</Tag>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-title">
          <Database size={18} />
          <h2>Local data</h2>
        </div>
        <div className="local-data-row">
          <div>
            <strong>Saved on this device</strong>
            <p>
              Agents, watchlist symbols, conversations, and theme stay in this
              app’s local storage. Browser and desktop have separate workspaces.
            </p>
          </div>
          <Laptop size={25} />
        </div>
        <div className="local-data-row">
          <div>
            <strong>Reset this workspace</strong>
            <p>Remove your local changes and restore the original demo data.</p>
          </div>
          <Button onClick={() => setConfirm(true)}>
            <Trash2 size={15} />
            Reset data
          </Button>
        </div>
      </section>
      <div className="page-footnote">
        <CircleHelp size={14} />
        AIFi 0.1 · Local demo · No background monitoring or trading
      </div>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset local data?"
        description="Your agents, watchlist changes, research conversations, and theme will be replaced with the original demo workspace."
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
