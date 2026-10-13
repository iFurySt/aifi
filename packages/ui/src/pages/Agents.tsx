import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  Bot,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Layers,
  Pause,
  Play,
  Plus,
  Radar,
  Sparkles,
} from "lucide-react";
import {
  agentTemplates,
  cadences,
  createAgent,
  previewAgent,
} from "@aifi/core";
import type { Agent, Cadence } from "@aifi/core";
import { useWorkspace, uid } from "../workspace-context";
import {
  ActionMenu,
  Button,
  EmptyState,
  Modal,
  Status,
  Tag,
  TextLink,
} from "../components/primitives";
const toneIcons = {
  mint: BellRing,
  blue: Layers,
  peach: Radar,
  violet: Sparkles,
};
export function Agents() {
  const { workspace, update, notify, research } = useWorkspace();
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<Cadence>("Daily");
  const [filter, setFilter] = useState<"All" | "Active" | "Paused">("All");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  useEffect(() => {
    const select = () => {
      const id = new URLSearchParams(location.hash.split("?")[1] ?? "").get(
        "agent",
      );
      if (id) setSelectedId(id);
    };
    select();
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, []);
  const selected = workspace.agents.find((a) => a.id === selectedId);
  function submit() {
    try {
      if (workspace.agents.length >= 100) throw new Error("Limit: 100 agents.");
      const agent = createAgent(prompt, cadence, uid());
      update((w) => ({ ...w, agents: [agent, ...w.agents] }));
      setPrompt("");
      setError("");
      setFilter("All");
      notify("Agent created.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function toggle(agent: Agent) {
    update((w) => ({
      ...w,
      agents: w.agents.map((a) =>
        a.id === agent.id ? { ...a, active: !a.active } : a,
      ),
    }));
    notify(agent.active ? "Agent paused." : "Agent resumed.");
  }
  function run(agent: Agent) {
    try {
      const event = previewAgent(agent, uid(), new Date().toISOString());
      update((w) => ({ ...w, events: [event, ...w.events].slice(0, 100) }));
      notify("Preview created.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const filtered = workspace.agents.filter(
    (a) => filter === "All" || (filter === "Active" ? a.active : !a.active),
  );
  return (
    <div className="page-container agents-page">
      <section className="agent-hero">
        <div className="hero-symbol">
          <Bot size={28} strokeWidth={1.4} />
          <span className="hero-spark">
            <Sparkles size={12} />
          </span>
        </div>
        <h1>Create an agent</h1>
        <form
          className="composer agent-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            aria-label="Describe your agent"
            placeholder="Describe what to follow…"
            value={prompt}
            maxLength={500}
            onChange={(e) => {
              setPrompt(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="composer-footer">
            <label className="cadence-control">
              <CalendarDays size={15} />
              <select
                aria-label="Agent cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as Cadence)}
              >
                {cadences.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <Button variant="primary" type="submit">
              <Plus size={16} />
              Create agent
            </Button>
          </div>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="template-chips">
          {agentTemplates.map((template, i) => {
            const Icon = [FileText, Layers, Radar, Sparkles][i];
            return (
              <button
                key={template.label}
                onClick={() => {
                  setPrompt(template.prompt);
                  setError("");
                  document
                    .querySelector<HTMLTextAreaElement>(
                      ".agent-composer textarea",
                    )
                    ?.focus();
                }}
              >
                {Icon && <Icon size={14} />}
                {template.label}
              </button>
            );
          })}
        </div>
      </section>
      <section className="agents-section">
        <div className="section-heading">
          <h2>
            Your agents{" "}
            <span className="count-badge">{workspace.agents.length}</span>
          </h2>
          <div className="segmented-control" aria-label="Filter agents">
            {(["All", "Active", "Paused"] as const).map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                className={filter === f ? "selected" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="agent-grid">
          {filtered.map((agent) => {
            const Icon = toneIcons[agent.tone];
            return (
              <article className="agent-card" key={agent.id}>
                <div className="agent-card-top">
                  <span className={`agent-icon tone-${agent.tone}`}>
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  <div className="agent-card-controls">
                    <Status active={agent.active} />
                    <ActionMenu
                      items={[
                        {
                          label: "View details",
                          action: () => setSelectedId(agent.id),
                        },
                        {
                          label: agent.active ? "Pause agent" : "Resume agent",
                          action: () => toggle(agent),
                        },
                        {
                          label: "Create preview",
                          disabled: !agent.active,
                          action: () => run(agent),
                        },
                        {
                          label: "Delete agent",
                          danger: true,
                          action: () => setDeleting(agent),
                        },
                      ]}
                    />
                  </div>
                </div>
                <button
                  className="agent-card-body"
                  onClick={() => setSelectedId(agent.id)}
                >
                  <h3>{agent.name}</h3>
                  <p>{agent.prompt}</p>
                  <span className="ticker-tags">
                    {agent.symbols.length ? (
                      agent.symbols.map((s) => <Tag key={s}>{s}</Tag>)
                    ) : (
                      <Tag>Custom research</Tag>
                    )}
                  </span>
                </button>
                <div className="agent-card-footer">
                  <span>
                    <Clock3 size={13} />
                    {agent.cadence}
                  </span>
                  <button onClick={() => setSelectedId(agent.id)}>
                    View agent
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <EmptyState
            title={
              filter === "All"
                ? "No agents yet"
                : `No ${filter.toLowerCase()} agents`
            }
            description={
              filter === "All"
                ? "Create an agent above."
                : "Try another filter."
            }
          />
        )}
      </section>
      <section className="updates-section">
        <div className="section-heading">
          <h2>Recent previews</h2>
        </div>
        <div className="updates-list">
          {workspace.events.slice(0, 4).map((event) => (
            <button
              className="update-row"
              key={event.id}
              onClick={() => setSelectedId(event.agentId)}
            >
              <span className="update-icon">
                <FileText size={18} />
              </span>
              <span className="update-copy">
                <strong>{event.title}</strong>
                <span>{event.summary}</span>
              </span>
              <span className="update-date">
                {new Date(event.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
          {workspace.events.length === 0 && (
            <p className="muted">No previews yet.</p>
          )}
        </div>
      </section>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            history.replaceState(history.state, "", "#/agents");
          }
        }}
        title={selected?.name ?? "Agent"}
        sheet
      >
        {selected && (
          <div className="sheet-body">
            <div className="detail-meta">
              <Status active={selected.active} />
              <Tag>{selected.cadence}</Tag>
            </div>
            <h3>Instructions</h3>
            <p className="detail-prompt">{selected.prompt}</p>
            <div className="ticker-tags">
              {selected.symbols.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
            <div className="detail-actions">
              <Button
                variant="primary"
                disabled={!selected.active}
                onClick={() => run(selected)}
              >
                <Play size={14} />
                Create preview
              </Button>
              <Button onClick={() => toggle(selected)}>
                {selected.active ? <Pause size={14} /> : <Play size={14} />}
                {selected.active ? "Pause" : "Resume"}
              </Button>
            </div>
            <h3>Previews</h3>
            {workspace.events
              .filter((e) => e.agentId === selected.id)
              .map((event) => (
                <article className="preview-brief" key={event.id}>
                  <small>
                    Preview · {new Date(event.createdAt).toLocaleDateString()}
                  </small>
                  <h4>{event.title}</h4>
                  <p>{event.summary}</p>
                </article>
              ))}
            {!workspace.events.some((e) => e.agentId === selected.id) && (
              <p className="muted">No previews yet.</p>
            )}
            <TextLink
              onClick={() => {
                setSelectedId(null);
                research(selected.prompt);
              }}
            >
              Research
            </TextLink>
          </div>
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this agent?"
        description="Removes the agent and its previews."
      >
        <p className="delete-name">{deleting?.name}</p>
        <div className="dialog-actions">
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!deleting) return;
              update((w) => ({
                ...w,
                agents: w.agents.filter((a) => a.id !== deleting.id),
                events: w.events.filter((e) => e.agentId !== deleting.id),
              }));
              if (selectedId === deleting.id) setSelectedId(null);
              setDeleting(null);
              notify("Agent deleted.");
            }}
          >
            Delete agent
          </Button>
        </div>
      </Modal>
    </div>
  );
}
