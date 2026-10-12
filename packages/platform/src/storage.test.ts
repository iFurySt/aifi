import { expect, it } from "vitest";
import { readWorkspace, workspaceKey, writeWorkspace } from "./storage";
import type { StoragePort } from "./storage";
it("preserves corrupted data and reports a recoverable fallback", () => {
  const saved = new Map([[workspaceKey, "{broken"]]);
  const storage: StoragePort = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      saved.set(key, value);
    },
    removeItem: (key) => {
      saved.delete(key);
    },
  };
  const result = readWorkspace(storage, () => ({ demo: true }), JSON.parse);
  expect(result.value).toEqual({ demo: true });
  expect(result.error).toContain("temporary demo");
  expect(saved.get(workspaceKey)).toBe("{broken");
});
it("keeps unavailable storage from crashing a working session", () => {
  const storage: StoragePort = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {},
  };
  expect(readWorkspace(storage, () => "fallback", JSON.parse).value).toBe(
    "fallback",
  );
  expect(writeWorkspace(storage, { local: true })).toContain(
    "could not be saved",
  );
});
it("stores data under the versioned app key", () => {
  const saved = new Map<string, string>();
  const storage: StoragePort = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      saved.set(key, value);
    },
    removeItem: (key) => {
      saved.delete(key);
    },
  };
  expect(writeWorkspace(storage, { theme: "dark" })).toBeUndefined();
  expect(readWorkspace(storage, () => null, JSON.parse).value).toEqual({
    theme: "dark",
  });
});
