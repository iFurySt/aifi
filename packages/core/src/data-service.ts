export const settingsSections = [
  "general",
  "appearance",
  "sources",
  "sync",
  "storage",
] as const;
export type SettingsSection = (typeof settingsSections)[number];
export function parseSettingsSection(hash: string): SettingsSection {
  const section = hash
    .replace(/^#\/?/, "")
    .split("?")[0]
    ?.split("/")[1] as SettingsSection;
  return settingsSections.includes(section) ? section : "general";
}
export interface DataSettings {
  revision: number;
  directoryEnabled: boolean;
  automatic: boolean;
  intervalHours: number;
  secUserAgent: string;
}
export type CredentialProvider = "massive" | "alpaca";
export interface CredentialStatus {
  provider: CredentialProvider;
  fields: string[];
}
export interface DataStatus {
  settings: DataSettings;
  directory: {
    snapshotId: string;
    rows: number;
    candidates: number;
    sources: { name: string; fileCreationTime: string; fetchedAt: string }[];
    recentRuns: {
      id: string;
      state: string;
      startedAt: string;
      finishedAt?: string;
      error?: string;
    }[];
  };
  running: boolean;
  queued: boolean;
  offline: boolean;
  lastSuccess?: string;
  nextSync?: string;
  credentials: CredentialStatus[];
  dataDir: string;
  databaseBytes: number;
}
export type DataMethod =
  | "status"
  | "settings.save"
  | "directory.sync"
  | "directory.list"
  | "directory.get"
  | "stock.logo"
  | "stock.logos.cached"
  | "credentials.set"
  | "credentials.remove";
export const dataMethods: readonly DataMethod[] = [
  "status",
  "settings.save",
  "directory.sync",
  "directory.list",
  "directory.get",
  "stock.logo",
  "stock.logos.cached",
  "credentials.set",
  "credentials.remove",
];
