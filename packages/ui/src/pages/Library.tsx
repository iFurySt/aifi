import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { librarySkills } from "@aifi/core";
import { useWorkspace } from "../workspace-context";
import {
  Button,
  EmptyState,
  Modal,
  PageHeading,
  Tag,
} from "../components/primitives";
export function Library() {
  const { research } = useWorkspace();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<
    (typeof librarySkills)[number] | null
  >(null);
  const skills = librarySkills.filter(
    (s) =>
      (category === "All" || s.category === category) &&
      `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page-container">
      <PageHeading
        title="Good research is reusable."
        description="A collection of research routines, built to make the next question easier."
      />
      <div className="data-toolbar">
        <div className="segmented-control" aria-label="Filter library">
          {["All", "Research", "Valuation", "Portfolio"].map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search-field compact">
          <Search size={16} />
          <input
            aria-label="Search library"
            placeholder="Find a routine…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="library-grid">
        {skills.map((skill, i) => (
          <button
            className="library-card"
            key={skill.name}
            onClick={() => setSelected(skill)}
          >
            <div className="library-card-top">
              <span
                className={`agent-icon tone-${["blue", "mint", "peach", "violet"][i % 4]}`}
              >
                <BookOpen size={20} />
              </span>
              <ArrowUpRight size={17} />
            </div>
            <Tag>{skill.category}</Tag>
            <h2>{skill.name}</h2>
            <p>{skill.description}</p>
            <span className="library-card-footer">
              Workflow preview
              <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>
      {skills.length === 0 && (
        <EmptyState
          title="No matching routines"
          description="Try another category or search term."
        />
      )}
      <section className="library-about panel">
        <span className="agent-icon tone-mint">
          <Sparkles size={21} />
        </span>
        <div>
          <h2>A workspace that remembers the work.</h2>
          <p>
            AIFi’s repository already contains reusable research skills and
            saved artifacts. These cards preview a few workflows; running skills
            and opening repository reports from the app come next.
          </p>
        </div>
      </section>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.name ?? "Research routine"}
        description="An outline of a repository skill. This preview does not execute it."
      >
        {selected && (
          <>
            <Tag>{selected.category}</Tag>
            <p className="library-description">{selected.description}</p>
            <ol className="workflow-steps">
              {selected.sections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ol>
            <div className="inset-note">
              <FileText size={18} />
              <div>
                <strong>Repository reference</strong>
                <code>{selected.path}/SKILL.md</code>
              </div>
            </div>
            <div className="dialog-actions">
              <Button
                variant="primary"
                onClick={() => {
                  research(
                    `Help me plan a ${selected.name.toLowerCase()} workflow.`,
                  );
                  setSelected(null);
                }}
              >
                Explore in Research
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
