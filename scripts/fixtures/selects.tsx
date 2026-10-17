// Isolated shared-control fixture; no real account, provider or local store.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Select } from "../../packages/ui/src/components/Select";
import { Modal } from "../../packages/ui/src/components/primitives";
import "../../packages/ui/src/styles.css";
function Fixture() {
  const [period, setPeriod] = useState("all");
  const [model, setModel] = useState("model-3");
  const [disabled, setDisabled] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [changes, setChanges] = useState(0);
  return (
    <main
      style={{ padding: 24, display: "grid", justifyItems: "end", gap: 12 }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          throw Error("Picker submitted its form");
        }}
        style={{
          display: "grid",
          gap: 12,
          justifyItems: "end",
          maxWidth: "100%",
        }}
      >
        <button type="button" id="before-period">
          Before period
        </button>
        <Select
          label="Period"
          value={period}
          disabled={disabled}
          onValueChange={(value) => {
            setPeriod(value);
            setChanges((c) => c + 1);
          }}
          options={[
            { value: "all", label: "All time" },
            { value: "disabled", label: "Unavailable", disabled: true },
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "365", label: "Last year" },
          ]}
        />
        <button type="button" id="after-period">
          After period
        </button>
        <Select
          label="Model"
          value={model}
          onValueChange={setModel}
          searchable
          searchPlaceholder="Search models"
          options={Array.from({ length: 80 }, (_, i) => ({
            value: `model-${i}`,
            label:
              i === 79
                ? "A very long model display name with no hidden selection value and a sizeable context window"
                : `Model ${String(i).padStart(2, "0")}`,
            keywords: i === 17 ? "special" : undefined,
          }))}
        />
        <Select
          label="Empty choices"
          value=""
          placeholder="No models available"
          disabled
          options={[]}
          onValueChange={() => {
            throw Error("Disabled selector changed");
          }}
        />
      </form>
      <button id="disable-period" onClick={() => setDisabled((d) => !d)}>
        Toggle disabled
      </button>
      <button id="open-dialog" onClick={() => setDialog(true)}>
        Open dialog
      </button>
      <output id="selection">
        {period}|{model}|{changes}
      </output>
      <Modal open={dialog} onOpenChange={setDialog} title="Select in dialog">
        <Select
          label="Dialog period"
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: "all", label: "All time" },
            { value: "7", label: "Last 7 days" },
          ]}
        />
      </Modal>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
