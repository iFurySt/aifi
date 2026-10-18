import { Skeleton } from "./Skeleton";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import "./select.css";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
  keywords?: string;
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  placeholder?: string;
  /** A short selected label, for example a stock collection heading. */
  triggerLabel?: string;
  variant?: "default" | "subtle" | "heading";
  align?: "start" | "end";
  className?: string;
}

/** Controlled value picker. Search stays local; only choosing an option commits. */
export function Select<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  loading = false,
  searchable = false,
  searchPlaceholder = "Search…",
  placeholder = "Choose…",
  triggerLabel,
  variant = "default",
  align = "end",
  className = "",
}: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<T | undefined>(value);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const tabbing = useRef(false);
  const typeahead = useRef({ text: "", at: 0 });
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.keywords ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const enabled = filtered.filter((option) => !option.disabled);
  const current =
    enabled.find((option) => option.value === active) ?? enabled[0];
  const optionId = (v: T) =>
    `${id}-option-${options.findIndex((o) => o.value === v)}`;

  function changeOpen(next: boolean) {
    if (next && (disabled || loading)) return;
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(value);
      typeahead.current = { text: "", at: 0 };
      tabbing.current = false;
    }
  }
  function choose(option: SelectOption<T> | undefined) {
    if (!option || option.disabled || disabled || loading) return;
    if (option.value !== value) onValueChange(option.value);
    setOpen(false);
  }
  useEffect(() => {
    if (disabled || loading) setOpen(false);
  }, [disabled, loading]);
  useEffect(() => {
    if (open && current) {
      document
        .getElementById(optionId(current.value))
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, current?.value, query]);

  function onKeyDown(event: KeyboardEvent) {
    if (
      event.nativeEvent.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    const fromSearch = event.target === input.current;
    const index = enabled.findIndex(
      (option) => option.value === current?.value,
    );
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(
        enabled[(index + step + enabled.length) % enabled.length]?.value,
      );
    } else if (!fromSearch && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(enabled[event.key === "Home" ? 0 : enabled.length - 1]?.value);
    } else if (
      event.key === "Enter" ||
      (!fromSearch &&
        event.key === " " &&
        (!typeahead.current.text || Date.now() - typeahead.current.at >= 700))
    ) {
      event.preventDefault();
      choose(current);
    } else if (event.key === "Tab") {
      tabbing.current = true;
      trigger.current?.focus();
      setOpen(false);
    } else if (!fromSearch && event.key.length === 1) {
      event.preventDefault();
      const now = Date.now();
      const text =
        (now - typeahead.current.at < 700 ? typeahead.current.text : "") +
        event.key.toLocaleLowerCase();
      typeahead.current = { text, at: now };
      const repeated = [...text].every((character) => character === text[0]);
      const prefix = repeated ? text[0] : text;
      const ordered = [
        ...enabled.slice(index + 1),
        ...enabled.slice(0, index + 1),
      ];
      const match = ordered.find((option) =>
        option.label.toLocaleLowerCase().startsWith(prefix),
      );
      if (match) setActive(match.value);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          ref={trigger}
          className={`select-trigger select-${variant} ${className}`}
          aria-label={label}
          aria-describedby={`${id}-value`}
          aria-haspopup="listbox"
          aria-controls={open ? `${id}-list` : undefined}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
          title={triggerLabel ?? selected?.label ?? placeholder}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              changeOpen(true);
              if (!selected || selected.disabled) {
                setActive(
                  event.key === "ArrowUp"
                    ? options.filter((option) => !option.disabled).at(-1)?.value
                    : options.find((option) => !option.disabled)?.value,
                );
              }
            }
          }}
        >
          <span id={`${id}-value`} className="select-value">
            {loading ? (
              <Skeleton width={80} />
            ) : (
              (triggerLabel ?? selected?.label ?? placeholder)
            )}
          </span>
          <ChevronDown
            size={14}
            className="select-chevron"
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="select-popover"
          role="presentation"
          align={align}
          sideOffset={5}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (searchable ? input.current : list.current)?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (tabbing.current || !trigger.current?.getClientRects().length)
              event.preventDefault();
          }}
          onKeyDown={onKeyDown}
        >
          {searchable && (
            <div className="select-search">
              <Search size={15} aria-hidden="true" />
              <input
                ref={input}
                role="combobox"
                aria-label={`Search ${label.toLocaleLowerCase()}`}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-activedescendant={
                  current ? optionId(current.value) : undefined
                }
                autoComplete="off"
                spellCheck={false}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(undefined);
                }}
              />
            </div>
          )}
          <div
            ref={list}
            id={`${id}-list`}
            className="select-options"
            role="listbox"
            aria-label={label}
            aria-activedescendant={
              !searchable && current ? optionId(current.value) : undefined
            }
            tabIndex={searchable ? undefined : 0}
          >
            {filtered.map((option) => (
              <div
                id={optionId(option.value)}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className="select-option"
                data-active={current?.value === option.value || undefined}
                onPointerMove={() => {
                  if (!option.disabled) setActive(option.value);
                }}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={16} aria-hidden="true" />
                )}
              </div>
            ))}
            {!filtered.length && (
              <div className="select-empty" role="status">
                No results
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
