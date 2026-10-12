export interface RuntimeInfo {
  kind: 'web' | 'desktop';
  version: string;
  platform: string;
}

declare global {
  interface Window {
    aifiDesktop?: { getRuntimeInfo(): Promise<RuntimeInfo> };
  }
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  return window.aifiDesktop?.getRuntimeInfo() ?? {
    kind: 'web',
    version: '0.1.0',
    platform: 'browser',
  };
}
