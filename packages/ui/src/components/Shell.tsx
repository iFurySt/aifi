import {
  Bot,
  MessageCircle,
  Star,
  PieChart,
  BookOpen,
  Search,
  Menu,
  Sun,
  Moon,
  FolderOpen,
  ChartNoAxesCombined,
  ArrowLeft,
  ArrowRight,
  PanelLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { workspacePages, sampleQuotes, stockHref } from "@aifi/core";
import { useWorkspace, pageLabels } from "../workspace-context";
import { IconButton, Logo, Modal } from "./primitives";
import type { ReactNode } from "react";
import { useWorkspaceHistory } from "./useWorkspaceHistory";
import { ProfileMenu } from "./ProfileMenu";
import { StockSidebar } from "./StockSidebar";
const destinations = [
  { page: "stocks", icon: ChartNoAxesCombined },
  { page: "research", icon: MessageCircle },
  { page: "agents", icon: Bot },
  { page: "watchlist", icon: Star },
  { page: "portfolio", icon: PieChart },
  { page: "library", icon: BookOpen },
] as const;
function AppNavigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { page, stockRoute } = useWorkspace();
  return (
    <nav
      className={mobile ? "mobile-app-navigation" : "rail-destinations"}
      aria-label="Main navigation"
    >
      {destinations.map(({ page: target, icon: Icon }) => (
        <a
          key={target}
          href={
            target === "stocks"
              ? stockHref(stockRoute.symbol, stockRoute.tab)
              : `#/${target}`
          }
          className={`rail-button ${page === target ? "selected" : ""}`}
          title={pageLabels[target]}
          aria-label={pageLabels[target]}
          aria-current={page === target ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon size={21} strokeWidth={1.7} />
          <span>{pageLabels[target]}</span>
        </a>
      ))}
    </nav>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const {
    workspace,
    update,
    page,
    navigate,
    storageError,
    openStock,
    stockRoute,
    openConversation,
  } = useWorkspace();
  const desktop = !!window.aifiDesktop;
  useEffect(() => {
    if (page !== "research")
      document
        .getElementById("main-content")
        ?.scrollTo({ top: 0, behavior: "instant" });
  }, [page, stockRoute.symbol, stockRoute.tab]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const routeHistory = useWorkspaceHistory();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
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
  const matches = workspacePages.filter((p) =>
    pageLabels[p].toLowerCase().includes(search.toLowerCase()),
  );
  const demoBadge = (
    <button
      className="demo-badge"
      aria-label="About demo data"
      onClick={() => setDemoOpen(true)}
    >
      Demo
    </button>
  );
  const toolbarActions = (
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
        {workspace.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </IconButton>
      <ProfileMenu mobile />
    </div>
  );
  const navigationToggle = (
    <>
      <span className="sidebar-toggle">
        <IconButton
          label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="workspace-sidebar"
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          <PanelLeft size={18} />
        </IconButton>
      </span>
      <span className="mobile-menu">
        <IconButton label="Open navigation" onClick={() => setMobileOpen(true)}>
          <Menu size={19} />
        </IconButton>
      </span>
    </>
  );
  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${desktop ? "desktop-shell" : "web-shell"}`}
    >
      {desktop && (
        <header className="window-toolbar">
          <div className="window-navigation">
            <span className="native-window-space" aria-hidden="true" />
            <IconButton
              label="Go back"
              disabled={!routeHistory.canGoBack}
              onClick={routeHistory.back}
            >
              <ArrowLeft size={18} />
            </IconButton>
            <IconButton
              label="Go forward"
              disabled={!routeHistory.canGoForward}
              onClick={routeHistory.forward}
            >
              <ArrowRight size={18} />
            </IconButton>
            {navigationToggle}
          </div>
          <div className="window-title">
            <FolderOpen size={16} />
            <span>AIFi</span>
            <span className="breadcrumb-divider">/</span>
            <span>{pageLabels[page]}</span>
            {demoBadge}
          </div>
          {toolbarActions}
        </header>
      )}
      <div className="workspace-body">
        <div className="tool-rail" aria-label="Workspace tools">
          <div className="rail-brand">
            <Logo small />
          </div>
          <AppNavigation />
          <span className="rail-separator" />
          <button
            className="rail-button rail-search"
            aria-label="Search the workspace"
            title="Search"
            onClick={() => {
              setSearch("");
              setSearchOpen(true);
            }}
          >
            <Search size={20} />
            <span>Search</span>
          </button>
          <ProfileMenu />
        </div>
        <div className="workspace-panel">
          <aside className="sidebar" id="workspace-sidebar">
            <StockSidebar />
          </aside>
          <div className="main-shell">
            {!desktop && (
              <header className="topbar">
                <div className="topbar-left">
                  {navigationToggle}
                  <span className="page-label">{pageLabels[page]}</span>
                  {demoBadge}
                </div>
                {toolbarActions}
              </header>
            )}
            {storageError && (
              <div className="storage-warning" role="alert">
                {storageError}
                <button onClick={() => navigate("settings")}>
                  Open Settings
                </button>
              </div>
            )}
            <main
              tabIndex={-1}
              id="main-content"
              className={`main-content ${page === "research" ? "research-main" : page === "stocks" ? "stock-main" : ""}`}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
      <Modal
        open={demoOpen}
        onOpenChange={setDemoOpen}
        title="Demo data"
        description="Sample quotes, holdings and replies. No live research, account sync or background monitoring."
      >
        <div className="dialog-actions">
          <button
            className="button button-primary"
            onClick={() => setDemoOpen(false)}
          >
            Got it
          </button>
        </div>
      </Modal>
      <Modal
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="Navigation"
        sheet
      >
        <AppNavigation mobile onNavigate={() => setMobileOpen(false)} />
        <StockSidebar onSelect={() => setMobileOpen(false)} />
      </Modal>
      <Modal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search workspace"
      >
        <label className="search-field">
          <Search size={18} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Stocks, chats, agents…"
            aria-label="Search workspace content"
          />
        </label>
        <div className="search-results">
          {Object.entries(sampleQuotes)
            .filter(([symbol, quote]) =>
              `${symbol} ${quote.name}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map(([symbol, quote]) => (
              <button
                key={symbol}
                onClick={() => {
                  openStock(symbol);
                  setSearchOpen(false);
                }}
              >
                <ChartNoAxesCombined size={17} />
                <span>
                  {symbol} · {quote.name}
                </span>
                <small>Stock</small>
              </button>
            ))}
          {workspace.conversations
            .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 6)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  openConversation(c);
                  setSearchOpen(false);
                }}
              >
                <MessageCircle size={17} />
                <span>{c.title}</span>
                <small>Chat</small>
              </button>
            ))}
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
            !Object.entries(sampleQuotes).some(([symbol, q]) =>
              `${symbol} ${q.name}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ) &&
            !workspace.conversations.some((c) =>
              c.title.toLowerCase().includes(search.toLowerCase()),
            ) &&
            !workspace.agents.some((a) =>
              a.name.toLowerCase().includes(search.toLowerCase()),
            ) && <p className="muted">No matches.</p>}
        </div>
      </Modal>
    </div>
  );
}
