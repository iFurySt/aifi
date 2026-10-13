import { useState } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
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
      <PageHeading title="Library" />
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
          </button>
        ))}
      </div>
      {skills.length === 0 && (
        <EmptyState
          title="No matching routines"
          description="Try another category or search term."
        />
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.name ?? "Research routine"}
        description="Workflow preview"
      >
        {selected && (
          <>
            <ol className="workflow-steps">
              {selected.sections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ol>
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
                Research
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
