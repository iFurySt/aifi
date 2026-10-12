import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, X, ArrowUpRight, Sparkles } from "lucide-react";
import { useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="brand">
      <svg
        width={small ? 24 : 29}
        height={small ? 24 : 29}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 25 15 6a1.1 1.1 0 0 1 2 0l10 19M9 18h14M12 25l4-7 4 7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>aifi</span>
    </span>
  );
}
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props} />
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}
export function Status({ active }: { active: boolean }) {
  return (
    <span className={`status ${active ? "active" : ""}`}>
      <span className="status-dot" />
      {active ? "Active" : "Paused"}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Sparkles size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  sheet = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  sheet?: boolean;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  // Capture before descendants mount: an autoFocus input may otherwise replace
  // the launcher before Radix emits its opening autofocus event.
  if (open && !wasOpen.current)
    previousFocus.current = document.activeElement as HTMLElement;
  wasOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={sheet ? "dialog-content detail-sheet" : "dialog-content"}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (previousFocus.current?.isConnected)
              previousFocus.current.focus();
            else document.getElementById("main-content")?.focus();
          }}
          onOpenAutoFocus={(event) => {
            // Let form fields receive focus; otherwise focus the close control.
            const content = event.currentTarget as HTMLElement;
            if (!content.querySelector("input, textarea")) {
              event.preventDefault();
              content.querySelector<HTMLButtonElement>("[data-close]")?.focus();
            }
          }}
        >
          <header className="dialog-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description
                className={description ? "dialog-description" : "sr-only"}
              >
                {description ?? "Workspace details and available actions."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="icon-button"
                data-close
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ActionMenu({
  items,
}: {
  items: {
    label: string;
    action: () => void;
    danger?: boolean;
    disabled?: boolean;
  }[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-button" aria-label="Agent actions">
          <MoreHorizontal size={19} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="dropdown-menu"
          sideOffset={5}
          align="end"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              className={`dropdown-item ${item.danger ? "danger" : ""}`}
              disabled={item.disabled}
              onSelect={item.action}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Sparkline({
  points,
  positive,
}: {
  points: number[];
  positive: boolean;
}) {
  const min = Math.min(...points),
    max = Math.max(...points);
  const path = points
    .map(
      (v, i) =>
        `${(i * 100) / (points.length - 1)},${28 - ((v - min) / (max - min || 1)) * 24}`,
    )
    .join(" ");
  return (
    <svg
      className={`sparkline ${positive ? "positive" : "negative"}`}
      viewBox="0 0 100 32"
      role="img"
      aria-label={`Illustrative ${positive ? "upward" : "downward"} price trend`}
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
