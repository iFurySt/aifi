import { isResearchSourceURL } from "./stock-research";

export const AIFI_REPOSITORY_URL = "https://github.com/iFurySt/aifi";

/** App links are exact destinations, independent of research-provider hosts. */
export function isAppExternalURL(value: string): boolean {
  return value === AIFI_REPOSITORY_URL || isResearchSourceURL(value);
}
