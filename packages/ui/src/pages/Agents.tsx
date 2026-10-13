import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  Bot,
  CalendarDays,
  ChevronRight,
  CircleHelp,
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
      if (workspace.agents.length >= 100)
        throw new Error("This preview supports up to 100 agents.");
      const agent = createAgent(prompt, cadence, uid());
      update((w) => ({ ...w, agents: [agent, ...w.agents] }));
      setPrompt("");
      setError("");
      setFilter("All");
      notify(
        "Agent saved locally. Monitoring will be available in a later version.",
      );
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
    notify(
      agent.active
        ? "Agent paused."
        : "Agent resumed. This workspace still uses demo previews.",
    );
  }
  function run(agent: Agent) {
    try {
      const event = previewAgent(agent, uid(), new Date().toISOString());
      update((w) => ({ ...w, events: [event, ...w.events].slice(0, 100) }));
      notify("Sample check added to recent previews.");
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
        <h1>Keep an eye on what matters.</h1>
        <p>
          Turn your investment questions into a repeatable research routine.
        </p>
        <form
          className="composer agent-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            aria-label="Describe your agent"
            placeholder="What would you like your agent to follow?"
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
        <p className="hero-note">
          Start with a template, or write your own. All checks in this version
          are previews.
        </p>
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
                          label: "Create sample check",
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
                ? "Your first agent starts here"
                : `No ${filter.toLowerCase()} agents`
            }
            description={
              filter === "All"
                ? "Describe a question above, or choose a template to get started."
                : "Try another filter to see the rest of your agents."
            }
          />
        )}
      </section>
      <section className="updates-section">
        <div className="section-heading">
          <h2>Recent previews</h2>
          <span className="section-meta">Illustrative research briefs</span>
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
            <p className="muted">
              Create a sample check from an active agent to preview a research
              brief.
            </p>
          )}
        </div>
      </section>
      <div className="page-footnote">
        <CircleHelp size={14} />
        Agents are saved on this device. No background monitoring is running.
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            history.replaceState(history.state, "", "#/agents");
          }
        }}
        title={selected?.name ?? "Agent"}
        description="Your research routine, saved locally."
        sheet
      >
        {selected && (
          <div className="sheet-body">
            <div className="detail-meta">
              <Status active={selected.active} />
              <Tag>{selected.cadence}</Tag>
              <Tag>Demo agent</Tag>
            </div>
            <h3>What this agent follows</h3>
            <p className="detail-prompt">{selected.prompt}</p>
            <div className="ticker-tags">
              {selected.symbols.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
            <div className="inset-note">
              <Sparkles size={18} />
              <div>
                <strong>A preview of the workflow</strong>
                <p>
                  Future checks will gather sources, compare new evidence, and
                  save a brief. Creating a sample check below only adds
                  illustrative content.
                </p>
              </div>
            </div>
            <div className="detail-actions">
              <Button
                variant="primary"
                disabled={!selected.active}
                onClick={() => run(selected)}
              >
                <Play size={14} />
                Create sample check
              </Button>
              <Button onClick={() => toggle(selected)}>
                {selected.active ? <Pause size={14} /> : <Play size={14} />}
                {selected.active ? "Pause" : "Resume"}
              </Button>
            </div>
            <h3>Saved previews</h3>
            {workspace.events
              .filter((e) => e.agentId === selected.id)
              .map((event) => (
                <article className="preview-brief" key={event.id}>
                  <small>
                    Sample brief ·{" "}
                    {new Date(event.createdAt).toLocaleDateString()}
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
              Explore in Research
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
        description="The agent and its saved previews will be removed from this device."
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
