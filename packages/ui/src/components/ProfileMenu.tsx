import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Moon, Settings, Sun } from "lucide-react";
import { useWorkspace } from "../workspace-context";

export function ProfileMenu({ mobile = false }: { mobile?: boolean }) {
  const { workspace, update, navigate } = useWorkspace();
  const dark = workspace.theme === "dark";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`profile-trigger ${mobile ? "mobile-profile" : "rail-profile"}`}
          aria-label="Workspace menu"
          title="Workspace menu"
        >
          <span className="profile-avatar" aria-hidden="true">
            A
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="dropdown-menu workspace-menu"
          side={mobile ? "bottom" : "right"}
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Workspace"
        >
          <DropdownMenu.Label className="workspace-menu-identity">
            <span className="profile-avatar" aria-hidden="true">
              A
            </span>
            <span>Personal workspace</span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="workspace-menu-separator" />
          <DropdownMenu.Item
            className="dropdown-item"
            onSelect={() => navigate("settings")}
          >
            <Settings size={18} strokeWidth={1.7} />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="dropdown-item"
            onSelect={() =>
              update((w) => ({ ...w, theme: dark ? "light" : "dark" }))
            }
          >
            {dark ? (
              <Sun size={18} strokeWidth={1.7} />
            ) : (
              <Moon size={18} strokeWidth={1.7} />
            )}
            {dark ? "Light theme" : "Dark theme"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
