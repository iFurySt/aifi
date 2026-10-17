import { useState } from "react";
import {
  Settings2,
  Sun,
  Database,
  Plug,
  KeyRound,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import type { SettingsSection } from "@aifi/core";
import { useWorkspace } from "../workspace-context";
export const settingItems: {
  id: SettingsSection;
  label: string;
  group: string;
  icon: typeof Sun;
}[] = [
  { id: "general", label: "General", group: "Personal", icon: Settings2 },
  { id: "appearance", label: "Appearance", group: "Personal", icon: Sun },
  { id: "chatgpt", label: "ChatGPT", group: "Personal", icon: Sparkles },
  { id: "sources", label: "Data sources", group: "Data", icon: Plug },
  { id: "keys", label: "API keys", group: "Data", icon: KeyRound },
  { id: "sync", label: "Sync", group: "Data", icon: RefreshCw },
  { id: "storage", label: "Storage", group: "Data", icon: Database },
];
export function SettingsSidebar({ onSelect }: { onSelect?: () => void }) {
  const { settingsSection } = useWorkspace();
  const [query, setQuery] = useState("");
  return (
    <div className="sidebar-inner settings-sidebar">
      <h2>Settings</h2>
      <label className="search-field settings-search">
        <Search size={16} />
        <input
          aria-label="Search settings"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <nav aria-label="Settings categories">
        {["Personal", "Data"].map((group) => (
          <div className="settings-nav-group" key={group}>
            <small>{group}</small>
            {settingItems
              .filter(
                (x) =>
                  x.group === group &&
                  x.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#/settings/${id}`}
                  className={`settings-nav-link ${settingsSection === id ? "selected" : ""}`}
                  aria-current={settingsSection === id ? "page" : undefined}
                  onClick={onSelect}
                >
                  <Icon size={17} />
                  {label}
                </a>
              ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
