import { FundLogoContext } from "./fund-logo-context";
import { createLocalFundLogos } from "@aifi/platform";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDemoWorkspace,
  decodeWorkspace,
  workspacePages,
  parseStockRoute,
  stockHref,
  parseSettingsSection,
} from "@aifi/core";
import type {
  Conversation,
  Workspace,
  WorkspacePage,
  StockTab,
  StockCollection,
  StockDirectoryRepository,
  StockLogoRepository,
 StockResearchRepository,
} from "@aifi/core";
import {
  readStockCollection,
  writeStockCollection,
  createLocalStockDirectory,
  createLocalStockLogos,
 createLocalStockResearch,
  getRuntimeInfo,
  readWorkspace,
  writeWorkspace,
} from "@aifi/platform";
import type { StoragePort } from "@aifi/platform";
import { WorkspaceContext } from "./workspace-context";
import { ChatGPTProvider } from "./chatgpt-context";
import {
  StockDirectoryContext,
  StockLogoContext,
  useDirectoryWarmup,
} from "./stock-directory-context";
import { Shell } from "./components/Shell";
import { useResolvedTheme } from "./use-resolved-theme";
import { Agents } from "./pages/Agents";
import { Research } from "./pages/Research";
import { Watchlist } from "./pages/Watchlist";
import { Portfolio } from "./pages/Portfolio";
import { Library } from "./pages/Library";
import { Settings } from "./pages/Settings";
import { Stocks } from "./pages/Stocks";
const storage: StoragePort = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};
function currentPage(): WorkspacePage {
  const candidate = location.hash
    .replace(/^#\/?/, "")
    .split("?")[0]
    ?.split("/")[0];
  return workspacePages.includes(candidate as WorkspacePage)
    ? (candidate as WorkspacePage)
    : "stocks";
}
import { StockResearchContext } from "./stock-research-context";
const localResearch=createLocalStockResearch();
const localDirectory = createLocalStockDirectory();
const localLogos = createLocalStockLogos();
const localFundLogos = createLocalFundLogos();
export function App({
  directory = localDirectory,
  logos = localLogos,
  fundLogos = localFundLogos,
  stockResearch = localResearch,
}: {
  directory?: StockDirectoryRepository;
  logos?: StockLogoRepository;
  fundLogos?: Pick<StockLogoRepository, "get" | "peek">;
  stockResearch?: StockResearchRepository;
} = {}) {
  const [loaded] = useState(() =>
    readWorkspace(storage, createDemoWorkspace, decodeWorkspace),
  );
  const [workspace, setWorkspace] = useState(loaded.value);
  const resolvedTheme = useResolvedTheme(workspace.theme);
  const [storageError, setStorageError] = useState(loaded.error);
  const blocked = useRef(!!loaded.error);
  const dirty = useRef(false);
  const [page, setPage] = useState(currentPage);
  const [stockCollection, setStockCollection] = useState(() =>
    readStockCollection(storage),
  );
  const [stockRoute, setStockRoute] = useState(() =>
    parseStockRoute(location.hash),
  );
  const [settingsSection, setSettingsSection] = useState(() =>
    parseSettingsSection(location.hash),
  );
  useDirectoryWarmup(directory, logos, stockCollection, workspace.watchlist);
  const openStock = useCallback((symbol: string, tab?: StockTab) => {
    location.hash = stockHref(symbol, tab).slice(1);
  }, []);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const navigate = useCallback(
    (target: WorkspacePage) => {
      location.hash =
        target === "stocks"
          ? stockHref(stockRoute.symbol, stockRoute.tab).slice(1)
          : `/${target}`;
      setPage(target);
    },
    [stockRoute],
  );
  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  }, []);
  const selectStockCollection = useCallback(
    (collection: StockCollection) => {
      setStockCollection(collection);
      if (!writeStockCollection(storage, collection))
        notify("Selection couldn't be saved.");
    },
    [notify],
  );
  const update = useCallback((change: (current: Workspace) => Workspace) => {
    dirty.current = true;
    setWorkspace(change);
  }, []);
  const research = useCallback(
    (prompt = "") => {
      setConversationId(null);
      setDraft(prompt);
      navigate("research");
    },
    [navigate],
  );
  const openConversation = useCallback(
    (conversation: Conversation | null) => {
      setConversationId(conversation?.id ?? null);
      setDraft("");
      navigate("research");
    },
    [navigate],
  );
  const clearDraft = useCallback(() => setDraft(""), []);
  useEffect(() => {
    const change = () => {
      const nextPage = currentPage();
      setPage(nextPage);
      if (nextPage === "settings")
        setSettingsSection(parseSettingsSection(location.hash));
      if (nextPage === "stocks") setStockRoute(parseStockRoute(location.hash));
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);
  useEffect(() => {
    if (dirty.current && !blocked.current)
      setStorageError(writeWorkspace(storage, workspace));
  }, [workspace]);
  useEffect(() => {
    void getRuntimeInfo()
      .then((info) => {
        document.documentElement.dataset.runtime = info.kind;
        document.documentElement.dataset.platform = info.platform;
      })
      .catch(() => notify("Window controls may be limited."));
    return () => clearTimeout(toastTimer.current);
  }, [notify]);
  return (
    <ChatGPTProvider>
    <StockResearchContext.Provider value={stockResearch}><FundLogoContext.Provider value={fundLogos}><StockLogoContext.Provider value={logos}>
      <StockDirectoryContext.Provider value={directory}>
        <WorkspaceContext.Provider
          value={{
            workspace,
            resolvedTheme,
            update,
            page,
            navigate,
            stockRoute,
            stockCollection,
            selectStockCollection,
            settingsSection,
            openStock,
            notify,
            research,
            conversationId,
            openConversation,
            storageError,
          }}
        >
          <a
            className="skip-link"
            href="#main-content"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("main-content")?.focus();
            }}
          >
            Skip to content
          </a>
          <Shell>
            {page === "stocks" && <Stocks />}
            {page === "agents" && <Agents />}
            {page === "research" && (
              <Research draft={draft} clearDraft={clearDraft} />
            )}
            {page === "watchlist" && <Watchlist />}
            {page === "portfolio" && <Portfolio />}
            {page === "library" && <Library />}
            {page === "settings" && <Settings />}
          </Shell>
          <div
            className={`toast ${toast ? "visible" : ""}`}
            role="status"
            aria-live="polite"
          >
            {toast}
          </div>
        </WorkspaceContext.Provider>
      </StockDirectoryContext.Provider>
    </StockLogoContext.Provider></FundLogoContext.Provider></StockResearchContext.Provider>
    </ChatGPTProvider>
  );
}
