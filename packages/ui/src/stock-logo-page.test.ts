import { afterEach, expect, it, vi } from "vitest";
import type { DirectoryPage, StockDirectoryRepository } from "@aifi/core";
import { DirectoryFeed } from "@aifi/core";
import { withPreparedStockLogos } from "./stock-logo-page";
import { peekPreparedStockLogo } from "./stock-logo-image";
const page: DirectoryPage = {
  snapshotId: "fixture",
  scope: "candidates",
  total: 2,
  offset: 0,
  items: ["AAPL", "MISSING"].map((symbol) => ({
    id: symbol,
    symbol,
    name: symbol,
    exchangeCode: "Q",
    source: "fixture",
    securityType: "stock",
  })),
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("publishes a whole page only after disk hits decode, without issuing cold provider reads", async () => {
  let decode!: () => void;
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 8;
      naturalHeight = 8;
      decode = () =>
        new Promise<void>((resolve) => {
          decode = resolve;
        });
    },
  );
  vi.stubGlobal("document", {
    createElement: () => ({ getContext: () => null }),
  });
  const logo = {
    dataUrl: "data:image/png;base64,fixture",
    source: "fixture",
    fetchedAt: "",
  };
  const get = vi.fn(() => new Promise<null>(() => {})); // Permanently blocked provider.
  const logos = {
    get,
    getCached: vi.fn(async () => [{ symbol: "AAPL", logo }]),
  };
  const directory: StockDirectoryRepository = {
    search: async () => page,
    get: vi.fn(),
  };
  const publish = vi.fn();
  const feed = new DirectoryFeed(
    withPreparedStockLogos(directory, logos),
    publish,
  );
  const loading = feed.reset("");
  await vi.waitFor(() => expect(decode).toBeTypeOf("function"));
  expect(feed.state.items).toEqual([]);
  decode();
  await loading;
  expect(feed.state.items).toEqual(page.items);
  expect(peekPreparedStockLogo(logo)?.url).toBe(logo.dataUrl);
  expect(logos.getCached).toHaveBeenCalledWith(["AAPL", "MISSING"]);
  expect(get).not.toHaveBeenCalled();
});
it("ignores stale batches and keeps directory usable when its decorative cache fails", async () => {
  let finish!: () => void;
  const first = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const cache = vi
    .fn()
    .mockImplementationOnce(() => first.then(() => []))
    .mockRejectedValue(Error("busy"));
  const repository = withPreparedStockLogos(
    {
      search: async (q) => ({
        ...page,
        items: [{ ...page.items[0]!, symbol: q.query }],
      }),
      get: vi.fn(),
    },
    { get: vi.fn(), getCached: cache },
  );
  const feed = new DirectoryFeed(repository, () => {});
  const old = feed.reset("OLD");
  await vi.waitFor(() => expect(cache).toHaveBeenCalledTimes(1));
  await feed.reset("NEW");
  finish();
  await old;
  expect(feed.state.items[0]?.symbol).toBe("NEW");
  expect(feed.state.error).toBe("");
});

it("shows directory rows within the budget when the decorative cache never settles", async () => {
  vi.useFakeTimers();
  const get = vi.fn();
  const repository = withPreparedStockLogos(
    { search: async () => page, get: vi.fn() },
    {
      get,
      getCached: () => new Promise(() => {}),
    },
  );
  const feed = new DirectoryFeed(repository, () => {});
  const pending = feed.reset("");
  await vi.advanceTimersByTimeAsync(81);
  await pending;
  expect(feed.state.items).toEqual(page.items);
  expect(feed.state.loading).toBe(false);
  expect(get).not.toHaveBeenCalled();
});
