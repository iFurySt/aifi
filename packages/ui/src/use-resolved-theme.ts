import { useSyncExternalStore } from "react";
import type { Theme } from "@aifi/core";

const query = "(prefers-color-scheme: dark)";
function subscribe(change: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}
const systemDark = () => window.matchMedia(query).matches;

/** Persist the preference; resolve the actual palette separately. */
export function useResolvedTheme(mode: Theme): "light" | "dark" {
  const dark = useSyncExternalStore(subscribe, systemDark, () => false);
  return mode === "system" ? (dark ? "dark" : "light") : mode;
}
