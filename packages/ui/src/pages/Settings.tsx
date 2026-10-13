import { useState } from "react";
import { Check, Database, Moon, Sun, Trash2 } from "lucide-react";
import { useWorkspace } from "../workspace-context";
import { Button, Modal, PageHeading } from "../components/primitives";
export function Settings() {
  const { workspace, update, reset } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page-container settings-page">
      <PageHeading title="Settings" />
      <section className="settings-section">
        <div className="settings-section-title">
          <Sun size={18} />
          <h2>Appearance</h2>
        </div>
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
          <Database size={18} />
          <h2>Local data</h2>
        </div>
        <div className="local-data-row">
          <div>
            <strong>Reset workspace</strong>
            <p>Restore demo data.</p>
          </div>
          <Button onClick={() => setConfirm(true)}>
            <Trash2 size={15} />
            Reset data
          </Button>
        </div>
      </section>
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
