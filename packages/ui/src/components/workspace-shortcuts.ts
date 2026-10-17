/** Shared bindings for the shell, account menu dismissal and shortcut help. */
export const workspaceShortcuts = [
  { action: "search", label: "Search workspace", key: "k", display: "K" },
  { action: "back", label: "Go back", key: "[", display: "[" },
  { action: "forward", label: "Go forward", key: "]", display: "]" },
  { action: "sidebar", label: "Toggle sidebar", key: "b", display: "B" },
  { action: "settings", label: "Settings", key: ",", display: "," },
  {
    action: "newChat",
    label: "New chat",
    key: "n",
    display: "N",
    desktopOnly: true,
  },
  { action: "help", label: "Keyboard shortcuts", key: "/", display: "/" },
] as const;

type ShortcutKey = Pick<
  KeyboardEvent,
  "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
> &
  Partial<Pick<KeyboardEvent, "isComposing">>;

export function workspaceShortcut(event: ShortcutKey, desktop: boolean) {
  if (
    event.metaKey === event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    event.isComposing
  )
    return;
  return workspaceShortcuts.find(
    (shortcut) =>
      shortcut.key === event.key.toLowerCase() &&
      (!("desktopOnly" in shortcut) || desktop),
  )?.action;
}

export const shortcutModifier = () =>
  /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
