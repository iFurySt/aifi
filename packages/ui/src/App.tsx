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
} from "@aifi/core";
import {
  readStockCollection,
  writeStockCollection,
  createLocalStockDirectory,
  createLocalStockLogos,
  getRuntimeInfo,
  readWorkspace,
  writeWorkspace,
} from "@aifi/platform";
import type { StoragePort } from "@aifi/platform";
import { WorkspaceContext } from "./workspace-context";
import {
  StockDirectoryContext,
  StockLogoContext,
} from "./stock-directory-context";
import { Shell } from "./components/Shell";
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
const localDirectory = createLocalStockDirectory();
const localLogos = createLocalStockLogos();
export function App({
  directory = localDirectory,
  logos = localLogos,
}: { directory?: StockDirectoryRepository; logos?: StockLogoRepository } = {}) {
  const [loaded] = useState(() =>
    readWorkspace(storage, createDemoWorkspace, decodeWorkspace),
  );
  const [workspace, setWorkspace] = useState(loaded.value);
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
  function reset() {
    const next = createDemoWorkspace();
    const error = writeWorkspace(storage, next);
    blocked.current = !!error;
    dirty.current = false;
    setWorkspace(next);
    setStorageError(error);
    setConversationId(null);
    setDraft("");
    notify(
      error
        ? "Reset for this session. Saving is unavailable."
        : "Workspace reset.",
    );
  }
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
    document.documentElement.dataset.theme = workspace.theme;
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
    <StockLogoContext.Provider value={logos}>
      <StockDirectoryContext.Provider value={directory}>
        <WorkspaceContext.Provider
          value={{
            workspace,
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
            reset,
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
    </StockLogoContext.Provider>
  );
}
