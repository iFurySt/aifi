import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  StockDirectoryRepository,
  DirectoryPage,
  DirectoryLookup,
} from "@aifi/core";

export const StockDirectoryContext =
  createContext<StockDirectoryRepository | null>(null);
export function useStockDirectory() {
  const repository = useContext(StockDirectoryContext);
  if (!repository) throw Error("Stock directory repository is missing.");
  return repository;
}
const emptyPage: DirectoryPage = {
  snapshotId: "",
  scope: "candidates",
  total: 0,
  offset: 0,
  items: [],
};
const emptyLookup: DirectoryLookup = { snapshotId: "", item: null };
/** Discard stale search/route responses; periodic reads discover background imports. */
function useRead<T>(
  key: string,
  read: () => Promise<T>,
  empty: T,
  delay: number,
  enabled = true,
) {
  const [state, setState] = useState({
    key: "",
    data: empty,
    loading: true,
    error: "",
  });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true,
      sequence = 0;
    const load = async () => {
      const current = ++sequence;
      try {
        const data = await read();
        if (alive && sequence === current)
          setState({ key, data, loading: false, error: "" });
      } catch {
        if (alive && sequence === current)
          setState((s) => ({
            key,
            data: s.key === key ? s.data : empty,
            loading: false,
            error: "Directory unavailable",
          }));
      }
    };
    setState((s) => ({
      key,
      data: s.key === key ? s.data : empty,
      loading: true,
      error: "",
    }));
    const timer = setTimeout(() => void load(), delay);
    const interval = setInterval(() => void load(), 60000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", focus);
    };
  }, [key, read, empty, delay, enabled, revision]);
  if (!enabled) return { data: empty, loading: false, error: "", retry };
  return {
    ...(state.key === key ? state : { data: empty, loading: true, error: "" }),
    retry,
  };
}
export function useDirectorySearch(
  query: string,
  limit = 50,
  offset = 0,
  enabled = true,
) {
  const repository = useStockDirectory();
  const read = useCallback(
    () => repository.search({ query: query.trim(), limit, offset }),
    [repository, query, limit, offset],
  );
  return useRead(
    JSON.stringify([query, limit, offset]),
    read,
    emptyPage,
    180,
    enabled,
  );
}
export function useDirectoryEntry(symbol: string) {
  const repository = useStockDirectory();
  const read = useCallback(() => repository.get(symbol), [repository, symbol]);
  return useRead(symbol, read, emptyLookup, 0);
}
export function directoryExchange(entry: { exchangeCode: string }) {
  return (
    (
      {
        N: "NYSE",
        A: "NYSE American",
        P: "NYSE Arca",
        Z: "Cboe BZX",
        V: "IEX",
        Q: "NASDAQ",
      } as Record<string, string>
    )[entry.exchangeCode] ?? entry.exchangeCode
  );
}
