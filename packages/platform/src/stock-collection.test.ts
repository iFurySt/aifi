import { it, expect, vi } from "vitest";
import {
  readStockCollection,
  writeStockCollection,
  stockCollectionKey,
} from "./stock-collection";
it("persists only a valid viewing selection and falls back safely on corrupt/blocked storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  expect(readStockCollection(storage)).toBe("all-us");
  expect(writeStockCollection(storage, "sp500")).toBe(true);
  expect(readStockCollection(storage)).toBe("sp500");
  values.set(stockCollectionKey, "unsafe-group");
  expect(readStockCollection(storage)).toBe("all-us");
  const blocked = {
    ...storage,
    getItem: vi.fn(() => {
      throw Error("blocked");
    }),
    setItem: vi.fn(() => {
      throw Error("blocked");
    }),
  };
  expect(readStockCollection(blocked)).toBe("all-us");
  expect(writeStockCollection(blocked, "nasdaq100")).toBe(false);
});
