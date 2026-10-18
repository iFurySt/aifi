import * as Popover from "@radix-ui/react-popover";
import { Check, Plus, Search } from "lucide-react";
import { useRef, useState } from "react";
import { stockDisplayName } from "@aifi/core";
import { useDirectorySearch } from "../stock-directory-context";
import { SkeletonRows } from "./Skeleton";

export function StockComparePicker({
  symbol,
  selected,
  onChange,
}: {
  symbol: string;
  selected: string[];
  onChange: (symbols: string[]) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const result = useDirectorySearch(query, 12, 0, open);
  const items = result.data.items.filter((e) => e.symbol !== symbol);
  const choose = (next: string) =>
    onChange(
      selected.includes(next)
        ? selected.filter((s) => s !== next)
        : selected.length < 3
          ? [...selected, next]
          : selected,
    );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setQuery("");
      }}
    >
      <Popover.Trigger className="stock-chart-tool" aria-label="Compare stocks">
        <Plus size={14} />
        <span>Compare</span>
        {selected.length > 0 && <small>{selected.length}</small>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={host}
          className="select-popover stock-compare-popup"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label="Compare stocks"
          onKeyDown={(e) => {
            if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
            const controls = [
              ...host.current!.querySelectorAll<HTMLElement>(
                "input, button:not(:disabled)",
              ),
            ];
            const index = controls.indexOf(
              document.activeElement as HTMLElement,
            );
            e.preventDefault();
            controls[
              (index + (e.key === "ArrowDown" ? 1 : -1) + controls.length) %
                controls.length
            ]?.focus();
          }}
        >
          <label className="select-search">
            <Search size={15} />
            <input
              aria-label="Find comparison stock"
              placeholder="Search stocks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && items[0]) {
                  e.preventDefault();
                  choose(items[0].symbol);
                }
              }}
            />
          </label>
          <div className="select-options">
            {result.loading && !result.data.items.length ? (
              <SkeletonRows
                label="Loading comparison stocks"
                rows={3}
                trailing={false}
                className="skeleton-search"
              />
            ) : (
              items.map((entry) => (
                <button
                  className="stock-compare-option"
                  key={entry.symbol}
                  aria-pressed={selected.includes(entry.symbol)}
                  disabled={
                    !selected.includes(entry.symbol) && selected.length >= 3
                  }
                  onClick={() => choose(entry.symbol)}
                >
                  <span>
                    <strong>{entry.symbol}</strong>
                    <small>
                      {stockDisplayName(undefined, entry.name, entry.symbol)}
                    </small>
                  </span>
                  {selected.includes(entry.symbol) && <Check size={15} />}
                </button>
              ))
            )}
            {result.error && (
              <div className="select-empty" role="status">
                Couldn't read stocks.{" "}
                <button className="text-link" onClick={result.retry}>
                  Retry
                </button>
              </div>
            )}
            {!result.loading && !result.error && !items.length && (
              <div className="select-empty">No matching stocks</div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
