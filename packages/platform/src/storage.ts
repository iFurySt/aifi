export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const workspaceKey = "aifi.workspace.v1";
export type StorageResult<T> = { value: T; error?: string };
export function readWorkspace<T>(
  storage: StoragePort,
  fallback: () => T,
  decode: (raw: string) => T,
): StorageResult<T> {
  try {
    const raw = storage.getItem(workspaceKey);
    return { value: raw === null ? fallback() : decode(raw) };
  } catch {
    return {
      value: fallback(),
      error:
        "Saved data could not be loaded. A temporary demo is open. Reset local data in Settings to save again.",
    };
  }
}
export function writeWorkspace(
  storage: StoragePort,
  value: unknown,
): string | undefined {
  try {
    storage.setItem(workspaceKey, JSON.stringify(value));
    return undefined;
  } catch {
    return "Changes could not be saved on this device. Your current session still works.";
  }
}
