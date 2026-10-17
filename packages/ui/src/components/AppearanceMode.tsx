import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Theme } from "@aifi/core";
import "./appearance-mode.css";

const modes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;
function Preview({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`mode-mini-window ${dark ? "mode-mini-dark" : ""}`}>
      <span className="mode-mini-rail">
        <i />
        <i />
        <i />
      </span>
      <span className="mode-mini-page">
        <i />
        <i />
        <i />
        <b />
      </span>
    </span>
  );
}
export function AppearanceMode({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (mode: Theme) => void;
}) {
  const group = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<Theme | null>(null);
  const choose = (mode: Theme) => {
    onChange(mode);
    group.current
      ?.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)
      ?.focus();
  };
  function keys(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setTooltip(null);
      event.stopPropagation();
      return;
    }
    const index = modes.findIndex((mode) => mode.value === value);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? modes.length - 1
          : ["ArrowRight", "ArrowDown"].includes(event.key)
            ? (index + 1) % modes.length
            : ["ArrowLeft", "ArrowUp"].includes(event.key)
              ? (index + modes.length - 1) % modes.length
              : -1;
    if (next < 0 || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    choose(modes[next]!.value);
  }
  return (
    <div
      ref={group}
      className="appearance-modes"
      role="radiogroup"
      aria-label="Mode"
      onKeyDown={keys}
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          role="radio"
          aria-label={mode.label}
          aria-describedby={
            tooltip === mode.value ? `${tooltipId}-${mode.value}` : undefined
          }
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") setTooltip(mode.value);
          }}
          onPointerLeave={() => setTooltip(null)}
          onFocus={() => setTooltip(mode.value)}
          onBlur={() => setTooltip(null)}
          aria-checked={value === mode.value}
          tabIndex={value === mode.value ? 0 : -1}
          data-mode={mode.value}
          className="appearance-mode"
          onClick={() => onChange(mode.value)}
        >
          {tooltip === mode.value && (
            <span
              id={`${tooltipId}-${mode.value}`}
              role="tooltip"
              className="appearance-mode-tooltip"
            >
              {mode.label}
            </span>
          )}
          <span
            className={`mode-preview mode-preview-${mode.value}`}
            aria-hidden="true"
          >
            {mode.value === "system" ? (
              <>
                <span>
                  <Preview />
                </span>
                <span>
                  <Preview dark />
                </span>
              </>
            ) : (
              <Preview dark={mode.value === "dark"} />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
