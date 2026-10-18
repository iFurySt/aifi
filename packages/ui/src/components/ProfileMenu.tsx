import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowUpRight,
  Gauge,
  GitFork,
  Settings,
  UserRound,
} from "lucide-react";
import { AIFI_REPOSITORY_URL } from "@aifi/core";
import { useWorkspace } from "../workspace-context";
import { useChatGPT } from "../chatgpt-context";
import { workspaceShortcut, shortcutModifier } from "./workspace-shortcuts";
import { AccountProviderBadge } from "./AccountProviderBadge";

export function ProfileMenu({ mobile = false }: { mobile?: boolean }) {
  const { navigate } = useWorkspace();
  const [open, setOpen] = useState(false);
  const { available, status, busy, signingIn, action } = useChatGPT();
  const active = status?.profiles.find((p) => p.id === status.activeProfileId);
  const connected = !!active?.connected;
  const name = connected
    ? active.name || active.label
    : signingIn
      ? "Signing in…"
      : "Sign in with ChatGPT";
  const initials = connected
    ? (active.name || active.email || active.label)
        .trim()
        .slice(0, 1)
        .toLocaleUpperCase()
    : "";
  const avatar = (
    <span className="profile-avatar" aria-hidden="true">
      {initials || <UserRound size={22} strokeWidth={1.6} />}
    </span>
  );
  function signIn() {
    location.hash = "/settings/chatgpt";
    if (available && !busy && !signingIn)
      void action("signIn", active ? { profileId: active.id } : undefined);
  }
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={`profile-trigger ${mobile ? "mobile-profile" : "rail-profile"}`}
          aria-label="Account menu"
          title={name}
        >
          {avatar}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="dropdown-menu workspace-menu"
          side={mobile ? "bottom" : "right"}
          align="end"
          sideOffset={6}
          collisionPadding={10}
          aria-label="Account"
          onKeyDown={(event) => {
            if (workspaceShortcut(event.nativeEvent, !!window.aifiDesktop))
              setOpen(false);
          }}
        >
          <DropdownMenu.Item
            className="workspace-menu-identity dropdown-item"
            disabled={!connected && (busy || (available && !status))}
            onSelect={() => {
              if (connected || signingIn) location.hash = "/settings/chatgpt";
              else signIn();
            }}
          >
            {avatar}
            <span>
              <span className="workspace-menu-name">
                <strong>{name}</strong>
                {connected && <AccountProviderBadge provider="chatgpt" />}
              </span>
              {connected && active.email && <small>{active.email}</small>}
            </span>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="workspace-menu-separator" />
          {connected && (
            <DropdownMenu.Item
              className="dropdown-item"
              disabled={busy}
              onSelect={() => void action("openUsage")}
            >
              <Gauge size={17} strokeWidth={1.7} />
              Usage
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            className="dropdown-item"
            onSelect={() => navigate("settings")}
          >
            <Settings size={17} strokeWidth={1.7} />
            Settings
            <kbd className="account-shortcut">{shortcutModifier()} ,</kbd>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" asChild>
            <a
              href={AIFI_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitFork size={17} strokeWidth={1.7} />
              GitHub
              <ArrowUpRight
                size={14}
                className="account-shortcut"
                aria-hidden="true"
              />
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
