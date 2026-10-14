export interface RuntimeInfo {
  kind: "web" | "desktop";
  version: string;
  platform: string;
}

declare global {
  interface Window {
    aifiDesktop?: {
      getRuntimeInfo(): Promise<RuntimeInfo>;
      requestData(
        method: import("@aifi/core").DataMethod,
        params?: unknown,
      ): Promise<unknown>;
    };
  }
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  return (
    window.aifiDesktop?.getRuntimeInfo() ?? {
      kind: "web",
      version: "0.1.0",
      platform: "browser",
    }
  );
}
export * from "./storage";

export * from "./data-service";

export * from "./stock-directory";

export * from "./stock-logos";
