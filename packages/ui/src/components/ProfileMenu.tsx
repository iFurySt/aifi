import { AccountProviderBadge } from "./AccountProviderBadge";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Gauge, LogIn, Settings, UserRound } from "lucide-react";
import { useWorkspace } from "../workspace-context";
import { useChatGPT } from "../chatgpt-context";
import { workspaceShortcut, shortcutModifier } from "./workspace-shortcuts";

export function ProfileMenu({ mobile = false }: { mobile?: boolean }) {
  const { navigate } = useWorkspace();
  const [open, setOpen] = useState(false);
  const { available, status, busy, signingIn, action } = useChatGPT();
  const active = status?.profiles.find((p) => p.id === status.activeProfileId);
  const connected = !!active?.connected;
  const name = connected ? active.name || active.label : "Not signed in";
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
    if (available)
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
          <DropdownMenu.Label className="workspace-menu-identity">
            {avatar}
            <span>
              <span className="workspace-menu-name">
                <strong>{name}</strong>
                {connected && <AccountProviderBadge provider="chatgpt" />}
              </span>
              {connected && active.email && <small>{active.email}</small>}
            </span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="workspace-menu-separator" />
          {connected ? (
            <DropdownMenu.Item
              className="dropdown-item"
              disabled={busy}
              onSelect={() => void action("openUsage")}
            >
              <Gauge size={17} strokeWidth={1.7} />
              Usage
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              className="dropdown-item"
              disabled={busy || signingIn}
              onSelect={signIn}
            >
              <LogIn size={17} strokeWidth={1.7} />
              {signingIn ? "Signing in…" : "Continue with ChatGPT"}
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
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
