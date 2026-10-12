import {
  Bot,
  MessageCircle,
  Star,
  PieChart,
  BookOpen,
  Settings,
  Search,
  Plus,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { WorkspacePage } from "@aifi/core";
import { useWorkspace, pageLabels } from "../workspace-context";
import { IconButton, Logo, Modal } from "./primitives";
import type { ReactNode } from "react";
const destinations = [
  { page: "research", icon: MessageCircle },
  { page: "agents", icon: Bot },
  { page: "watchlist", icon: Star },
  { page: "portfolio", icon: PieChart },
  { page: "library", icon: BookOpen },
] as const;
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { workspace, page, navigate, openConversation, research } =
    useWorkspace();
  return (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <Logo />
        <IconButton
          label="New research"
          onClick={() => {
            research();
            onNavigate?.();
          }}
        >
          <Plus size={19} />
        </IconButton>
      </div>
      <nav aria-label="Main navigation">
        {destinations.map(({ page: target, icon: Icon }) => (
          <a
            key={target}
            href={`#/${target}`}
            className={`nav-link ${page === target ? "selected" : ""}`}
            aria-current={page === target ? "page" : undefined}
            onClick={() => onNavigate?.()}
          >
            <Icon size={19} strokeWidth={1.7} />
            {pageLabels[target]}
            {target === "agents" && (
              <span className="nav-count">{workspace.agents.length}</span>
            )}
          </a>
        ))}
      </nav>
      <div className="sidebar-recents">
        <p className="sidebar-label">Your research</p>
        {workspace.conversations.length === 0 ? (
          <p className="sidebar-hint">A place for your next idea.</p>
        ) : (
          workspace.conversations.slice(0, 6).map((conversation) => (
            <button
              key={conversation.id}
              className="recent-link"
              onClick={() => {
                openConversation(conversation);
                onNavigate?.();
              }}
              title={conversation.title}
            >
              {conversation.title}
            </button>
          ))
        )}
      </div>
      <div className="sidebar-bottom">
        <a
          href="#/settings"
          className={`nav-link ${page === "settings" ? "selected" : ""}`}
          aria-current={page === "settings" ? "page" : undefined}
          onClick={() => onNavigate?.()}
        >
          <Settings size={19} strokeWidth={1.7} />
          Settings
        </a>
        <button
          className="workspace-switch"
          onClick={() => {
            navigate("settings");
            onNavigate?.();
          }}
        >
          <span className="workspace-avatar">A</span>
          <span>
            <strong>Personal workspace</strong>
            <small>Saved on this device</small>
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const { workspace, update, page, navigate, storageError } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const matches = (
    [
      "agents",
      "research",
      "watchlist",
      "portfolio",
      "library",
      "settings",
    ] as WorkspacePage[]
  ).filter((p) => pageLabels[p].toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="app-shell">
      <div className="desktop-drag" aria-hidden="true" />
      <aside className="sidebar">
        <Navigation />
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <span className="mobile-menu">
              <IconButton
                label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={19} />
              </IconButton>
            </span>
            <span className="page-label">{pageLabels[page]}</span>
            <span className="demo-badge">Demo workspace</span>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setSearch("");
                setSearchOpen(true);
              }}
              aria-label="Search workspace"
            >
              <Search size={17} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <IconButton
              label={
                workspace.theme === "light"
                  ? "Switch to dark theme"
                  : "Switch to light theme"
              }
              onClick={() =>
                update((w) => ({
                  ...w,
                  theme: w.theme === "light" ? "dark" : "light",
                }))
              }
            >
              {workspace.theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </IconButton>
          </div>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            {storageError}
            <button onClick={() => navigate("settings")}>Open Settings</button>
          </div>
        )}
        <main
          tabIndex={-1}
          id="main-content"
          className={`main-content ${page === "research" ? "research-main" : ""}`}
        >
          {children}
        </main>
      </div>
      <Modal
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="Navigation"
        description="Move between your workspace pages."
        sheet
      >
        <Navigation onNavigate={() => setMobileOpen(false)} />
      </Modal>
      <Modal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search workspace"
        description="Find a page or an agent."
      >
        <label className="search-field">
          <Search size={18} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pages, agents…"
            aria-label="Search pages and agents"
          />
        </label>
        <div className="search-results">
          {matches.map((target) => (
            <button
              key={target}
              onClick={() => {
                navigate(target);
                setSearchOpen(false);
              }}
            >
              <FolderOpen size={17} />
              <span>{pageLabels[target]}</span>
              <small>Page</small>
            </button>
          ))}
          {workspace.agents
            .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
            .map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  navigate("agents");
                  location.hash = `/agents?agent=${encodeURIComponent(agent.id)}`;
                  setSearchOpen(false);
                }}
              >
                <Bot size={17} />
                <span>{agent.name}</span>
                <small>Agent</small>
              </button>
            ))}
          {matches.length === 0 &&
            !workspace.agents.some((a) =>
              a.name.toLowerCase().includes(search.toLowerCase()),
            ) && (
              <p className="muted">No matches. Try “Research” or “Earnings”.</p>
            )}
        </div>
      </Modal>
    </div>
  );
}
