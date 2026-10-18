export const settingsSections = [
  "appearance",
  "chatgpt",
  "sources",
  "keys",
  "sync",
  "storage",
] as const;
export type SettingsSection = (typeof settingsSections)[number];
export function parseSettingsSection(hash: string): SettingsSection {
  const section = hash
    .replace(/^#\/?/, "")
    .split("?")[0]
    ?.split("/")[1] as SettingsSection;
  return settingsSections.includes(section) ? section : "appearance";
}
export interface DataSettings {
  revision: number;
  directoryEnabled: boolean;
  automatic: boolean;
  intervalHours: number;
  secUserAgent: string;
}
export type CredentialProvider = "massive" | "alpaca" | "fmp";
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
  | "storage.details"
  | "storage.read"
  | "storage.files"
  | "storage.reveal"
  | "research.read"
  | "research.status"
  | "research.settings"
  | "research.sync"
  | "status"
  | "settings.save"
  | "directory.sync"
  | "directory.list"
  | "directory.get"
  | "fund.logo"
  | "stock.logo"
  | "stock.logos.cached"
  | "credentials.set"
  | "credentials.remove";
export const dataMethods: readonly DataMethod[] = [
  "storage.details",
  "storage.read",
  "storage.files",
  "storage.reveal",
  "research.read",
  "research.status",
  "research.settings",
  "research.sync",
  "status",
  "settings.save",
  "directory.sync",
  "directory.list",
  "directory.get",
  "fund.logo",
  "stock.logo",
  "stock.logos.cached",
  "credentials.set",
  "credentials.remove",
];
